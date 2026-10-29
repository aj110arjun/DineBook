import { useEffect, useState } from "react";
import { Heart, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { photo } from "../../data/landingData.js";
import {
  isRestaurantSaved,
  subscribeToSavedRestaurants,
  toggleSavedRestaurant,
} from "../../lib/savedRestaurants.js";

export default function RestaurantCard({ restaurant, guests = 2 }) {
  const [saved, setSaved] = useState(() => isRestaurantSaved(restaurant.id));
  useEffect(() => {
    const sync = () => setSaved(isRestaurantSaved(restaurant.id));
    return subscribeToSavedRestaurants(sync);
  }, [restaurant.id]);
  const imageUrl = restaurant.image?.startsWith("http")
    ? restaurant.image
    : photo(restaurant.image || "photo-1517248135467-4c7edcad34c4", 720);
  return (
    <article className="restaurant-card">
      <div className="restaurant-photo-wrap">
        <Link
          to={`/customer/restaurants/${restaurant.id}`}
          className="restaurant-photo-link"
          aria-label={`View ${restaurant.name} details`}
        >
          <div
            className="restaurant-photo"
            style={{ backgroundImage: `url(${imageUrl})` }}
          >
            {restaurant.badge && (
              <span className="restaurant-badge">{restaurant.badge}</span>
            )}
          </div>
        </Link>
        <button
          type="button"
          className={`save-button${saved ? " saved" : ""}`}
          aria-pressed={saved}
          aria-label={
            saved
              ? `Remove ${restaurant.name} from saved`
              : `Save ${restaurant.name}`
          }
          onClick={() => setSaved(toggleSavedRestaurant(restaurant.id))}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="restaurant-info">
        <div className="restaurant-title">
          <div>
            <h3>
              <Link
                className="restaurant-name-link"
                to={`/customer/restaurants/${restaurant.id}`}
              >
                {restaurant.name}
              </Link>
            </h3>
            <p>
              {restaurant.cuisine} <span>·</span> ₹₹₹
            </p>
          </div>
          {restaurant.review_count > 0 && restaurant.rating != null && (
            <span
              className="rating"
              aria-label={`${restaurant.rating} average from ${restaurant.review_count} reviews`}
            >
              <Star size={13} fill="currentColor" />
              {Number(restaurant.rating).toFixed(1)}{" "}
              <span>({restaurant.review_count})</span>
            </span>
          )}
        </div>
        <p className="restaurant-location">
          <MapPin size={12} />
          {restaurant.location}
          {Number.isFinite(Number(restaurant.distance_km)) && (
            <span> · {Number(restaurant.distance_km).toFixed(1)} km away</span>
          )}
        </p>
        <div className="restaurant-card-actions">
          <Link
            className="restaurant-menu-link"
            to={`/customer/restaurants/${restaurant.id}/menu-preview`}
          >
            View Menu
          </Link>
          <Link
            className="reserve-button"
            to={`/customer/restaurants/${restaurant.id}/booking`}
            state={{ guests: Number(guests) }}
          >
            Reserve a table
          </Link>
        </div>
      </div>
    </article>
  );
}
