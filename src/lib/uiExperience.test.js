import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { build } from "vite";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import { breadcrumbsFor, routeMetadata } from "./routeMetadata.js";
import { createDashboardLoader } from "./managerDashboard.js";

let temporary, LoadingState, ErrorState, EmptyState, Breadcrumb;
before(async () => {
  const result = await build({ logLevel: "silent", build: { ssr: true, write: false,
    rollupOptions: { input: ["src/components/ui/LoadingState.jsx", "src/components/PortalBreadcrumb.jsx"] },
  } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.ui-experience-"));
  for (const chunk of result.output) if (chunk.type === "chunk") {
    const file = join(temporary, chunk.fileName); await mkdir(dirname(file), { recursive: true }); await writeFile(file, chunk.code);
  }
  ({ default: LoadingState, ErrorState, EmptyState } = await import(pathToFileURL(join(temporary, "LoadingState.js"))));
  ({ default: Breadcrumb } = await import(pathToFileURL(join(temporary, "PortalBreadcrumb.js"))));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

test("breadcrumbs cover real routes in all four portals without exposing IDs", async () => {
  const app = await readFile(new URL("../App.jsx", import.meta.url), "utf8");
  for (const [path] of routeMetadata) assert.ok(app.includes(`path="${path}"`), path);
  for (const [path, expected] of [
    ["/customer/profile/reservations/secret-id", ["Home", "My reservations", "Reservation details"]],
    ["/manager/orders/secret-id", ["Dashboard", "Reservations & orders", "Order details"]],
    ["/chef/menu/secret-id", ["Dashboard", "Menu", "Dish details"]],
    ["/admin/transactions/secret-restaurant/secret-id", ["Dashboard", "Transactions", "Transaction details"]],
  ]) {
    const crumbs = breadcrumbsFor(path);
    assert.deepEqual(crumbs.map((row) => row.label), expected);
    assert.equal(crumbs.at(-1).to, undefined);
    const portal = path.split("/")[1];
    assert.ok(crumbs.every((row) => !row.to || row.to.startsWith(`/${portal}`)));
  }
  for (const portal of ["customer", "manager", "chef", "admin"]) assert.deepEqual(breadcrumbsFor(`/${portal}/login`), []);
});

test("dynamic entity labels use existing data and retain valid parent links", () => {
  const crumbs = breadcrumbsFor("/customer/restaurants/restaurant-ref/booking", "Book at Spice Garden");
  assert.equal(crumbs[2].to, "/customer/restaurants/restaurant-ref");
  assert.equal(crumbs.at(-1).label, "Book at Spice Garden");
  const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/admin/restaurants/reference" }, createElement(Breadcrumb, { entityLabel: "Spice <Garden>" })));
  assert.match(html, /aria-label="Breadcrumb"/); assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /Spice &lt;Garden&gt;/); assert.doesNotMatch(html, />reference</);
  assert.equal(renderToStaticMarkup(createElement(StaticRouter, { location: "/manager/dashboard" }, createElement(Breadcrumb))), "");
});

test("legacy breadcrumb props cannot create links to another portal", () => {
  const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/manager/profile" }, createElement(Breadcrumb, {
    home: { label: "Home", to: "/customer" }, items: [{ label: "Profile" }],
  })));
  assert.doesNotMatch(html, /href="\/customer/); assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
});

test("loading compositions announce one status and expose no fake interactive data", () => {
  for (const variant of ["dashboard", "cards", "table", "form", "detail", "list", "menu", "calendar", "wallet", "chat"]) {
    const html = renderToStaticMarkup(createElement(LoadingState, { variant, label: "Loading records…" }));
    assert.match(html, /aria-busy="true"/); assert.match(html, /aria-label="Loading records…"/);
    assert.match(html, /aria-hidden="true"/); assert.doesNotMatch(html, /<button|<input|<a /);
  }
  const error = renderToStaticMarkup(createElement(LoadingState, { error: "Could not load", onRetry() {} }));
  assert.match(error, /role="alert"/); assert.match(error, /Try again/); assert.doesNotMatch(error, /db-skeleton/);
  const empty = renderToStaticMarkup(createElement(EmptyState, { title: "No reservations", actionLabel: "Find a restaurant", onAction() {} }));
  assert.match(empty, /Find a restaurant/); assert.doesNotMatch(empty, /aria-busy="true"/);
  assert.match(renderToStaticMarkup(createElement(ErrorState, { message: "Connection lost" })), /Connection lost/);
});

test("dashboard refresh retains prior data, including on failure, and clears it for a changed period", async () => {
  const states = []; let reject = false;
  const loader = createDashboardLoader(async () => { if (reject) throw new Error("Offline"); return { orders: 12 }; }, (state) => states.push(state));
  await loader.load({ period: "today" });
  reject = true; const refresh = loader.load({ period: "today" });
  assert.deepEqual(states.at(-1), { data: { orders: 12 }, loading: true, error: "" });
  await refresh; assert.equal(states.at(-1).data.orders, 12); assert.equal(states.at(-1).error, "Offline");
  const changed = loader.load({ period: "yesterday" }); assert.equal(states.at(-1).data, null); await changed;
});

