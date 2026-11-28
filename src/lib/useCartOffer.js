import { useEffect, useState } from "react";
import { requestJson } from "./authApi.js";

export default function useCartOffer({ restaurantId, reservationId, items, enabled = true, refreshKey }) {
  const [coupon, setCoupon] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [quote, setQuote] = useState(null);
  const [failure, setFailure] = useState(null);
  useEffect(() => { setCoupon(""); }, [restaurantId, reservationId]);
  const key = JSON.stringify({ restaurantId, reservationId, items, coupon, enabled, refreshKey, attempt });
  const canQuote = enabled && items.length > 0 && Boolean(restaurantId || reservationId);
  useEffect(() => {
    if (!canQuote) return;
    const controller = new AbortController();
    const request = async (code) => requestJson(`/api/customer/orders/offers/${reservationId ? "validate" : "preview"}`, {
      method: "POST", signal: controller.signal,
      body: JSON.stringify({ ...(reservationId ? { reservation_id: reservationId } : { restaurant_id: restaurantId }), items, offer_code: code || null }),
    });
    (async () => {
      try {
        let result;
        let warning = "";
        try {
          result = await request(coupon);
          if (coupon && !result.valid) warning = result.reason || "This coupon cannot be applied.";
        } catch (error) {
          if (!coupon || controller.signal.aborted) throw error;
          warning = error.message;
        }
        if (warning) result = await request("");
        if (!controller.signal.aborted) {
          setQuote({ key, result });
          setFailure(warning ? { key, message: warning } : null);
        }
      } catch (error) {
        if (!controller.signal.aborted) setFailure({ key, message: error.message });
      }
    })();
    return () => controller.abort();
  }, [key, canQuote]);
  return {
    result: canQuote && quote?.key === key ? quote.result : null,
    busy: canQuote && quote?.key !== key && failure?.key !== key,
    error: canQuote && failure?.key === key ? failure.message : "",
    ready: canQuote && quote?.key === key,
    applyCoupon(code) { setCoupon(code.trim().toUpperCase()); setAttempt((current) => current + 1); },
    clearCoupon() { setCoupon(""); setAttempt((current) => current + 1); },
    refresh() { setAttempt((current) => current + 1); },
  };
}
