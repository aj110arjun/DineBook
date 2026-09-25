import { ArrowRight } from 'lucide-react';
import SectionHeading from './SectionHeading.jsx';
import RestaurantCard from './RestaurantCard.jsx';

export default function RestaurantSection({ id, eyebrow, title, restaurants, onReserve, actionLabel = 'View All Featured', actionHref = '#featured' }) {
  return (
    <section className="content-section restaurant-section" id={id}>
      <SectionHeading eyebrow={eyebrow} title={title} action={<a className="section-action" href={actionHref}>{actionLabel}<ArrowRight size={14} /></a>} />
      {restaurants.length ? <div className="restaurant-grid">{restaurants.map(restaurant => <RestaurantCard key={restaurant.name} restaurant={restaurant} onReserve={onReserve} />)}</div> : <p className="empty-state">No restaurants match that cuisine just yet. Choose another flavor to explore.</p>}
    </section>
  );
}
