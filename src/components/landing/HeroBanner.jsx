import { ArrowDown, Search, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { photo } from "../../data/landingData.js";
import { customerLandingConfig } from "../../data/customerLandingConfig.js";

export default function HeroBanner({ config = customerLandingConfig.hero }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  return (
    <section
      className="hero-banner landing-hero"
      id="discover"
      style={{
        "--landing-hero-image": `url("${photo(config.backgroundImage, 2200)}")`,
      }}
    >
      <div className="hero-content landing-hero-content">
        <div className="landing-hero-copy">
          <span className="hero-kicker">
            <i /> {config.eyebrow}
          </span>
          <h1>{config.heading}</h1>
          <p>{config.description}</p>
          <form
            className="ux-hero-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(
                `/customer/restaurants${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ""}`,
              );
            }}
          >
            <label htmlFor="discover-search" className="ux-sr-only">
              {config.searchLabel}
            </label>
            <Search size={19} aria-hidden="true" />
            <input
              id="discover-search"
              type="search"
              value={query}
              placeholder={config.searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit">{config.searchAction}</button>
          </form>
          <div className="hero-actions landing-hero-actions">
            <Link className="landing-hero-primary" to="/customer/restaurants">
              {config.browseAction}
              <Search size={15} aria-hidden="true" />
            </Link>
            <a className="ux-hero-secondary" href="#how-it-works">
              {config.howItWorksAction}
              <ArrowDown size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="landing-hero-visual" aria-hidden="true">
          <img
            src={photo(config.featureImage, 900)}
            alt=""
            fetchpriority="high"
            decoding="async"
          />
          <span className="landing-hero-image-note">
            <Sparkles size={15} />
            Make room for a new favorite
          </span>
        </div>
      </div>
    </section>
  );
}
