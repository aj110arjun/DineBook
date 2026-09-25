import { ArrowRight, Search } from 'lucide-react';

export default function HeroBanner() {
  return (
    <section className="hero-banner" id="discover">
      <div className="hero-content">
        <span className="hero-kicker"><i /> PREMIUM TABLE RESERVATIONS</span>
        <h1>Discover. Dine. Reserve.</h1>
        <p>Access handpicked gastronomic destinations. Bypass waitlists, secure guaranteed spots, and orchestrate unforgettable evenings effortlessly.</p>
        <div className="hero-actions"><a className="gold-button" href="#featured">Find a Restaurant <Search size={15} /></a><a className="outline-button" href="#cuisines">Explore Restaurants <ArrowRight size={15} /></a></div>
      </div>
    </section>
  );
}
