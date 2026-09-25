import { Star } from 'lucide-react';
import SectionHeading from './SectionHeading.jsx';

export default function Testimonials({ testimonials }) {
  return <section className="content-section testimonials-section" id="voices"><SectionHeading eyebrow="GUEST VOICES" title="Loved by Connoisseurs" /><div className="testimonial-grid">{testimonials.map(guest => <article className="testimonial-card" key={guest.name}><div className="guest-head"><span className="guest-avatar">{guest.initials}</span><span><strong>{guest.name}</strong><small>{guest.title}</small></span></div><p>“{guest.quote}”</p><span className="guest-rating"><Star size={12} fill="currentColor" /> {guest.rating}</span></article>)}</div></section>;
}
