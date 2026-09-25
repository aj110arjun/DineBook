import { ArrowRight, Sparkles } from 'lucide-react';

export default function PromoBanner() {
  return (
    <section className="promo-banner" id="offers">
      <div className="promo-copy"><span className="eyebrow">TABLESPOT ELITE PERKS</span><h2>Unlock Up to 25% Off at Premium Venues</h2><p>Book through TableSpot Premium to enjoy exclusive dining perks, priority seating, and waived booking fees today.</p></div>
      <div className="promo-action"><a className="gold-button" href="#how-it-works">Explore Member Perks <ArrowRight size={15} /></a><small><Sparkles size={11} /> Terms apply. Valid on select premium tables.</small></div>
    </section>
  );
}
