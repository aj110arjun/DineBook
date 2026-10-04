import { ArrowRight } from 'lucide-react';
import SectionHeading from './SectionHeading.jsx';
import RestaurantCard from './RestaurantCard.jsx';

export default function RestaurantSection({ id, eyebrow, title, restaurants, onReserve, loading = false, error = '', onRetry, emptyMessage = 'No restaurants are available yet.', actionLabel = 'View All Featured', actionHref = '#featured' }) {
  return (
    <section className="content-section restaurant-section" id={id}>
      <SectionHeading eyebrow={eyebrow} title={title} action={<a className="section-action" href={actionHref}>{actionLabel}<ArrowRight size={14} /></a>} />
      {loading ? <p className="empty-state" role="status">Loading restaurants…</p> : error ? <div className="empty-state" role="alert"><p>{error}</p><button className="section-action" style={{ border: 0, background: 'transparent', cursor: 'pointer' }} type="button" onClick={onRetry}>Try again</button></div> : restaurants.length ? <div className="restaurant-grid">{restaurants.map(restaurant => <RestaurantCard key={restaurant.id || restaurant.name} restaurant={restaurant} onReserve={onReserve} />)}</div> : <p className="empty-state">{emptyMessage}</p>}
    </section>
  );
}
