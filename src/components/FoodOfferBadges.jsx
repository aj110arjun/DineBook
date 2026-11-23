import { Tag } from "lucide-react";
import { isCoupon, displayOffersForFood, offerSavingLabel } from "../lib/foodOffers.js";
import "../assets/css/FoodOfferBadges.css";

export function ItemOfferSaving({ discount }) {
  if (!discount?.applied_offer || !(Number(discount.discount_amount) > 0)) return null;
  return <small className="food-offer-line-saving">{offerSavingLabel(discount.applied_offer)} · Save ₹{Number(discount.discount_amount).toFixed(2)}</small>;
}

export default function FoodOfferBadges({ offers = [], food, categoryId }) {
  const matching = displayOffersForFood(offers, food, categoryId);
  if (!matching.length) return null;
  return <div className="food-offer-badges" aria-label={`Offers for ${food.name || food.food_name}`}>
    {matching.map((offer) => <div className="food-offer-badge" key={offer.id}>
      <Tag size={13} aria-hidden="true" />
      <span><strong>{offerSavingLabel(offer)}</strong> · {isCoupon(offer) ? `Coupon ${offer.code}` : "Automatic offer"}
        <small>{offer.title}{Number(offer.minimum_subtotal) > 0 ? ` · Eligible items from ₹${Number(offer.minimum_subtotal).toFixed(2)}` : ""}{offer.max_discount != null ? ` · Save up to ₹${Number(offer.max_discount).toFixed(2)}` : ""}{offer.per_customer_limit ? ` · ${offer.per_customer_limit} use(s) per customer` : ""}</small>
      </span>
    </div>)}
  </div>;
}
