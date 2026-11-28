import { Bell, CalendarDays, Search } from "lucide-react";
import SectionHeading from "./SectionHeading.jsx";
import { customerLandingConfig } from "../../data/customerLandingConfig.js";
import RevealOnScroll from "./RevealOnScroll.jsx";

const stepIcons = [Search, CalendarDays, Bell];

export default function HowItWorks({
  config = customerLandingConfig.howItWorks,
}) {
  return (
    <RevealOnScroll
      as="section"
      className="content-section how-section"
      id="how-it-works"
    >
      <SectionHeading
        eyebrow={config.eyebrow}
        title={config.title}
        centered
      />
      <div className="steps-grid">
        {config.steps.map(({ title, body }, index) => {
          const Icon = stepIcons[index % stepIcons.length];
          return (
            <RevealOnScroll
              as="article"
              className="step-card landing-step-card"
              key={title}
              delay={index * 90}
            >
              <div className="step-top">
                <span className="step-icon">
                  <Icon size={17} />
                </span>
                <span className="step-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </RevealOnScroll>
          );
        })}
      </div>
    </RevealOnScroll>
  );
}
