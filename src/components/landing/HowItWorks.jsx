import { Bell, CalendarDays, Search } from "lucide-react";
import SectionHeading from "./SectionHeading.jsx";

const steps = [
  {
    icon: Search,
    number: "01",
    title: "Search & Discover",
    body: "Search by restaurant, cuisine or location. Compare menus and guest reviews before choosing.",
  },
  {
    icon: CalendarDays,
    number: "02",
    title: "Pick Date & Table",
    body: "Choose a date, start and end time, and enough table seats for everyone in your party.",
  },
  {
    icon: Bell,
    number: "03",
    title: "Confirm & Dine",
    body: "Review your total, complete payment, and find your booking details and guest pass in My reservations.",
  },
];

export default function HowItWorks() {
  return (
    <section className="content-section how-section" id="how-it-works">
      <SectionHeading
        eyebrow="SEAMLESS EXPERIENCES"
        title="How It Works"
        centered
      />
      <div className="steps-grid">
        {steps.map(({ icon: Icon, number, title, body }) => (
          <article className="step-card" key={number}>
            <div className="step-top">
              <span className="step-icon">
                <Icon size={17} />
              </span>
              <span className="step-number">{number}</span>
            </div>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
