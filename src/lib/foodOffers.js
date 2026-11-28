import { parseTimestamp } from "./localDate.js";

export const isCoupon = (offer) => offer?.application_mode === "COUPON";
export function isCurrentOffer(offer, now = Date.now()) {
  return offer.status === "ACTIVE" && offer.is_active !== false
    && (!offer.starts_at || parseTimestamp(offer.starts_at).getTime() <= now)
    && (!offer.ends_at || parseTimestamp(offer.ends_at).getTime() >= now)
    && (offer.remaining_uses == null || offer.remaining_uses > 0)
    && (offer.customer_remaining_uses == null || offer.customer_remaining_uses > 0);
}
export function offersForFood(offers, food, categoryId = food.category_id) {
  return offers.filter((offer) => isCurrentOffer(offer) && (
    offer.applicability === "RESTAURANT"
    || (offer.applicability === "ITEMS" && (offer.eligible_food_ids || []).includes(food.id))
    || (offer.applicability === "CATEGORIES" && (offer.eligible_category_ids || []).includes(categoryId))
  ));
}
export const offerSavingLabel = (offer) => offer.discount_type === "PERCENTAGE"
  ? `${Number(offer.discount_percent)}% off`
  : `₹${Number(offer.discount_percent).toFixed(2)} off`;

export function displayOffersForFood(offers, food, categoryId = food.category_id) {
  const matching = offersForFood(offers, food, categoryId);
  const variants = (food.variants || []).filter((variant) => variant.is_available !== false);
  const price = variants.length ? Math.min(...variants.map((variant) => Number(variant.price))) : 1;
  const saving = (offer) => Math.min(price,
    offer.max_discount == null ? Infinity : Number(offer.max_discount),
    offer.discount_type === "PERCENTAGE" ? price * Number(offer.discount_percent) / 100 : Number(offer.discount_percent));
  const automatic = matching.filter((offer) => !isCoupon(offer))
    .sort((a, b) => saving(b) - saving(a) || String(a.id).localeCompare(String(b.id)))[0];
  return [...(automatic ? [automatic] : []), ...matching.filter(isCoupon)];
}

export function appliedOfferIds(result) {
  if (!result?.valid) return [];
  return result.applied_offers?.length ? result.applied_offers.map((offer) => offer.id) : [result.offer?.id].filter(Boolean);
}

export function appliedOfferLabel(result) {
  if (result?.applied_offers?.length > 1) return "Automatic offers";
  return result?.applied_offers?.[0]?.title || result?.offer?.title || "Offer";
}
