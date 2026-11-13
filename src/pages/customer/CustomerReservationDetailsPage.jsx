import { usePageState } from "../../state/usePageState.js";
import { formatWallTime, formatLocalDate, formatLocalDateTime } from "../../lib/localDate.js";
import { confirmAction } from "../../lib/confirmDialog.js";
import CustomForm from "../../components/forms/CustomForm.jsx";
import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  CreditCard,
  MapPin,
  Utensils,
  Users,
  Plus,
  Minus,
  Tag,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import TransactionInvoiceButton from "../../components/TransactionInvoice.jsx";
import { reservationFeeLineItems } from "../../lib/reservationPricing.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import "../../assets/css/CustomerRestaurantReviews.css";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import { ProfileFrame } from "./CustomerReservationsPage.jsx";
import "../../assets/css/CustomerProfilePage.css";

const timeText = (value) => formatWallTime(value);
const title = (value) =>
  (value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const paymentMethodText = (method) =>
  method === "WALLET"
    ? "DineBook wallet"
    : method === "RAZORPAY"
      ? "Razorpay"
      : method === "PAY_AT_DESK"
        ? "Pay at restaurant"
        : "—";
const reservationPaymentText = (reservation) => {
  if (reservation.payment_status === "PAID")
    return `Paid via ${paymentMethodText(reservation.payment_method)}`;
  if (reservation.payment_status === "REFUNDED") return "Refunded to wallet";
  if (reservation.payment_status === "FAILED") return "Payment failed";
  return "Payment pending";
};
const preorderPaymentText = (reservation) => {
  if (reservation.fulfillment_type !== "PREORDER") return "Not applicable";
  if (reservation.preorder_payment_status === "PAID")
    return `Paid via ${paymentMethodText(reservation.preorder_payment_method)}`;
  if (reservation.preorder_payment_status === "REFUNDED")
    return "Refunded to wallet";
  if (reservation.preorder_payment_status === "CANCELLED")
    return "Payment cancelled";
  if (
    reservation.preorder_payment_method === "PAY_AT_DESK" &&
    reservation.preorder_payment_status === "PENDING"
  )
    return "Pay at restaurant";
  return reservation.preorder_payment_status === "FAILED"
    ? "Payment failed"
    : "Payment pending";
};
function reservationInvoice(reservation) {
  const fee = Number(reservation.fee_amount || 0);
  const hasPreorder = reservation.fulfillment_type === "PREORDER";
  const preorderItems = hasPreorder ? reservation.preorder_items || [] : [];
  const preorderNet = Number(reservation.preorder_total || 0);
  const preorderDiscount = Number(reservation.preorder_discount || 0);
  const preorderSubtotal =
    preorderItems.reduce(
      (sum, item) => sum + Number(item.line_total || 0),
      0,
    ) || preorderNet + preorderDiscount;
  const amount = fee + preorderNet;
  const reservationPaid = reservation.payment_status === "PAID" ? fee : 0;
  const preorderPaid =
    hasPreorder && reservation.preorder_payment_status === "PAID"
      ? preorderNet
      : 0;
  const paidAmount = reservationPaid + preorderPaid;
  const outstandingBalance = Math.max(0, amount - paidAmount);
  const invoiceStatus =
    reservation.payment_status !== "PAID"
      ? reservation.payment_status
      : hasPreorder && reservation.preorder_payment_status !== "PAID"
        ? "PARTIALLY PAID"
        : "PAID";
  const lineItems = reservationFeeLineItems(reservation);
  const tables = reservation.tables || [];
  lineItems.push(
    ...preorderItems.map((item) => ({
      description: `Preorder · ${item.food_name}`,
      variant_name: item.variant_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      amount: item.line_total,
    })),
  );
  if (hasPreorder && preorderItems.length === 0 && preorderNet > 0) {
    lineItems.push({
      description: "Preorder",
      quantity: 1,
      unitPrice: preorderSubtotal,
      amount: preorderSubtotal,
    });
  }
  const reservationMethod = paymentMethodText(reservation.payment_method);
  const preorderMethod = hasPreorder
    ? paymentMethodText(reservation.preorder_payment_method)
    : "Not applicable";
  const reservationCode =
    reservation.reservation_code ||
    `RES-${String(reservation.id || "")
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase()}`;
  return {
    transactionId: reservation.id,
    transactionPrefix: "RES",
    relatedId: null,
    relatedLabel: "Reservation code",
    relatedPrefix: "RES",
    typeLabel: "Reservation and preorder",
    documentTitle: "Reservation invoice",
    description: `Reservation fee · ${formatLocalDate(reservation.reservation_date)} · ${timeText(reservation.start_time)}`,
    lineItems,
    subtotal: fee + preorderSubtotal,
    discountAmount: preorderDiscount,
    amount,
    paidAmount: outstandingBalance > 0 ? paidAmount : undefined,
    outstandingBalance: outstandingBalance > 0 ? outstandingBalance : undefined,
    currency: "INR",
    status: invoiceStatus,
    paymentMethod: hasPreorder
      ? `Reservation: ${reservationMethod}; preorder: ${preorderMethod}`
      : reservationMethod,
    provider:
      reservation.payment_method === "RAZORPAY" ? "Razorpay" : undefined,
    providerReference: reservation.razorpay_payment_id,
    providerOrderReference: reservation.razorpay_order_id,
    paymentBreakdown: [
      { label: "Booking reference", value: reservationCode },
      {
        label: "Restaurant",
        value: reservation.restaurant_name || "Restaurant",
      },
      {
        label: "Reservation",
        value: `${formatLocalDate(reservation.reservation_date)} · ${timeText(reservation.start_time)} · ${reservation.number_of_guests || 0} guests`,
      },
      {
        label: "Tables booked",
        value: `${tables.length} · ${tables.map((table) => table.table_number).join(", ") || "Assignment pending"}`,
      },
      {
        label: "Reservation fee payment",
        value: reservationPaymentText(reservation),
      },
      {
        label: "Preorder",
        value: hasPreorder ? `₹${preorderNet.toFixed(2)}` : "Not ordered",
      },
      ...(hasPreorder
        ? [
            {
              label: "Preorder payment",
              value: preorderPaymentText(reservation),
            },
          ]
        : []),
      ...(reservation.preorder_offer_code
        ? [
            {
              label: "Offer applied",
              value: `${reservation.preorder_offer_code} · discount ₹${preorderDiscount.toFixed(2)}`,
            },
          ]
        : []),
    ],
    createdAt: reservation.timestamps?.created_at || reservation.created_at,
    merchantName: "DineBook",
    customerName: reservation.customer_name,
    customerEmail: reservation.customer_email,
  };
}

export default function CustomerReservationDetailsPage() {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [
    {
      user, reservation, loading, error, notice, busy, reloadKey,
      confirmCancellation, orderMenu, availableOffers, cart, offerCode,
      offerResult, orderError, orderTaxPercent, myReviews, reviewForm,
      editingReviewId, reviewBusy, reviewError, reviewMessage, hoverRating,
    },
    {
      user: setUser, reservation: setReservation, loading: setLoading,
      error: setError, notice: setNotice, busy: setBusy, reloadKey: setReloadKey,
      confirmCancellation: setConfirmCancellation, orderMenu: setOrderMenu,
      availableOffers: setAvailableOffers, cart: setCart, offerCode: setOfferCode,
      offerResult: setOfferResult, orderError: setOrderError,
      orderTaxPercent: setOrderTaxPercent, myReviews: setMyReviews,
      reviewForm: setReviewForm, editingReviewId: setEditingReviewId,
      reviewBusy: setReviewBusy, reviewError: setReviewError,
      reviewMessage: setReviewMessage, hoverRating: setHoverRating,
    },
  ] = usePageState("CustomerReservationDetailsPage", () => ({
    user: null,
    reservation: null,
    loading: true,
    error: "",
    notice: "",
    busy: false,
    reloadKey: 0,
    confirmCancellation: false,
    orderMenu: [],
    availableOffers: [],
    cart: [],
    offerCode: "",
    offerResult: null,
    orderError: "",
    orderTaxPercent: 18,
    myReviews: [],
    reviewForm: {
      rating: 5,
      content: ""
    },
    editingReviewId: null,
    reviewBusy: false,
    reviewError: "",
    reviewMessage: "",
    hoverRating: 0,
  }));
  const realtimeStartedAt = useRef(Date.now());
  const realtimeRefreshTimer = useRef(null);

  useEffect(() => {
    realtimeStartedAt.current = Date.now();

    return () => {
      window.clearTimeout(realtimeRefreshTimer.current);
    };
  }, [reservationId]);

  function scheduledRealtimeRefresh() {
    window.clearTimeout(realtimeRefreshTimer.current);
    realtimeRefreshTimer.current = window.setTimeout(() => {
      realtimeRefreshTimer.current = null;
      setReloadKey((current) => current + 1);
    }, 300);
  }

  async function load(signal, onSettled) {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson(
        `/api/customer/reservations/${reservationId}`,
        { signal },
      );
      if (!data || typeof data !== "object" || !data.id)
        throw new Error(
          "The reservation details could not be loaded. Please try again.",
        );
      if (!signal?.aborted) setReservation(data);
    } catch (reason) {
      if (!signal?.aborted)
        setError(
          reason.message ||
            "The reservation details could not be loaded. Please try again.",
        );
    } finally {
      onSettled?.();
      if (!signal?.aborted) setLoading(false);
    }
  }

  useRealtimeEvents({
    enabled:
      Boolean(user) &&
      !(
        import.meta.env.DEV &&
        sessionStorage.getItem(demoSessionKey) === "active"
      ),
    onEvent: (event) => {
      if (!event) return;

      // The initial load already fetches current state. Ignore historical
      // events replayed when the SSE connection opens.
      const occurredAt = event.occurred_at;
      const eventTime = occurredAt
        ? Date.parse(
            /(?:Z|[+-]\d{2}:\d{2})$/i.test(occurredAt)
              ? occurredAt
              : `${occurredAt}Z`,
          )
        : NaN;

      if (Number.isFinite(eventTime) && eventTime < realtimeStartedAt.current) {
        return;
      }

      const matchesReservation = event.resource_id === reservationId;
      const matchesOrder = reservation?.food_orders?.some(
        (order) => order.id === event.resource_id,
      );
      const referencesReservation =
        event.data?.reservation_id === reservationId;

      if (event.event_type === "booking.updated") {
        if (matchesReservation) scheduleRealtimeRefresh();
        return;
      }

      if (
        event.event_type === "order.status_changed" ||
        event.event_type === "payment.status_changed"
      ) {
        if (matchesReservation || matchesOrder || referencesReservation) {
          scheduleRealtimeRefresh();
        }
      }
    },
    onReconnect: scheduledRealtimeRefresh,
  });

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setError(
          "Loading reservation details took too long. Check your connection and try again.",
        );
        setLoading(false);
        controller.abort();
      }
    }, 20000);
    const demo =
      import.meta.env.DEV &&
      sessionStorage.getItem(demoSessionKey) === "active";
    (demo
      ? Promise.resolve(demoCustomer)
      : requestJson("/api/customer/me", { signal: controller.signal })
    )
      .then((value) => {
        if (alive) setUser(value);
      })
      .catch(() => {
        if (alive && !controller.signal.aborted)
          navigate("/customer/login", { replace: true });
      });
    load(controller.signal, () => window.clearTimeout(timeout));
    return () => {
      alive = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [reservationId, navigate, reloadKey]);

  async function cancel() {
    setBusy(true);
    setNotice("");
    try {
      const result = await requestJson(
        `/api/customer/reservations/${reservationId}/cancel`,
        { method: "POST" },
      );
      const refund = Number(result.wallet_refund || 0);
      setNotice(
        refund > 0
          ? `Reservation cancelled. ₹${refund.toFixed(2)} refunded to your wallet.`
          : "Reservation cancelled.",
      );
      setConfirmCancellation(false);
      await load();
    } catch (reason) {
      setNotice(reason.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (reservation?.status !== "SEATED") return undefined;
    let active = true;
    Promise.all([
      requestJson(
        `/api/customer/restaurants/${reservation.restaurant_id}/menu`,
      ),
      requestJson(
        `/api/customer/orders/offers?restaurant_id=${reservation.restaurant_id}`,
      ),
    ])
      .then(([menu, offers]) => {
        if (active) {
          setOrderMenu(menu);
          setAvailableOffers(offers);
        }
      })
      .catch((reason) => active && setOrderError(reason.message));
    return () => {
      active = false;
    };
  }, [reservation?.restaurant_id, reservation?.status]);

  useEffect(() => {
    let active = true;
    requestJson("/api/customer/orders/tax-rate")
      .then(
        (result) =>
          active && setOrderTaxPercent(Number(result.tax_percent ?? 18)),
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !reservation?.restaurant_id) return undefined;
    let active = true;
    requestJson("/api/customer/reviews")
      .then((reviews) => {
        if (active)
          setMyReviews(
            (reviews || []).filter(
              (review) =>
                String(review.restaurant_id) ===
                String(reservation.restaurant_id),
            ),
          );
      })
      .catch((reason) => {
        if (active) setReviewError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [user, reservation?.restaurant_id, reloadKey]);

  async function saveOrderReview(event) {
    event.preventDefault();
    setReviewBusy(true);
    setReviewError("");
    setReviewMessage("");
    try {
      const saved = await requestJson(
        editingReviewId
          ? `/api/customer/reviews/${editingReviewId}`
          : "/api/customer/reviews",
        {
          method: editingReviewId ? "PATCH" : "POST",
          body: JSON.stringify({
            restaurant_id: reservation.restaurant_id,
            rating: reviewForm.rating,
            content: reviewForm.content,
          }),
        },
      );
      setMyReviews((current) => [
        saved,
        ...current.filter((review) => review.id !== saved.id),
      ]);
      setReviewMessage(
        editingReviewId
          ? "Your review was updated."
          : "Thanks, your review was submitted.",
      );
      setReviewForm({ rating: 5, content: "" });
      setEditingReviewId(null);
      setHoverRating(0);
    } catch (reason) {
      setReviewError(reason.message);
    } finally {
      setReviewBusy(false);
    }
  }

  async function deleteOwnReview(reviewId) {
    if (
      !(await confirmAction(
        "Delete your review for this restaurant? This cannot be undone.",
      ))
    )
      return;
    try {
      await requestJson(`/api/customer/reviews/${reviewId}`, {
        method: "DELETE",
      });
      setMyReviews((current) =>
        current.filter((review) => review.id !== reviewId),
      );
      setReviewMessage("Your review was deleted.");
      setEditingReviewId(null);
      setReviewForm({ rating: 5, content: "" });
    } catch (reason) {
      setReviewError(reason.message);
    }
  }
  const availableVariants = orderMenu
    .flatMap((category) => category.foods || [])
    .flatMap((food) => food.variants || [])
    .filter((variant) => variant.is_available);
  const cartSubtotal = cart.reduce(
    (sum, line) =>
      sum +
      Number(
        availableVariants.find((variant) => variant.id === line.variant_id)
          ?.price || 0,
      ) *
        line.quantity,
    0,
  );
  const cartNet = Math.max(
    0,
    cartSubtotal -
      (offerResult?.valid ? Number(offerResult.discount_amount) : 0),
  );
  const cartTaxAmount = Math.round(cartNet * orderTaxPercent) / 100;
  const cartTotalWithTax = cartNet + cartTaxAmount;
  const cartFoodIds = new Set(
    cart.flatMap((line) =>
      orderMenu
        .flatMap((category) => category.foods || [])
        .filter((food) =>
          food.variants?.some((variant) => variant.id === line.variant_id),
        )
        .map((food) => food.id),
    ),
  );
  const cartCategoryIds = new Set(
    orderMenu.flatMap((category) =>
      (category.foods || [])
        .filter((food) =>
          food.variants?.some((variant) =>
            cart.some((line) => line.variant_id === variant.id),
          ),
        )
        .map((food) => food.category_id || category.id),
    ),
  );
  const relevantOffers = availableOffers.filter(
    (offer) =>
      offer.status === "ACTIVE" &&
      (offer.applicability === "RESTAURANT" ||
        (offer.applicability === "ITEMS" &&
          (offer.eligible_food_ids || []).some((id) => cartFoodIds.has(id))) ||
        (offer.applicability === "CATEGORIES" &&
          (offer.eligible_category_ids || []).some((id) =>
            cartCategoryIds.has(id),
          ))),
  );
  function changeQuantity(variantId, delta) {
    setOfferResult(null);
    setCart((current) => {
      const row = current.find((line) => line.variant_id === variantId);
      if (!row && delta > 0)
        return [...current, { variant_id: variantId, quantity: 1 }];
      return current
        .map((line) =>
          line.variant_id === variantId
            ? { ...line, quantity: Math.min(99, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0);
    });
  }
  async function validateOrderOffer(code = offerCode) {
    setOrderError("");
    setOfferResult(null);
    if (!code.trim() || cart.length === 0) {
      setOrderError("Add menu items and choose an offer first.");
      return;
    }
    const normalizedCode = code.trim().toUpperCase();
    setOfferCode(normalizedCode);
    try {
      const result = await requestJson("/api/customer/orders/offers/validate", {
        method: "POST",
        body: JSON.stringify({
          reservation_id: reservationId,
          offer_code: normalizedCode,
          items: cart,
        }),
      });
      setOfferResult(result);
      if (!result.valid)
        setOrderError(result.reason || "This offer cannot be applied.");
    } catch (reason) {
      setOrderError(reason.message);
    }
  }
  async function placeFoodOrder() {
    setBusy(true);
    setOrderError("");
    try {
      const result = await requestJson(
        `/api/customer/reservations/${reservationId}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
            idempotency_key: window.crypto.randomUUID(),
            reservation_id: reservationId,
            items: cart,
            offer_code: offerResult?.valid ? offerCode.trim() : null,
            payment_method: "PAY_AT_DESK",
          }),
        },
      );
      setNotice(
        `Order placed. ₹${Number(result.total).toFixed(2)} is due at the desk.`,
      );
      setCart([]);
      setOfferCode("");
      setOfferResult(null);
      setReloadKey((key) => key + 1);
    } catch (reason) {
      setOrderError(reason.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ProfileFrame user={user} variant="reservation-details-page">
      <header className="reservation-page-header">
        <div>
          <span className="reservation-page-eyebrow">YOUR ACCOUNT</span>
          <h1>Reservation Details</h1>
          <p>Review your booking, payment, and food orders.</p>
        </div>
        <Link className="reservation-back" to="/customer/profile/reservations">
          <ArrowLeft size={16} /> Back to bookings
        </Link>
      </header>
      {error ? (
        <section className="profile-card reservation-detail-card">
          <div className="profile-empty">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        </section>
      ) : loading || !reservation ? (
        <section
          className="profile-card reservation-detail-card"
          aria-live="polite"
        >
          <p className="profile-empty">Loading reservation…</p>
        </section>
      ) : (
        <>
          <section className="profile-card reservation-detail-card">
            <div className="reservation-detail-heading">
              <div className="reservation-restaurant-copy">
                <span className="reservation-kicker">BOOKING OVERVIEW</span>
                <h2>
                  {reservation.restaurant_name || "Restaurant reservation"}
                </h2>
                {reservation.restaurant_location && (
                  <p>
                    <MapPin size={15} />
                    {reservation.restaurant_location}
                  </p>
                )}
                <span className="reservation-id-chip">
                  Reservation #{reservation.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <span
                className={`reservation-status ${reservation.status?.toLowerCase()}`}
              >
                {title(reservation.status)}
              </span>
            </div>
            {notice && (
              <p className="reservation-notice" role="status">
                {notice}
              </p>
            )}
            <section
              className="reservation-detail-section"
              aria-labelledby="visit-details-heading"
            >
              <h3 id="visit-details-heading">Visit details</h3>
              <div className="reservation-detail-grid">
                <div>
                  <CalendarDays aria-hidden="true" />
                  <span>Date</span>
                  <strong>{formatLocalDate(reservation.reservation_date)}</strong>
                </div>
                <div>
                  <Clock3 aria-hidden="true" />
                  <span>Time</span>
                  <strong>
                    {timeText(reservation.start_time)} –{" "}
                    {timeText(reservation.end_time)}
                  </strong>
                </div>
                <div>
                  <Users aria-hidden="true" />
                  <span>Party size</span>
                  <strong>{reservation.number_of_guests} guests</strong>
                </div>
                <div>
                  <MapPin aria-hidden="true" />
                  <span>Table</span>
                  <strong>
                    {reservation.tables?.length
                      ? reservation.tables
                          .map(
                            (table) =>
                              `${table.floor_name} · Table ${table.table_number}`,
                          )
                          .join(", ")
                      : "Not assigned"}
                  </strong>
                </div>
              </div>
            </section>
            <section
              className="reservation-lifecycle"
              aria-label="Reservation lifecycle"
            >
              <h3>Reservation progress</h3>
              <ol>
                {["CONFIRMED", "SEATED", "COMPLETED"].map((stage) => {
                  const currentIndex = [
                    "CONFIRMED",
                    "SEATED",
                    "COMPLETED",
                  ].indexOf(reservation.status);
                  const stageIndex = [
                    "CONFIRMED",
                    "SEATED",
                    "COMPLETED",
                  ].indexOf(stage);
                  const stamp =
                    stage === "SEATED"
                      ? reservation.timestamps?.checked_in_at || reservation.checked_in_at
                      : stage === "COMPLETED"
                        ? reservation.timestamps?.completed_at || reservation.completed_at
                        : reservation.timestamps?.created_at || reservation.created_at;
                  return (
                    <li
                      key={stage}
                      className={currentIndex >= stageIndex ? "complete" : ""}
                    >
                      <span>{title(stage)}</span>
                      {stamp && currentIndex >= stageIndex && (
                        <time dateTime={stamp}>
                          {formatLocalDateTime(stamp)}
                        </time>
                      )}
                    </li>
                  );
                })}
              </ol>
              {!["CONFIRMED", "SEATED", "COMPLETED"].includes(
                reservation.status,
              ) && (
                <p className="reservation-lifecycle-terminal">
                  {title(reservation.status)}
                  {reservation.status_reason
                    ? ` · ${reservation.status_reason}`
                    : ""}
                </p>
              )}
            </section>
            <section
              className="reservation-payment-section"
              aria-label="Reservation payment"
            >
              <div className="reservation-payment-label">
                <CreditCard size={18} />
                <div>
                  <span className="reservation-section-kicker">PAYMENT</span>
                  <h3>Reservation fee</h3>
                </div>
              </div>
              <strong className="reservation-payment-amount">
                ₹{Number(reservation.fee_amount || 0).toFixed(2)}
              </strong>
              <span
                className={`reservation-payment-status ${reservation.payment_status?.toLowerCase()}`}
              >
                {title(reservation.payment_status)}
              </span>
              <span className="reservation-payment-method">
                {reservationPaymentText(reservation)}
              </span>
              {Number(reservation.extra_hours) > 0 && (
                <span className="reservation-payment-method">
                  Base ₹{Number(reservation.base_fee_amount || 0).toFixed(2)} · Extra time: {reservation.extra_hours} hr
                  {" "}× ₹{Number(reservation.extra_hour_rate || 0).toFixed(2)} = ₹{Number(reservation.extra_fee_amount || 0).toFixed(2)}
                </span>
              )}
              <TransactionInvoiceButton
                invoice={reservationInvoice(reservation)}
              />
            </section>
          </section>
          {reservation.fulfillment_type === "PREORDER" && (
            <section className="profile-card reservation-preorder-section">
              <div className="reservation-preorder-heading">
                <div className="reservation-section-title">
                  <Utensils size={18} />
                  <div>
                    <span className="reservation-section-kicker">PREORDER</span>
                    <h2>Food ordered</h2>
                  </div>
                </div>
                <span>{preorderPaymentText(reservation)}</span>
              </div>
              <div className="reservation-preorder-lines">
                {(reservation.preorder_items || []).map((item) => (
                  <div
                    className="reservation-preorder-line"
                    key={item.variant_id}
                  >
                    {item.image_url && (
                      <img
                        className="order-food-thumb"
                        src={item.image_url}
                        alt=""
                        loading="lazy"
                      />
                    )}
                    <span>
                      <b>{item.quantity} ×</b> {item.food_name}{" "}
                      <small>· {item.variant_name}</small>
                    </span>
                    <strong>₹{Number(item.line_total).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
              <div className="reservation-preorder-total">
                <span>Food subtotal</span>
                <strong>
                  ₹
                  {(
                    Number(reservation.preorder_total || 0) -
                    Number(reservation.preorder_tax_amount || 0) +
                    Number(reservation.preorder_discount || 0)
                  ).toFixed(2)}
                </strong>
              </div>
              {Number(reservation.preorder_discount || 0) > 0 && (
                <div className="reservation-preorder-total">
                  <span>Offer · {reservation.preorder_offer_code}</span>
                  <strong>
                    −₹{Number(reservation.preorder_discount).toFixed(2)}
                  </strong>
                </div>
              )}
              <div className="reservation-preorder-total">
                <span>
                  GST ({Number(reservation.preorder_tax_percent || 0)}%)
                </span>
                <strong>
                  ₹{Number(reservation.preorder_tax_amount || 0).toFixed(2)}
                </strong>
              </div>
              <div className="reservation-preorder-total">
                <b>Preorder total including GST</b>
                <b>₹{Number(reservation.preorder_total || 0).toFixed(2)}</b>
              </div>
            </section>
          )}
          {reservation.status === "SEATED" && (
            <section className="profile-card customer-food-checkout">
              <div className="reservation-section-title">
                <Utensils size={18} />
                <div>
                  <span className="reservation-section-kicker">
                    ORDER FROM THE MENU
                  </span>
                  <h2>Place a food order</h2>
                </div>
              </div>
              {orderError && (
                <p className="customer-food-error" role="alert">
                  {orderError}
                </p>
              )}
              {orderMenu.length === 0 ? (
                <p>{orderError || "Loading the current menu…"}</p>
              ) : (
                <div className="customer-order-menu">
                  {orderMenu
                    .flatMap((category) => category.foods || [])
                    .filter((food) => food.is_available)
                    .map((food) => (
                      <article key={food.id}>
                        <div>
                          <b>{food.name}</b>
                          <small>{food.category_name}</small>
                        </div>
                        {(food.variants || [])
                          .filter((v) => v.is_available)
                          .map((variant) => {
                            const quantity =
                              cart.find(
                                (line) => line.variant_id === variant.id,
                              )?.quantity || 0;
                            return (
                              <div
                                className="customer-order-variant"
                                key={variant.id}
                              >
                                <span>
                                  {variant.name} · ₹
                                  {Number(variant.price).toFixed(2)}
                                </span>
                                <div>
                                  {quantity > 0 && (
                                    <button
                                      type="button"
                                      aria-label={`Remove one ${food.name}`}
                                      onClick={() =>
                                        changeQuantity(variant.id, -1)
                                      }
                                    >
                                      <Minus size={13} />
                                    </button>
                                  )}
                                  <strong>{quantity || ""}</strong>
                                  <button
                                    type="button"
                                    aria-label={`Add one ${food.name}`}
                                    onClick={() =>
                                      changeQuantity(variant.id, 1)
                                    }
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </article>
                    ))}
                </div>
              )}
              {cart.length > 0 && (
                <div className="customer-food-summary">
                  <div className="customer-offers-checkout">
                    <div className="customer-offers-checkout-heading">
                      <Tag size={16} />
                      <div>
                        <strong>Offers for your order</strong>
                        <small>
                          {relevantOffers.length
                            ? "Choose an offer to check your savings."
                            : "No available offers match the items in your cart."}
                        </small>
                      </div>
                    </div>
                    {relevantOffers.map((offer) => (
                      <article
                        key={offer.id}
                        className={
                          offerResult?.valid &&
                          offerResult.offer.id === offer.id
                            ? "applied"
                            : ""
                        }
                      >
                        <div>
                          <strong>{offer.title}</strong>
                          <span>
                            {offer.discount_type === "PERCENTAGE"
                              ? `${offer.discount_percent}% off${offer.max_discount ? ` up to ₹${Number(offer.max_discount).toFixed(2)}` : ""}`
                              : `₹${Number(offer.discount_percent).toFixed(2)} off`}
                          </span>
                          <small>
                            {offer.code} · Min. subtotal ₹
                            {Number(offer.minimum_subtotal).toFixed(2)}
                          </small>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => validateOrderOffer(offer.code)}
                        >
                          {offerResult?.valid &&
                          offerResult.offer.id === offer.id
                            ? "Applied"
                            : "Apply"}
                        </button>
                      </article>
                    ))}
                  </div>
                  <div className="customer-offer-entry">
                    <label>
                      <Tag size={15} />
                      <input
                        aria-label="Offer code"
                        placeholder="Enter offer code"
                        value={offerCode}
                        onChange={(e) => {
                          setOfferCode(e.target.value.toUpperCase());
                          setOfferResult(null);
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => validateOrderOffer()}>
                      Apply code
                    </button>
                    {offerResult?.valid && (
                      <button
                        type="button"
                        onClick={() => {
                          setOfferCode("");
                          setOfferResult(null);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {offerResult?.valid && (
                    <p className="customer-offer-valid">
                      {offerResult.offer.title} applied · −₹
                      {Number(offerResult.discount_amount).toFixed(2)}
                    </p>
                  )}
                  <div className="reservation-preorder-total">
                    <span>Subtotal</span>
                    <strong>₹{cartSubtotal.toFixed(2)}</strong>
                  </div>
                  {offerResult?.valid && (
                    <div className="reservation-preorder-total">
                      <span>Offer discount</span>
                      <strong>
                        −₹{Number(offerResult.discount_amount).toFixed(2)}
                      </strong>
                    </div>
                  )}
                  <div className="reservation-preorder-total">
                    <span>GST ({orderTaxPercent}%)</span>
                    <strong>₹{cartTaxAmount.toFixed(2)}</strong>
                  </div>
                  <div className="reservation-preorder-total">
                    <b>Due at desk · including GST</b>
                    <b>₹{cartTotalWithTax.toFixed(2)}</b>
                  </div>
                  <button
                    className="customer-place-order"
                    type="button"
                    disabled={busy}
                    onClick={placeFoodOrder}
                  >
                    {busy
                      ? "Placing order…"
                      : `Place order · ₹${cartTotalWithTax.toFixed(2)}`}
                  </button>
                </div>
              )}
            </section>
          )}
          {reservation.food_orders?.length > 0 && (
            <section className="profile-card reservation-food-orders">
              <div className="reservation-food-orders-heading">
                <div className="reservation-section-title">
                  <Utensils size={18} />
                  <div>
                    <span className="reservation-section-kicker">
                      ORDER UPDATES
                    </span>
                    <h2>Food orders</h2>
                  </div>
                </div>
              </div>
              <div className="reservation-food-order-list">
                {reservation.food_orders.map((order) => (
                  <article className="reservation-food-order" key={order.id}>
                    <div className="reservation-food-order-top">
                      <Link
                        to={`/customer/profile/orders?search=${encodeURIComponent(order.id)}`}
                      >
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <span
                        className={`reservation-status ${order.status?.toLowerCase()}`}
                      >
                        {title(order.status)}
                      </span>
                    </div>
                    <div className="reservation-preorder-lines">
                      {(order.items || []).map((item, index) => (
                        <div
                          className="reservation-preorder-line"
                          key={`${order.id}-${index}`}
                        >
                          {item.image_url && (
                            <img
                              className="order-food-thumb"
                              src={item.image_url}
                              alt=""
                              loading="lazy"
                            />
                          )}
                          <span>
                            <b>{item.quantity} ×</b> {item.food_name}{" "}
                            <small>· {item.variant_name}</small>
                          </span>
                          <strong>₹{Number(item.line_total).toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="reservation-preorder-total">
                      <span>Order total</span>
                      <strong>₹{Number(order.total || 0).toFixed(2)}</strong>
                    </div>
                    <TransactionInvoiceButton
                      invoice={{
                        transactionId: order.id,
                        relatedId: order.id,
                        relatedLabel: "Order ID",
                        relatedPrefix: "ORD",
                        typeLabel: "Food order",
                        lineItems: order.items?.map((item) => ({
                          description: item.food_name,
                          variant_name: item.variant_name,
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          line_total: item.line_total,
                        })),
                        subtotal: order.subtotal,
                        discountAmount: order.discount_amount,
                        amount: order.total,
                        currency: "INR",
                        status: title(order.payment_status),
                        paymentMethod: title(order.payment_method),
                        provider:
                          order.payment_method === "RAZORPAY"
                            ? "Razorpay"
                            : undefined,
                        providerReference: order.razorpay_payment_id,
                        providerOrderReference: order.razorpay_order_id,
                        createdAt: order.timestamps?.created_at || order.created_at,
                        merchantName:
                          order.restaurant_name || reservation.restaurant_name,
                        merchantLocation:
                          order.restaurant_location ||
                          reservation.restaurant_location,
                        merchantAddress:
                          order.restaurant_address ||
                          reservation.restaurant_address,
                        merchantEmail:
                          order.restaurant_email ||
                          reservation.restaurant_email,
                        merchantPhone:
                          order.restaurant_phone ||
                          reservation.restaurant_phone,
                        customerName:
                          order.customer_name || reservation.customer_name,
                        customerEmail:
                          order.customer_email || reservation.customer_email,
                      }}
                    />
                    {order.completed_at && (
                      <small>
                        Completed{" "}
                        {formatLocalDateTime(order.timestamps?.completed_at || order.completed_at)}
                      </small>
                    )}
                    {order.status_reason && (
                      <p className="reservation-notice">
                        Status note: {order.status_reason}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
          {reservation && user && (
            <section
              className="profile-card reservation-order-reviews"
              aria-labelledby="reservation-reviews-heading"
            >
              <div className="reservation-food-orders-heading">
                <div className="reservation-section-title">
                  <Utensils size={18} />
                  <div>
                    <span className="reservation-section-kicker">
                      YOUR EXPERIENCE
                    </span>
                    <h2 id="reservation-reviews-heading">
                      Your restaurant review
                    </h2>
                  </div>
                </div>
              </div>
              {reviewError && (
                <p className="customer-review-alert" role="alert">
                  {reviewError}
                </p>
              )}
              {reviewMessage && (
                <p className="customer-review-success" role="status">
                  {reviewMessage}
                </p>
              )}
              {editingReviewId ? (
                <CustomForm
                  className="customer-review-form"
                  onSubmit={saveOrderReview}
                >
                  <h3>Edit your restaurant review</h3>
                  <fieldset className="customer-review-rating">
                    <legend>Your rating</legend>
                    <div
                      className="customer-review-star-picker"
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          aria-pressed={reviewForm.rating === rating}
                          aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}
                          className={
                            (hoverRating || reviewForm.rating) >= rating
                              ? "selected"
                              : ""
                          }
                          onMouseEnter={() => setHoverRating(rating)}
                          onFocus={() => setHoverRating(rating)}
                          onBlur={() => setHoverRating(0)}
                          onClick={() =>
                            setReviewForm({ ...reviewForm, rating })
                          }
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <span>
                      {hoverRating || reviewForm.rating} out of 5 stars
                    </span>
                  </fieldset>
                  <label>
                    Your review
                    <textarea
                      required
                      minLength={3}
                      maxLength={5000}
                      value={reviewForm.content}
                      onChange={(event) =>
                        setReviewForm({
                          ...reviewForm,
                          content: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="customer-review-actions">
                    <button type="submit" disabled={reviewBusy}>
                      {reviewBusy ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setEditingReviewId(null);
                        setReviewForm({ rating: 5, content: "" });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </CustomForm>
              ) : myReviews[0] ? (
                <article className="customer-review-card">
                  <div className="customer-review-card-heading">
                    <strong>
                      {"★".repeat(myReviews[0].rating)}
                      {"☆".repeat(5 - myReviews[0].rating)} ·{" "}
                      {reservation.restaurant_name}
                    </strong>
                    <small>{title(myReviews[0].status)}</small>
                  </div>
                  {myReviews[0].status === "REMOVED" ? (
                    <p className="reviews-muted">
                      This review was removed by the platform administrator and
                      is no longer visible to other guests.
                    </p>
                  ) : (
                    <p>{myReviews[0].content}</p>
                  )}
                  {myReviews[0].status !== "REMOVED" && (
                    <div className="customer-review-actions">
                      {myReviews[0].status === "PUBLISHED" && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setEditingReviewId(myReviews[0].id);
                            setReviewForm({
                              rating: myReviews[0].rating,
                              content: myReviews[0].content,
                            });
                            setReviewError("");
                            setReviewMessage("");
                          }}
                        >
                          Edit review
                        </button>
                      )}
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => deleteOwnReview(myReviews[0].id)}
                      >
                        Delete review
                      </button>
                    </div>
                  )}
                </article>
              ) : (
                <CustomForm
                  className="customer-review-form"
                  onSubmit={saveOrderReview}
                >
                  <h3>Rate {reservation.restaurant_name}</h3>
                  <fieldset className="customer-review-rating">
                    <legend>Your rating</legend>
                    <div
                      className="customer-review-star-picker"
                      aria-label="Choose a rating from one to five stars"
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          aria-pressed={reviewForm.rating === rating}
                          aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}
                          className={
                            (hoverRating || reviewForm.rating) >= rating
                              ? "selected"
                              : ""
                          }
                          onMouseEnter={() => setHoverRating(rating)}
                          onFocus={() => setHoverRating(rating)}
                          onBlur={() => setHoverRating(0)}
                          onClick={() =>
                            setReviewForm({ ...reviewForm, rating })
                          }
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <span aria-live="polite">
                      {hoverRating || reviewForm.rating} out of 5 stars
                    </span>
                  </fieldset>
                  <label>
                    Your review
                    <textarea
                      required
                      minLength={3}
                      maxLength={5000}
                      value={reviewForm.content}
                      onChange={(event) =>
                        setReviewForm({
                          ...reviewForm,
                          content: event.target.value,
                        })
                      }
                      placeholder={`How was your visit to ${reservation.restaurant_name || "this restaurant"}?`}
                    />
                  </label>
                  <div className="customer-review-actions">
                    <button type="submit" disabled={reviewBusy}>
                      {reviewBusy ? "Saving…" : "Submit restaurant review"}
                    </button>
                  </div>
                </CustomForm>
              )}
            </section>
          )}
          {reservation.special_request && (
            <section className="profile-card reservation-special-request">
              <span className="reservation-section-kicker">
                SPECIAL REQUEST
              </span>
              <p>{reservation.special_request}</p>
            </section>
          )}
          <div className="reservation-detail-actions">
            <Link to={`/customer/restaurants/${reservation.restaurant_id}`}>
              View restaurant
            </Link>
            {["PENDING_PAYMENT", "CONFIRMED"].includes(reservation.status) && (
              <button
                disabled={busy}
                onClick={() => setConfirmCancellation(true)}
              >
                {busy ? "Cancelling…" : "Cancel reservation"}
              </button>
            )}
          </div>
        </>
      )}
      {confirmCancellation && reservation && (
        <ConfirmActionDialog
          action="cancel"
          resourceType="reservation"
          resourceName={reservation.restaurant_name}
          title="Cancel this reservation?"
          description="Cancel within 24 hours of booking to receive both the paid reservation fee and any paid preorder amount. After 24 hours, only the paid preorder amount is refunded. Refunds go to your DineBook wallet."
          busy={busy}
          onCancel={() => {
            if (!busy) setConfirmCancellation(false);
          }}
          onConfirm={cancel}
        />
      )}
    </ProfileFrame>
  );
}
