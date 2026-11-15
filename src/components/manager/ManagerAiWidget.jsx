import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChartNoAxesCombined, ClipboardList, CreditCard, Headphones, CircleHelp, Sparkles, Table2, Wallet, X } from "lucide-react";
import { CustomerAiPanel } from "../customer/CustomerAiWidget.jsx";
import useManagerAi from "../../hooks/useManagerAi.js";
import { managerAiSummary, safeManagerHref } from "../../lib/managerAi.js";

const PRESENTATION = {
  language: "en", hideLanguage: true, loginPath: "/manager/login",
  labels: {
    title: "Manager Assistant", intro: "Your restaurant, at a glance",
    welcome: "How’s service looking?", help: "Check your restaurant’s activity or ask for help with the manager portal.",
    actions: ["Today’s summary", "Upcoming reservations", "Active orders", "Pending payments", "Revenue this month", "Wallet balance", "Live table status", "Manager portal help", "Contact support"],
    placeholder: "Ask about your restaurant…", note: "Read-only assistance · Figures reflect recorded activity",
    history: "Chats in this session",
  },
  actions: [["overview", ClipboardList], ["reservations", CalendarDays], ["orders", ClipboardList], ["payments", CreditCard], ["revenue", ChartNoAxesCombined], ["wallet", Wallet], ["tables", Table2], ["help", CircleHelp], ["support", Headphones]],
  sessionNote: "Chats stay in this session and clear when you leave or reload the portal.",
  loadingMessage: "Checking the assistant…",
  limitedMessage: "AI is temporarily unavailable. Quick actions and portal help still work.",
  safeHref: safeManagerHref, summarize: managerAiSummary,
};

export function ManagerAiPanel(props) {
  return <CustomerAiPanel {...props} presentation={PRESENTATION} />;
}

export default function ManagerAiWidget({ userId }) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const launcher = useRef(null), closeButton = useRef(null), widget = useRef(null);
  const id = useId();
  const chat = useManagerAi(userId, open);
  function close() { setOpen(false); }

  useEffect(() => {
    if (!open) { if (opened) launcher.current?.focus({ preventScroll: true }); return; }
    const frame = window.requestAnimationFrame(() => closeButton.current?.focus({ preventScroll: true }));
    const key = (event) => {
      if (event.key === "Escape" && !document.querySelector('[role="alertdialog"]')) { event.preventDefault(); close(); }
    };
    document.addEventListener("keydown", key);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("keydown", key); };
  }, [open, opened]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || !viewport) return;
    const resize = () => {
      widget.current?.style.setProperty("--customer-ai-viewport-height", `${viewport.height}px`);
      widget.current?.style.setProperty("--customer-ai-viewport-top", `${viewport.offsetTop}px`);
    };
    resize(); viewport.addEventListener("resize", resize); viewport.addEventListener("scroll", resize);
    return () => { viewport.removeEventListener("resize", resize); viewport.removeEventListener("scroll", resize); };
  }, [open]);

  return <div ref={widget} className="customer-ai-widget manager-ai-widget" data-open={open}>
    {opened && <div className="customer-ai-panel-slot" inert={open ? undefined : ""} aria-hidden={!open}>
      <ManagerAiPanel chat={chat} close={close} closeRef={closeButton} id={id} open={open} />
    </div>}
    <button ref={launcher} className="customer-ai-launcher" type="button" aria-label={open ? "Close manager support" : "Open manager support"}
      title="Ask DineBook AI" aria-haspopup="dialog" aria-expanded={open} aria-controls={opened ? id : undefined}
      onClick={() => { if (open) close(); else { setOpened(true); setOpen(true); } }}>
      {open ? <X size={21} aria-hidden="true" /> : <Sparkles size={21} aria-hidden="true" />}<span>{open ? "Close" : "Ask DineBook AI"}</span>
    </button>
  </div>;
}
