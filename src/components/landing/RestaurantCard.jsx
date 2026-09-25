import { useState } from 'react';
import { Heart, MapPin, Star } from 'lucide-react';
import { photo } from '../../data/landingData.js';

export default function RestaurantCard({ restaurant, onReserve }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="restaurant-card">
      <div className="restaurant-photo" style={{ backgroundImage: `url(${photo(restaurant.image, 720)})` }}>
        {restaurant.badge && <span className="restaurant-badge">{restaurant.badge}</span>}
        <button className={`save-button${saved ? ' saved' : ''}`} aria-label={saved ? `Remove ${restaurant.name} from saved` : `Save ${restaurant.name}`} onClick={() => setSaved(value => !value)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="restaurant-info">
        <div className="restaurant-title"><div><h3>{restaurant.name}</h3><p>{restaurant.cuisine} <span>·</span> ₹₹₹</p></div><span className="rating"><Star size={13} fill="currentColor" />{restaurant.rating}</span></div>
        <p className="restaurant-location"><MapPin size={12} />{restaurant.location}</p>
        <button className="reserve-button" onClick={() => onReserve(restaurant)}>Reserve Table</button>
      </div>
    </article>
  );
}