function hooks(source, name, globals = {}) {
  const slots = [], effects = []; let cursor = 0, queued = [];
  const hook = runInNewContext(`${source.replace(/^import .*;\n/gm, "").replace("export default function", "function")}\n${name}`, {
    ...globals,
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial === null && globals.elementRef ? globals.elementRef : initial }; },
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (value) => { slots[index] = value; }]; },
    useEffect(callback, deps) { const index = cursor++; if (!effects[index] || deps.some((value, n) => !Object.is(value, effects[index].deps[n]))) queued.push(() => { effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: callback() }; }); },
  });
  return { render(...args) { cursor = 0; const result = hook(...args); const pending = queued; queued = []; pending.forEach((callback) => callback()); return result; }, unmount() { effects.forEach((effect) => effect?.cleanup?.()); } };
}

test("empty results remain settled during refresh and failed initial loads can retry", async () => {
  const harness = hooks(await readFile(new URL("../hooks/useLoadingPhase.js", import.meta.url), "utf8"), "useLoadingPhase");
  assert.equal(harness.render(true, false, "").initialLoading, true);
  assert.equal(harness.render(false, false, "").initialLoading, false);
  assert.equal(harness.render(true, false, "").refreshing, true);
  harness.render(false, false, "Offline");
  assert.equal(harness.render(true, false, "").initialLoading, true);
  assert.equal(harness.render(true, true, "").refreshing, true);
});

test("dismissal honors reduced motion and cancels pending animation work on unmount", async () => {
  const source = await readFile(new URL("../hooks/useAnimatedDismiss.js", import.meta.url), "utf8");
  let reduced = false, dismissed = 0, next = 0; const timers = new Map();
  const harness = hooks(source, "useAnimatedDismiss", { window: {
    matchMedia: () => ({ matches: reduced }), setTimeout: (fn) => { timers.set(++next, fn); return next; }, clearTimeout: (id) => timers.delete(id),
  } });
  harness.render(() => dismissed++).dismiss(); assert.equal(dismissed, 0); assert.equal(timers.size, 1);
  assert.equal(harness.render(() => dismissed++).closing, true); harness.unmount(); assert.equal(timers.size, 0);
  reduced = true;
  const second = hooks(source, "useAnimatedDismiss", { window: { matchMedia: () => ({ matches: true }), clearTimeout() {} } });
  second.render(() => dismissed++).dismiss(); assert.equal(dismissed, 1); second.unmount();
});

test("navigation restores back/forward scroll and keeps focus during query changes", async () => {
  const source = await readFile(new URL("../components/AppExperience.jsx", import.meta.url), "utf8");
  const body = source.split("export default function AppExperience() {")[1].split("  function skip(")[0];
  let location = { pathname: "/manager/dashboard", hash: "", key: "dashboard" }, navigation = "POP", focused = 0, frame = 0;
  const listeners = new Map(), frames = new Map(), scrolls = [];
  const browser = { scrollY: 0, scrollX: 0,
    addEventListener: (event, callback) => listeners.set(event, callback), removeEventListener: (event) => listeners.delete(event),
    requestAnimationFrame: (callback) => { frames.set(++frame, callback); return frame; }, cancelAnimationFrame: (id) => frames.delete(id),
    scrollTo: (value) => { scrolls.push(value); browser.scrollY = value.top; },
  };
  const harness = hooks(`export default function AppExperience() {${body}\nreturn null;}`, "AppExperience", {
    useLocation: () => location, useNavigationType: () => navigation, navigator: { onLine: true }, window: browser,
    document: { querySelector: () => ({ setAttribute() {}, focus() { focused++; } }) },
  });
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback()); };
  harness.render(); flush(); assert.equal(scrolls.at(-1).top, 0);
  browser.scrollY = 420; listeners.get("scroll")();
  // Removing a tall outgoing page can clamp the document before effect cleanup.
  browser.scrollY = 0;
  location = { pathname: "/manager/menu", hash: "", key: "menu" }; navigation = "PUSH";
  harness.render(); flush(); assert.equal(scrolls.at(-1).top, 0);
  location = { pathname: "/manager/dashboard", hash: "", key: "dashboard" }; navigation = "POP";
  harness.render(); flush(); assert.equal(scrolls.at(-1).top, 420);
  const count = focused;
  location = { ...location, key: "query-change" }; navigation = "REPLACE";
  harness.render(); flush(); assert.equal(focused, count); harness.unmount();
});

test("page entrances skip reduced motion and do not restart while editing the same page", async () => {
  const source = await readFile(new URL("../components/ui/PageTransition.jsx", import.meta.url), "utf8");
  const prefix = source.slice(0, source.indexOf("  return <Element"));
  let pathname = "/manager/menu", reduced = false, cancelled = 0; const animations = [];
  const harness = hooks(`${prefix}\nreturn null;}`, "PageTransition", {
    useLocation: () => ({ pathname }), window: { matchMedia: () => ({ matches: reduced }) },
    elementRef: { animate(frames, options) { animations.push({ frames, options }); return { cancel() { cancelled++; } }; } },
  });
  harness.render({}); assert.equal(animations.length, 1);
  assert.ok(animations[0].options.duration >= 180 && animations[0].options.duration <= 280);
  harness.render({ children: "Edited form input" }); assert.equal(animations.length, 1);
  pathname = "/manager/staff"; harness.render({}); assert.equal(animations.length, 2); assert.equal(cancelled, 1);
  reduced = true; pathname = "/manager/settings"; harness.render({}); assert.equal(animations.length, 2); assert.equal(cancelled, 2);
  harness.unmount();
  const css = await readFile(new URL("../assets/css/ui-experience.css", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion: reduce/); assert.match(css, /animation: none !important/);
});
