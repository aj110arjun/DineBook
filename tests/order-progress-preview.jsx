// Development-only visual fixture. No account or API requests are used.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CustomerOrderProgressCard } from "../src/components/landing/CustomerOrderTracker.jsx";
import "../src/assets/css/index.css";
import "../src/assets/css/styles.css";
import "../src/assets/css/design-system.css";
import "../src/assets/css/layout-refresh.css";
import "../src/assets/css/ux-improvements.css";
import "../src/assets/css/ui-experience.css";

const statuses = ["PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED", "REJECTED", "REFUNDED"];
const order = { id: "preview-order", restaurant_name: "Spice Garden", items: [{ quantity: 2, food_name: "Paneer tikka" }, { quantity: 1, food_name: "Garlic naan" }] };

function Preview() {
  const [status, setStatus] = useState("PREPARING");
  const [theme, setTheme] = useState("dark");
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return <main style={{ minHeight: "100vh", background: "var(--color-background)", padding: "36px 0", color: "var(--color-text-primary)" }}>
    <section className="customer-order-tracker">
      <div className="customer-order-tracker-heading"><div><span>YOUR FOOD ORDERS</span><h2>Order progress</h2></div></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <label>Preview status <select aria-label="Preview status" value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Preview theme <select aria-label="Preview theme" value={theme} onChange={(event) => setTheme(event.target.value)}><option>dark</option><option>light</option></select></label>
        <button type="button" disabled={statuses.indexOf(status) >= 4} onClick={() => setStatus(statuses[statuses.indexOf(status) + 1])}>Advance order</button>
      </div>
      <CustomerOrderProgressCard order={{ ...order, status }} />
      <CustomerOrderProgressCard order={{ ...order, id: "second-order", status: "PLACED" }} />
    </section>
  </main>;
}
createRoot(document.getElementById("root")).render(<Preview />);
