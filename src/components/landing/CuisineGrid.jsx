import { photo } from "../../data/landingData.js";
import { customerLandingConfig } from "../../data/customerLandingConfig.js";
import RevealOnScroll from "./RevealOnScroll.jsx";
import SectionHeading from "./SectionHeading.jsx";

export default function CuisineGrid({
  selected,
  onSelect,
  config = customerLandingConfig.cuisines,
}) {
  return (
    <section className="content-section cuisine-section" id="cuisines">
      <SectionHeading eyebrow={config.eyebrow} title={config.title} />
      <div className="cuisine-grid">
        {config.items.map((cuisine, index) => (
          <RevealOnScroll
            key={cuisine.name}
            className="landing-cuisine-reveal"
            delay={index * 45}
          >
            <button
              type="button"
              aria-pressed={selected === cuisine.name}
              className={`cuisine-card${selected === cuisine.name ? " selected" : ""}`}
              onClick={() =>
                onSelect(selected === cuisine.name ? "" : cuisine.name)
              }
              style={{
                backgroundImage: `linear-gradient(90deg,rgba(37,19,18,.68),rgba(37,19,18,.08)),url(${photo(cuisine.image, 360)})`,
              }}
            >
              <span>{cuisine.name}</span>
            </button>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
