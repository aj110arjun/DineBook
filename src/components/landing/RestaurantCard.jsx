import { useState } from 'react';
import { Heart, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { photo } from '../../data/landingData.js';

export default function RestaurantCard({ restaurant, onReserve }) {
  const [saved, setSaved] = useState(false);
  const imageUrl = restaurant.image?.startsWith('http')
    ? restaurant.image
    : photo(restaurant.image || 'photo-1517248135467-4c7edcad34c4', 720);
  return (
    <article className="restaurant-card">
      <div className="restaurant-photo-wrap">
        <Link to={`/customer/restaurants/${restaurant.id}`} className="restaurant-photo-link" aria-label={`View ${restaurant.name} details`}>
          <div className="restaurant-photo" style={{ backgroundImage: `url(${imageUrl})` }}>
            {restaurant.badge && <span className="restaurant-badge">{restaurant.badge}</span>}
          </div>
        </Link>
        <button className={`save-button${saved ? ' saved' : ''}`} aria-label={saved ? `Remove ${restaurant.name} from saved` : `Save ${restaurant.name}`} onClick={() => setSaved(value => !value)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="restaurant-info">
        <div className="restaurant-title"><div><h3><Link className="restaurant-name-link" to={`/customer/restaurants/${restaurant.id}`}>{restaurant.name}</Link></h3><p>{restaurant.cuisine} <span>·</span> ₹₹₹</p></div>{restaurant.rating && <span className="rating"><Star size={13} fill="currentColor" />{restaurant.rating}</span>}</div>
        <p className="restaurant-location"><MapPin size={12} />{restaurant.location}</p>
        <div className="restaurant-card-actions">
          <Link className="restaurant-menu-link" to={`/customer/restaurants/${restaurant.id}/menu-preview`}>View Menu</Link>
          <button className="reserve-button" onClick={() => onReserve(restaurant)}>Reserve Table</button>
        </div>
      </div>
    </article>
  );
}
