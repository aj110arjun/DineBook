import { Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function HeroBanner() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  return (
    <section className="hero-banner" id="discover">
      <div className="hero-content">
        <span className="hero-kicker"><i /> YOUR NEXT TABLE</span>
        <h1>A good meal starts<br />with a table.</h1>
        <p>Find a restaurant, choose your dining time, and reserve the tables you need. Preorder food if you’d like.</p>
        <form className="ux-hero-search" role="search" onSubmit={(event) => {
          event.preventDefault();
          navigate(`/customer/restaurants${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ""}`);
        }}>
          <label htmlFor="discover-search" className="ux-sr-only">Restaurant, cuisine or location</label>
          <Search size={19} aria-hidden="true" />
          <input id="discover-search" type="search" value={query}
            placeholder="Restaurant, cuisine or location" onChange={(event) => setQuery(event.target.value)} />
          <button type="submit">Find a table</button>
        </form>
        <div className="hero-actions">
          <Link className="ux-hero-secondary" to="/customer/restaurants">Browse all restaurants</Link>
          <a className="ux-hero-secondary" href="#how-it-works">How booking works</a>
        </div>
      </div>
    </section>
  );
}
