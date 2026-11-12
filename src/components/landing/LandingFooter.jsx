import { Utensils } from "lucide-react";
import { Link } from "react-router-dom";

const columns = [
  { heading: "Explore", links: [
    ["Restaurants", "/customer/restaurants"],
    ["How booking works", "/customer#how-it-works"],
  ]},
  { heading: "Your visits", links: [
    ["My reservations", "/customer/profile/reservations"],
    ["Saved restaurants", "/customer/saved-restaurants"],
    ["Orders", "/customer/profile/orders"],
  ]},
  { heading: "Your account", links: [
    ["Profile", "/customer/profile"], ["Wallet", "/customer/profile/wallet"],
    ["Transactions", "/customer/profile/transactions"],
  ]},
  { heading: "For restaurants", links: [
    ["Register your restaurant", "/manager/register"],
    ["Manager sign in", "/manager/login"], ["Kitchen sign in", "/chef/login"],
  ]},
];

export default function LandingFooter() {
  return <footer className="site-footer" id="footer">
    <div className="footer-main">
      <div className="footer-brand">
        <Link to="/customer" className="site-brand"><span className="brand-mark"><Utensils size={15} aria-hidden="true" /></span>DineBook</Link>
        <p>Find your next restaurant. Choose your tables and dining time, then manage your visit in one place.</p>
      </div>
      {columns.map(({ heading, links }) => <nav className="footer-column" key={heading} aria-label={heading}>
        <h3>{heading}</h3>
        {links.map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}
      </nav>)}
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} DineBook. All rights reserved.</span><span>Plan your next meal with confidence.</span></div>
  </footer>;
}
