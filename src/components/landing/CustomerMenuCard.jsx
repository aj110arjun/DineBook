import { useId, useState } from "react";
import { Tag, Utensils } from "lucide-react";
import { isCoupon, displayOffersForFood, offerSavingLabel } from "../../lib/foodOffers.js";
import "../../assets/css/CustomerMenuCard.css";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 2,
}).format(Number(value));

export default function CustomerMenuCard({ food, offers = [], categoryId }) {
  const id = useId();
  const [failedImage, setFailedImage] = useState("");
  const variants = food.variants || [];
  const available = food.is_available !== false && variants.some((variant) => variant.is_available !== false);
  const matchingOffers = available ? displayOffersForFood(offers, food, categoryId) : [];

  return (
    <article className={`customer-menu-dish-card${available ? "" : " is-unavailable"}`} tabIndex={0} aria-labelledby={`${id}-title`}>
      <div className="customer-menu-dish-media">
        {food.image_url && failedImage !== food.image_url ? (
          <img src={food.image_url} alt="" loading="lazy" onError={() => setFailedImage(food.image_url)} />
        ) : (
          <div className="customer-menu-dish-placeholder" aria-hidden="true"><Utensils size={32} /></div>
        )}
        {!available && <span className="customer-menu-dish-availability">Currently unavailable</span>}
        {matchingOffers.length > 0 && <div className="customer-menu-dish-offer-badges" aria-label={`Offers for ${food.name}`}>
          {matchingOffers.map((offer) => <span className="customer-menu-dish-offer-badge" key={offer.id}>
            <Tag size={13} aria-hidden="true" /><strong>{offerSavingLabel(offer)}</strong>
            {isCoupon(offer) && <span>· Coupon</span>}
          </span>)}
        </div>}
        <div className="customer-menu-dish-hover-details">
          <div className="customer-menu-dish-hover-content">
            <h4 id={`${id}-title`}>{food.name}</h4>
            <p>{food.description?.trim() || "Ask the restaurant about this dish and its ingredients."}</p>
            {variants.length > 0 ? (
              <ul aria-label={`Options and prices for ${food.name}`}>
                {variants.map((variant) => <li key={variant.id}>
                  <span>{variant.name}{(food.is_available === false || variant.is_available === false) && <small>Currently unavailable</small>}</span>
                  <strong>{money(variant.price)}</strong>
                </li>)}
              </ul>
            ) : <p className="customer-menu-dish-options-empty">Options aren’t available for this dish yet.</p>}
          </div>
        </div>
      </div>
    </article>
  );
}
