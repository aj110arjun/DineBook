// Development-only preview with synthetic dishes and offers.
import React from "react";
import { createRoot } from "react-dom/client";
import CustomerMenuCard from "../src/components/landing/CustomerMenuCard.jsx";
import "../src/assets/css/index.css";
import "../src/assets/css/styles.css";
import "../src/assets/css/design-system.css";
import "../src/assets/css/layout-refresh.css";
import "../src/assets/css/ui-experience.css";

const offers = [
  { id: "automatic", title: "A little extra for your table", status: "ACTIVE", application_mode: "AUTOMATIC", applicability: "RESTAURANT", discount_type: "PERCENTAGE", discount_percent: 20, minimum_subtotal: 500, max_discount: 150 },
  { id: "coupon", title: "Welcome to the garden", description: "A saving on your first meal with us.", status: "ACTIVE", application_mode: "COUPON", applicability: "ITEMS", eligible_food_ids: ["paneer"], code: "GARDEN10", discount_type: "PERCENTAGE", discount_percent: 10, minimum_subtotal: 300, max_discount: 100, per_customer_limit: 1 },
];
const foods = [
  { id: "paneer", name: "Garden paneer tikka", description: "Soft paneer marinated in yogurt, ginger, and warming spices, then grilled with bell peppers and red onions.\n\nServed with mint chutney and a fresh cucumber salad. Our kitchen prepares this dish to order; please tell the restaurant about any allergies before ordering.", image_url: "/favicon.svg", is_available: true, variants: [{ id: "regular", name: "Regular · 6 pieces", price: 280, is_available: true }, { id: "large", name: "Sharing platter · 12 pieces", price: 490, is_available: true }] },
  { id: "chicken", name: "Black pepper chicken", description: "Tender chicken with freshly cracked black pepper, curry leaves, and caramelised onions. Choose your portion below.", is_available: true, variants: [{ id: "chicken-regular", name: "Regular", price: 340, is_available: true }, { id: "chicken-large", name: "Family portion", price: 620, is_available: false }] },
  { id: "special", name: "Chef’s seasonal special", description: "A seasonal dish from our kitchen. Ask the restaurant about the next available serving.", is_available: true, variants: [] },
];
document.documentElement.dataset.theme = new URLSearchParams(location.search).get("theme") === "light" ? "light" : "dark";
createRoot(document.getElementById("root")).render(
  <main className="customer-live-menu" style={{ maxWidth: 1320, padding: "40px 24px", margin: "0 auto" }}>
    <div className="customer-menu-heading"><div><span className="customer-menu-eyebrow">FROM THE GARDEN KITCHEN</span><h2>Explore the menu</h2><p>Hover over a dish to see its description, options, and prices.</p></div></div>
    <div className="customer-menu-grid">{foods.map((food) => <CustomerMenuCard key={food.id} food={food} offers={offers} categoryId="mains" />)}</div>
  </main>,
);
