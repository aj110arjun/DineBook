import { Bell, CalendarDays, Search } from 'lucide-react';
import SectionHeading from './SectionHeading.jsx';

const steps = [
  { icon: Search, number: '01', title: 'Search & Discover', body: 'Browse critically reviewed Michelin guides, chic casual bistros, and trendy bites tailored to your palate.' },
  { icon: CalendarDays, number: '02', title: 'Pick Date & Table', body: 'Select date, party size, and customize seating preferences. Reserve sunset views, private booths, or counters.' },
  { icon: Bell, number: '03', title: 'Confirm & Dine', body: 'Instantly secure the reservation with a custom guest pass. Arrive like a VIP and relish your gourmet experience.' },
];

export default function HowItWorks() {
  return <section className="content-section how-section" id="how-it-works"><SectionHeading eyebrow="SEAMLESS EXPERIENCES" title="How It Works" centered /><div className="steps-grid">{steps.map(({ icon: Icon, number, title, body }) => <article className="step-card" key={number}><div className="step-top"><span className="step-icon"><Icon size={17} /></span><span className="step-number">{number}</span></div><h3>{title}</h3><p>{body}</p></article>)}</div></section>;
}
