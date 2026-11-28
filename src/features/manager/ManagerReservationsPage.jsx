import LoadingState from "../../components/ui/LoadingState.jsx";
import { usePageState } from "../../state/usePageState.js";
import { formatWallTime, shiftLocalMonth } from "../../lib/localDate.js";
import CustomForm from "../../components/forms/CustomForm.jsx";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Table2,
  Utensils,
  QrCode,
  Minus,
  Plus,
  Tag,
  Upload,
  Search,
  Users,
  X,
} from "lucide-react";
import ReservationDateStrip from "../../components/manager/ReservationDateStrip.jsx";
import { buildCalendarActivities, ManagerCalendarOrderCard, ManagerCalendarOrderDetails } from "../../components/manager/ManagerCalendarOrders.jsx";
import ManagerOrderItems from "../../components/manager/ManagerOrderItems.jsx";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import { displayOffersForFood, isCoupon, offerSavingLabel } from "../../lib/foodOffers.js";
import jsQR from "jsqr";
import "../../assets/css/ManagerReservationsPage.css";

const statusClass = {
  CONFIRMED: "confirmed",
  PENDING_PAYMENT: "pending",
  CANCELLED: "cancelled",
  REJECTED: "cancelled",
  NO_SHOW: "cancelled",
  COMPLETED: "completed",
  SEATED: "confirmed",
};
const statusLabel = {
  CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Payment due",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  NO_SHOW: "No show",
  COMPLETED: "Completed",
  SEATED: "Seated",
};
const activityStatusLabels = {
  ...statusLabel,
  PLACED: "Awaiting acceptance",
  ACCEPTED: "Sent to kitchen",
  PREPARING: "Being prepared",
  READY: "Ready to serve",
  SERVED: "Served",
};
const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const isCalendarDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
const reservationLookupPrefix = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/^res-/i, "")
    .replaceAll("-", "")
    .toLowerCase();
  return normalized.length >= 6 && [...normalized].every((char) => "0123456789abcdef".includes(char))
    ? normalized
    : null;
};
const reservationCode = (reservation) =>
  reservation?.reservation_code || `RES-${reservation?.id?.replaceAll("-", "").slice(0, 8).toUpperCase() || ""}`;
const initials = (name) => name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "G";

function ReservationAvatar({ name, url, detail = false }) {
  const [failedUrl, setFailedUrl] = useState("");
  const showImage = Boolean(url && url !== failedUrl);
  return <span className={`reservation-avatar${detail ? " reservation-avatar-detail" : ""}`}>
    {showImage ? <img src={url} alt="" loading="lazy" onError={() => setFailedUrl(url)} /> : initials(name)}
  </span>;
}
const orderTone = (status) =>
  ({
    PLACED: "pending",
    ACCEPTED: "confirmed",
    PREPARING: "confirmed",
    READY: "completed",
    SERVED: "completed",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    REJECTED: "cancelled",
  })[status] || "pending";
const orderStatusLabel = (status) =>
  ({
    PLACED: "Awaiting kitchen handoff",
    ACCEPTED: "Sent to kitchen",
    PREPARING: "Being prepared",
    READY: "Ready to serve",
    SERVED: "Served",
    COMPLETED: "Served",
    CANCELLED: "Removed",
    REJECTED: "Declined by kitchen",
  })[status] || "Order update pending";
const shortTime = formatWallTime;
const consolidateDeskOrderLines = (lines) => {
  const quantities = new Map();
  lines.forEach(({ variant_id, quantity }) => {
    quantities.set(
      variant_id,
      (quantities.get(variant_id) || 0) + Number(quantity),
    );
  });
  return [...quantities].map(([variant_id, quantity]) => ({
    variant_id,
    quantity,
  }));
};

export default function ManagerReservationsPage() {
  const reservationListScrollRef = useRef(null);
  const loadingNextPageRef = useRef(false);
  const [loadingNextPage, setLoadingNextPage] = useState(false);
  const [
    {
      items, orders, calendarDays, tables, reservationTotal,
      reservationGuestCount, ordersTotal, calendarLoading, workingDays,
      selectedDate, monthTime, tableFilter, statusFilter, guestFilter,
      reservationSort, listPage, orderPage, listPageSize, query, debouncedQuery,
      expandedId, error, cancellationNotice, busyId, pendingAction,
      pendingOrderRemoval, actionReason, scannerOpen, scanValue, scanBusy,
      scanError, foodReservation, deskOrderReservation, deskOrderKey,
      deskOrderLines, deskOrderOffers, deskOrderSearch, deskOrderSearchLoading, reservationOrders, ordersLoadingId, menu, menuBusy,
      variantId, foodQuantity, cameraActive,
    },
    {
      items: setItems, orders: setOrders, calendarDays: setCalendarDays,
      tables: setTables, reservationTotal: setReservationTotal,
      reservationGuestCount: setReservationGuestCount,
      ordersTotal: setOrdersTotal, calendarLoading: setCalendarLoading,
      workingDays: setWorkingDays, selectedDate: setSelectedDate,
      monthTime: setMonthTime, tableFilter: setTableFilter,
      statusFilter: setStatusFilter, guestFilter: setGuestFilter,
      reservationSort: setReservationSort, listPage: setListPage,
      orderPage: setOrderPage, listPageSize: setListPageSize, query: setQuery,
      debouncedQuery: setDebouncedQuery, expandedId: setExpandedId,
      error: setError, cancellationNotice: setCancellationNotice,
      busyId: setBusyId, pendingAction: setPendingAction,
      pendingOrderRemoval: setPendingOrderRemoval, actionReason: setActionReason,
      scannerOpen: setScannerOpen, scanValue: setScanValue, scanBusy: setScanBusy,
      scanError: setScanError, foodReservation: setFoodReservation,
      deskOrderReservation: setDeskOrderReservation,
      deskOrderKey: setDeskOrderKey, deskOrderLines: setDeskOrderLines,
      deskOrderOffers: setDeskOrderOffers,
      deskOrderSearch: setDeskOrderSearch,
      deskOrderSearchLoading: setDeskOrderSearchLoading,
      reservationOrders: setReservationOrders,
      ordersLoadingId: setOrdersLoadingId, menu: setMenu, menuBusy: setMenuBusy,
      variantId: setVariantId, foodQuantity: setFoodQuantity,
      cameraActive: setCameraActive,
    },
  ] = usePageState("ManagerReservationsPage", () => ({
    items: [],
    orders: [],
    calendarDays: {},
    tables: [],
    reservationTotal: 0,
    reservationGuestCount: 0,
    ordersTotal: 0,
    calendarLoading: true,
    workingDays: null,
    selectedDate: dayKey(new Date()),
    monthTime: shiftLocalMonth(Date.now()),
    tableFilter: "all",
    statusFilter: "all",
    guestFilter: "all",
    reservationSort: "time",
    listPage: 1,
    orderPage: 1,
    listPageSize: 10,
    query: new URLSearchParams(window.location.search).get("reservationId") || "",
    debouncedQuery: new URLSearchParams(window.location.search).get("reservationId") || "",
    expandedId: "",
    error: "",
    cancellationNotice: "",
    busyId: "",
    pendingAction: null,
    pendingOrderRemoval: null,
    actionReason: "",
    scannerOpen: false,
    scanValue: "",
    scanBusy: false,
    scanError: "",
    foodReservation: null,
    deskOrderReservation: null,
    deskOrderKey: "",
    deskOrderLines: [],
    deskOrderOffers: [],
    deskOrderSearch: "",
    deskOrderSearchLoading: false,
    reservationOrders: {},
    ordersLoadingId: "",
    menu: [],
    menuBusy: false,
    variantId: "",
    foodQuantity: 1,
    cameraActive: false,
  }));
  const month = useMemo(() => new Date(monthTime), [monthTime]);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);
  const scanActiveRef = useRef(false);

  useEffect(() => {
    if (!scannerOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector(".reservation-pass-dialog");
    dialog?.querySelector("button")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setScannerOpen(false);
      if (event.key !== "Tab") return;
      const controls = [
        ...dialog.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
        ),
      ].filter(
        (element) =>
          element.getClientRects().length &&
          getComputedStyle(element).opacity !== "0",
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      scanActiveRef.current = false;
      cameraRef.current?.getTracks().forEach((track) => track.stop());
      cameraRef.current = null;
      setCameraActive(false);
      previousFocus?.focus();
    };
  }, [scannerOpen]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadCalendarSummary = useCallback(async (signal) => {
    const startDate = dayKey(
      new Date(month.getFullYear(), month.getMonth(), 1),
    );
    const endDate = dayKey(
      new Date(month.getFullYear(), month.getMonth() + 1, 0),
    );
    try {
      const result = await requestJson(
        `/api/manager/calendar/summary?${new URLSearchParams({ start_date: startDate, end_date: endDate })}`,
        { signal },
      );
      setCalendarDays(result.days || {});
      setTables(result.tables || []);
    } catch (e) {
      if (!signal?.aborted) setError(e.message);
    }
  }, [month]);

  const loadCalendarActivities = useCallback(
    async (signal) => {
      setCalendarLoading(true);
      const params = new URLSearchParams({
        day: selectedDate,
        page: "1",
        order_page: "1",
        page_size: String(listPageSize),
        sort: reservationSort,
      });
      if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (tableFilter !== "all") params.set("table_id", tableFilter);
      if (guestFilter !== "all") params.set("guest_filter", guestFilter);
      try {
        const result = await requestJson(
          `/api/manager/calendar/activities?${params}`,
          { signal },
        );
        setItems(result.reservations.items || []);
        setOrders(result.orders.items || []);
        setReservationTotal(result.reservations.total || 0);
        setReservationGuestCount(result.reservations.guest_count || 0);
        setOrdersTotal(result.orders.total || 0);
        const lookupDate = result.reservation_lookup_date || result.order_lookup_date;
        if (isCalendarDate(lookupDate)) {
          setSelectedDate(lookupDate);
          setMonthTime(new Date(`${lookupDate}T12:00:00`).getTime());
        }
        if (isCalendarDate(result.reservation_lookup_date)) {
          setExpandedId(result.reservations.items?.[0]?.id || "");
        }
        setError("");
      } catch (e) {
        if (!signal?.aborted) {
          setItems([]);
          setOrders([]);
          setReservationTotal(0);
          setReservationGuestCount(0);
          setOrdersTotal(0);
          setError(e.message);
        }
      } finally {
        if (!signal?.aborted) setCalendarLoading(false);
      }
    },
    [
      selectedDate,
      listPageSize,
      reservationSort,
      debouncedQuery,
      statusFilter,
      tableFilter,
      guestFilter,
    ],
  );

  const loadNextCalendarPage = useCallback(async () => {
    if (
      loadingNextPageRef.current ||
      items.length >= reservationTotal &&
      orders.length >= ordersTotal
    ) {
      return;
    }

    loadingNextPageRef.current = true;
    setLoadingNextPage(true);
    const nextListPage =
      items.length < reservationTotal ? listPage + 1 : listPage;
    const nextOrderPage =
      orders.length < ordersTotal ? orderPage + 1 : orderPage;
    const params = new URLSearchParams({
      day: selectedDate,
      page: String(nextListPage),
      order_page: String(nextOrderPage),
      page_size: String(listPageSize),
      sort: reservationSort,
    });
    if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (tableFilter !== "all") params.set("table_id", tableFilter);
    if (guestFilter !== "all") params.set("guest_filter", guestFilter);

    try {
      const result = await requestJson(
        `/api/manager/calendar/activities?${params}`,
      );
      const nextReservations = result.reservations.items || [];
      const nextOrders = result.orders.items || [];
      setItems((current) => [
        ...current,
        ...nextReservations.filter(
          (entry) =>
            !current.some((existing) => existing.id === entry.id),
        ),
      ]);
      setOrders((current) => [
        ...current,
        ...nextOrders.filter(
          (entry) =>
            !current.some((existing) => existing.id === entry.id),
        ),
      ]);
      setReservationTotal(result.reservations.total || reservationTotal);
      setOrdersTotal(result.orders.total || ordersTotal);
      setListPage(nextListPage);
      setOrderPage(nextOrderPage);
      setReservationGuestCount(
        result.reservations.guest_count || reservationGuestCount,
      );
    } catch (reason) {
      setError(reason.message);
    } finally {
      loadingNextPageRef.current = false;
      setLoadingNextPage(false);
    }
  }, [
    debouncedQuery,
    guestFilter,
    items.length,
    listPage,
    orderPage,
    orders.length,
    ordersTotal,
    reservationGuestCount,
    reservationSort,
    reservationTotal,
    selectedDate,
    statusFilter,
    tableFilter,
    listPageSize,
    setError,
    setItems,
    setListPage,
    setOrderPage,
    setOrders,
    setOrdersTotal,
    setReservationGuestCount,
    setReservationTotal,
  ]);

  const realtimeStatus = useRealtimeEvents({
    enabled: true,
    onEvent: (event) => {
      if (
        [
          "booking.updated",
          "order.status_changed",
          "payment.status_changed",
        ].includes(event?.event_type)
      ) {
        loadCalendarActivities();
        loadCalendarSummary();
      }
    },
    onReconnect: () => {
      loadCalendarActivities();
      loadCalendarSummary();
    },
  });
  useEffect(() => {
    const controller = new AbortController();
    loadCalendarSummary(controller.signal);
    return () => controller.abort();
  }, [loadCalendarSummary]);
  const calendarFilterKey = JSON.stringify([
    selectedDate,
    tableFilter,
    debouncedQuery,
    statusFilter,
    guestFilter,
    reservationSort,
    listPageSize,
  ]);
  const previousCalendarFilterKey = useRef(calendarFilterKey);
  useEffect(() => {
    const filtersChanged =
      previousCalendarFilterKey.current !== calendarFilterKey;
    previousCalendarFilterKey.current = calendarFilterKey;
    if (filtersChanged) {
      setListPage(1);
      setOrderPage(1);
    }
    const controller = new AbortController();
    loadCalendarActivities(controller.signal);
    return () => controller.abort();
  }, [
    calendarFilterKey,
    loadCalendarActivities,
    setListPage,
    setOrderPage,
  ]);
  useEffect(() => {
    requestJson("/api/auth/manager/me")
      .then((manager) =>
        setWorkingDays(
          Array.isArray(manager.restaurant_hours)
            ? manager.restaurant_hours
            : [],
        ),
      )
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setListPage((current) =>
      Math.min(
        current,
        Math.max(1, Math.ceil(reservationTotal / listPageSize)),
      ),
    );
    setOrderPage((current) =>
      Math.min(current, Math.max(1, Math.ceil(ordersTotal / listPageSize))),
    );
  }, [reservationTotal, ordersTotal, listPageSize]);
  const isReservationIdLookup = Boolean(reservationLookupPrefix(query));
  const selectedItems = items;
  const selectedStandaloneOrders = orders;
  const visibleActivities = buildCalendarActivities(selectedItems, selectedStandaloneOrders);
  const visibleReservations = visibleActivities.filter(
    ({ type }) => type === "reservation",
  );
  const visibleSpotOrders = visibleActivities.filter(
    ({ type }) => type === "order",
  );
  const dayGuestCount = reservationGuestCount;

  const selectedActivity = visibleActivities.find((entry) => entry.selectionId === expandedId) || visibleActivities[0] || null;
  const selectedReservation = selectedActivity?.type === "reservation" ? selectedActivity.item : null;
  const selectedOrder = selectedActivity?.type === "order" ? selectedActivity.item : null;

  async function update(item, action, reason = "") {
    setBusyId(item.id);
    setCancellationNotice("");
    setError("");
    try {
      const result = await requestJson(`/api/manager/reservations/${item.id}/${action}`, {
        method: "POST",
        ...(action === "cancel"
          ? { body: JSON.stringify({ reason: reason.trim() || null }) }
          : {}),
      });
      if (action === "cancel") {
        const refund = Number(result.wallet_refund || 0);
        setCancellationNotice(
          refund > 0
            ? `Reservation cancelled. ₹${refund.toFixed(2)} refunded to the customer’s wallet.`
            : "Reservation cancelled.",
        );
      }
      await Promise.all([loadCalendarActivities(), loadCalendarSummary()]);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function updateReservationStatus(item, status, reason = "") {
    setBusyId(item.id);
    try {
      await requestJson(`/api/manager/reservations/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: reason.trim() || null }),
      });
      const refreshes = [loadCalendarActivities(), loadCalendarSummary()];
      if (status === "SEATED") refreshes.push(loadReservationOrders(item.id));
      await Promise.all(refreshes);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function verifyPass(value) {
    const raw = String(value || "").trim();
    if (!raw) return;
    let id = raw;
    try {
      const parsed = JSON.parse(raw);
      id = parsed.reservation_id || parsed.reservationId || parsed.id || raw;
    } catch {
      // Some passes may contain the reservation ID as plain text.
    }
    const normalized = reservationLookupPrefix(id);
    const match = items.find((reservation) =>
      normalized && reservation.id.replaceAll("-", "").toLowerCase().startsWith(normalized),
    );
    if (match) id = match.id;
    // A printed RES code contains only the UUID prefix. Let the calendar
    // lookup resolve it instead of sending an incomplete UUID to detail API.
    if (normalized && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(id))) {
      setQuery(`RES-${normalized.toUpperCase()}`);
      setScannerOpen(false);
      setScanValue("");
      return;
    }
    setScanBusy(true);
    setScanError("");
    try {
      const reservation = await requestJson(
        `/api/manager/reservations/${encodeURIComponent(id)}`,
      );
      setQuery(reservation.reservation_code || reservation.id);
      if (isCalendarDate(reservation.reservation_date_iso)) {
        setSelectedDate(reservation.reservation_date_iso);
        setMonthTime(shiftLocalMonth(`${reservation.reservation_date_iso}T12:00:00`));
      }
      setExpandedId(reservation.id);
      loadReservationOrders(reservation.id);
      setScannerOpen(false);
      setScanValue("");
    } catch (e) {
      setScanError(
        e.message?.includes("valid UUID")
          ? "Enter a valid reservation ID, or scan or upload the customer’s QR pass."
          : e.message || "Could not verify this pass for your restaurant.",
      );
    } finally {
      setScanBusy(false);
    }
  }

  async function openFoodEditor(item) {
    setFoodReservation(item);
    setVariantId("");
    setFoodQuantity(1);
    setMenuBusy(true);
    try {
      setMenu(await requestJson("/api/manager/menu"));
    } catch (e) {
      setError(e.message);
    } finally {
      setMenuBusy(false);
    }
  }

  async function addFood(event) {
    event.preventDefault();
    if (!foodReservation || !variantId) return;
    setBusyId(foodReservation.id);
    try {
      await requestJson(
        `/api/manager/reservations/${foodReservation.id}/preorder-items`,
        {
          method: "POST",
          body: JSON.stringify({
            variant_id: variantId,
            quantity: Number(foodQuantity),
          }),
        },
      );
      await Promise.all([loadCalendarActivities(), loadCalendarSummary()]);
      setFoodReservation(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  const loadReservationOrders = useCallback(async (reservationId) => {
    setOrdersLoadingId(reservationId);
    try {
      const data = await requestJson(
        `/api/manager/reservations/${reservationId}/orders`,
      );
      setReservationOrders((current) => ({
        ...current,
        [reservationId]: data,
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setOrdersLoadingId((current) => current === reservationId ? "" : current);
    }
  }, []);

  async function removeManagerAddedOrder() {
    if (!pendingOrderRemoval) return;
    const { order, reservationId } = pendingOrderRemoval;
    setBusyId(order.id);
    setError("");
    try {
      const updated = await requestJson(
        `/api/manager/orders/${encodeURIComponent(order.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "CANCELLED",
            reason: "Removed by manager because it was added by mistake.",
          }),
        },
      );
      setReservationOrders((current) => ({
        ...current,
        [reservationId]: (current[reservationId] || []).map((entry) =>
          entry.id === updated.id ? updated : entry,
        ),
      }));
      await loadCalendarSummary();
      setPendingOrderRemoval(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function openDeskOrder(item) {
    setDeskOrderReservation(item);
    setDeskOrderKey(window.crypto.randomUUID());
    setDeskOrderLines([]);
    setDeskOrderOffers([]);
    setDeskOrderSearch("");
    setDeskOrderSearchLoading(true);
    setMenu([]);
    setVariantId("");
    setFoodQuantity(1);
    try {
      const offerData = await requestJson("/api/manager/orders/offers?status=ACTIVE&limit=200");
      setDeskOrderOffers(offerData.items || []);
    } catch {
      // Menu selection remains available if offer badges cannot be loaded.
      setDeskOrderOffers([]);
    }
  }

  async function createDeskOrder(event) {
    event.preventDefault();
    const orderItems = consolidateDeskOrderLines(deskOrderLines);
    if (
      !deskOrderReservation ||
      !deskOrderLines.length ||
      deskOrderLines.some(
        (line) =>
          !line.variant_id ||
          !Number.isInteger(Number(line.quantity)) ||
          Number(line.quantity) < 1 ||
          Number(line.quantity) > 99,
      ) ||
      orderItems.some((line) => line.quantity > 99)
    )
      return;
    setBusyId(deskOrderReservation.id);
    try {
      const order = await requestJson(
        `/api/manager/reservations/${deskOrderReservation.id}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
            idempotency_key: deskOrderKey,
            items: orderItems,
            payment_method: "PAY_AT_DESK",
            customer_note: "Manager desk order",
          }),
        },
      );
      setReservationOrders((current) => ({
        ...current,
        [deskOrderReservation.id]: [
          ...(current[deskOrderReservation.id] || []).filter(
            (entry) => entry.id !== order.id,
          ),
          order,
        ],
      }));
      await loadCalendarSummary();
      setDeskOrderReservation(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function confirmPreorderPayment(item) {
    setBusyId(item.id);
    try {
      await requestJson(
        `/api/manager/reservations/${item.id}/confirm-preorder-payment`,
        { method: "POST" },
      );
      await Promise.all([loadCalendarActivities(), loadCalendarSummary()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  const availableVariants = menu
    .filter((category) => category.is_active)
    .flatMap((category) =>
      (category.foods || [])
        .filter((food) => food.is_available)
        .flatMap((food) =>
          (food.variants || [])
            .filter((variant) => variant.is_available)
            .map((variant) => ({
              ...variant,
              foodName: food.name,
              foodDescription: food.description,
              image_url: food.image_url,
              foodId: food.id,
              categoryId: food.category_id,
            })),
        ),
    );
  const deskOrderItemCount = deskOrderLines.reduce(
    (total, line) => total + Number(line.quantity || 0),
    0,
  );
  const deskOrderTotal = deskOrderLines.reduce((total, line) => {
    const variant = availableVariants.find((item) => item.id === line.variant_id);
    return total + Number(variant?.price || 0) * Number(line.quantity || 0);
  }, 0);
  const normalizedDeskOrderSearch = deskOrderSearch.trim().toLowerCase();
  const visibleDeskOrderVariants = normalizedDeskOrderSearch
    ? availableVariants.filter((variant) => [
      variant.foodName,
      variant.name,
      variant.foodDescription,
    ].some((value) => value?.toLowerCase().includes(normalizedDeskOrderSearch)))
    : availableVariants;

  function setDeskOrderQuantity(variantId, quantity) {
    setDeskOrderLines((current) => {
      const existing = current.find((line) => line.variant_id === variantId);
      if (quantity < 1) return current.filter((line) => line.variant_id !== variantId);
      if (existing) {
        return current.map((line) =>
          line.variant_id === variantId ? { ...line, quantity } : line,
        );
      }
      if (current.length >= 50) return current;
      return [...current, {
        key: window.crypto.randomUUID(),
        variant_id: variantId,
        quantity,
      }];
    });
  }

  useEffect(() => {
    if (!deskOrderReservation) return undefined;
    const controller = new AbortController();
    const query = deskOrderSearch.trim();
    const delay = window.setTimeout(async () => {
      setDeskOrderSearchLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("search", query);
        const path = params.size ? `/api/manager/menu?${params}` : "/api/manager/menu";
        const result = await requestJson(path, { signal: controller.signal });
        if (!controller.signal.aborted) setMenu(result);
      } catch (e) {
        if (!controller.signal.aborted && e.name !== "AbortError") setError(e.message);
      } finally {
        if (!controller.signal.aborted) setDeskOrderSearchLoading(false);
      }
    }, query ? 250 : 0);
    return () => {
      window.clearTimeout(delay);
      controller.abort();
    };
  }, [deskOrderReservation?.id, deskOrderSearch]);

  useEffect(() => {
    if (selectedReservation?.id && !calendarLoading) loadReservationOrders(selectedReservation.id);
  }, [selectedReservation?.id, calendarLoading, loadReservationOrders]);

  function selectDate(value) {
    setSelectedDate(value);
    setExpandedId("");
    if (isReservationIdLookup) setQuery("");
  }

  function selectActivity(id) {
    setExpandedId(id);
    if (window.matchMedia("(max-width: 760px)").matches) {
      document.getElementById("reservation-detail-panel")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    }
  }

  function moveMonth(direction) {
    const nextMonth = shiftLocalMonth(monthTime, direction);
    setMonthTime(nextMonth);
    const today = new Date();
    selectDate(dayKey(shiftLocalMonth(today) === nextMonth ? today : new Date(nextMonth)));
  }

  function goToToday() {
    setMonthTime(shiftLocalMonth(Date.now()));
    selectDate(dayKey(new Date()));
  }

  const selectedLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  function renderReservationDetails(item) {
    return <>
      <header className="reservation-detail-heading">
        <span className="reservation-eyebrow">RESERVATION DETAILS</span>
        <span className="reservation-detail-code"><small>Reservation code</small><code>{reservationCode(item)}</code></span>
      </header>
      <div className="reservation-detail-hero">
        <div className="reservation-detail-tags">
          <span className={`reservation-status ${statusClass[item.status] || "pending"}`}>{statusLabel[item.status] || item.status}</span>
          <span>{item.fulfillment_type === "PREORDER" ? "Table + preorder" : "Table reservation"}</span>
        </div>
        <div className="reservation-detail-guest">
          <ReservationAvatar name={item.customer_name} url={item.customer_avatar_url} detail />
          <div><h3>{item.customer_name}</h3><p><Mail size={14} />{item.customer_email || "Restaurant guest"}</p></div>
        </div>
        <div className="reservation-detail-hero-footer"><CalendarDays size={15} /><span>{selectedLabel}</span><span className="reservation-detail-duration">{shortTime(item.start_time)} – {shortTime(item.end_time)}</span></div>
      </div>
      <section className="reservation-information">
        <h3>Visit information</h3>
        <div className="reservation-information-grid">
          <div className="reservation-code-information"><QrCode size={20} /><span><small>Reservation code</small><strong>{reservationCode(item)}</strong></span></div>
          <div><CalendarDays size={20} /><span><small>Reservation date</small><strong>{selectedLabel}</strong></span></div>
          <div><Clock3 size={20} /><span><small>Arrival & departure</small><strong>{shortTime(item.start_time)} – {shortTime(item.end_time)}</strong></span></div>
          <div><Users size={20} /><span><small>Party size</small><strong>{item.number_of_guests} {item.number_of_guests === 1 ? "guest" : "guests"}</strong></span></div>
          <div><Table2 size={20} /><span><small>Reserved tables</small><strong>{item.tables.map((table) => `Table ${table.table_number}`).join(", ") || "Not assigned"}</strong></span></div>
          <div><MapPin size={20} /><span><small>Floor / zone</small><strong>{[...new Set(item.tables.map((table) => table.floor_name).filter(Boolean))].join(", ") || "Not specified"}</strong></span></div>
          <div><Utensils size={20} /><span><small>Booking type</small><strong>{item.fulfillment_type === "PREORDER" ? "Preorder included" : "Table only"}</strong></span></div>
        </div>
      </section>
      <section className="reservation-information reservation-payment-information">
        <h3>Payment information</h3>
        <div className="reservation-information-grid">
          <div><CreditCard size={20} /><span><small>Reservation fee · {item.payment_status?.replaceAll("_", " ").toLowerCase()}</small><strong>₹{Number(item.fee_amount || 0).toFixed(2)}</strong></span></div>
          {item.fulfillment_type === "PREORDER" && <div><Utensils size={20} /><span><small>Preorder · {item.preorder_payment_status === "PAID" ? "paid" : "due at desk"}</small><strong>₹{Number(item.preorder_total || 0).toFixed(2)}</strong></span></div>}
          {Number(item.preorder_due_at_desk || 0) > 0 && <div><CreditCard size={20} /><span><small>Food due at desk</small><strong>₹{Number(item.preorder_due_at_desk).toFixed(2)}</strong></span></div>}
        </div>
        {Number(item.extra_fee_amount) > 0 && <p className="reservation-extra-fee">Includes ₹{Number(item.extra_fee_amount).toFixed(2)} for {item.extra_hours} extra hour{item.extra_hours === 1 ? "" : "s"}.</p>}
      </section>
      <div className="reservation-expanded-details">
        {item.preorder_items?.length > 0 && <section className="reservation-preorder-summary"><ManagerOrderItems items={item.preorder_items} title="Preordered items" /></section>}
        <div className="reservation-linked-orders">
          <strong>Food orders for this visit</strong>
          {ordersLoadingId === item.id ? (
            <span>Loading orders…</span>
          ) : (reservationOrders[item.id] || []).length ===
            0 ? (
            <span>
              No food orders have been sent to the kitchen
              yet.
            </span>
          ) : (
            (reservationOrders[item.id] || []).map(
              (order) => {
                const managerAdded =
                  order.customer_note ===
                  "Manager desk order";
                const canRemove =
                  managerAdded &&
                  [
                    "PLACED",
                    "ACCEPTED",
                    "PREPARING",
                  ].includes(order.status);
                return (
                  <article
                    className="reservation-linked-order"
                    key={order.id}
                  >
                    <div className="reservation-linked-order-content">
                      <div className="reservation-linked-order-heading">
                        <strong>
                          {managerAdded
                            ? "Added by manager"
                            : order.is_preorder
                              ? "Customer preorder"
                              : "Reservation order"}
                        </strong>
                        <span
                          className={`reservation-order-progress ${orderTone(order.status)}`}
                        >
                          {orderStatusLabel(order.status)}
                        </span>
                      </div>
                      <ManagerOrderItems items={order.items || []} />
                      <div className="reservation-linked-order-footer">
                        <strong>
                          Order total · ₹
                          {Number(order.total).toFixed(2)}
                        </strong>
                        <span>
                          {order.payment_status === "PAID"
                            ? "Paid"
                            : "Payment due at desk"}
                        </span>
                      </div>
                    </div>
                    <div className="reservation-linked-order-actions">
                      <Link
                        to={`/manager/orders/${order.id}`}
                      >
                        View details
                      </Link>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingOrderRemoval({
                              order,
                              reservationId: item.id,
                            })
                          }
                        >
                          Remove order
                        </button>
                      )}
                    </div>
                  </article>
                );
              },
            )
          )}
          {item.status === "SEATED" &&
            ordersLoadingId !== item.id &&
            reservationOrders[item.id] &&
            (reservationOrders[item.id].some(
              (order) => order.status === "PLACED",
            ) ||
              (item.fulfillment_type === "PREORDER" &&
                item.preorder_items?.length > 0 &&
                !["REFUNDED", "CANCELLED"].includes(
                  item.preorder_payment_status,
                ) &&
                !reservationOrders[item.id].some(
                  (order) => order.is_preorder,
                ))) && (
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() =>
                  updateReservationStatus(item, "SEATED")
                }
              >
                {busyId === item.id
                  ? "Sending…"
                  : "Send waiting orders to kitchen"}
              </button>
            )}
          {item.status === "SEATED" &&
            !(
              item.fulfillment_type === "PREORDER" &&
              item.preorder_items?.length > 0
            ) && (
              <button
                type="button"
                onClick={() => openDeskOrder(item)}
              >
                Order at desk
              </button>
            )}
        </div>

        <div className="reservation-special-request">
          {item.special_request && (
            <p>{item.special_request}</p>
          )}

        </div>
        {["PENDING_PAYMENT", "CONFIRMED", "SEATED"].includes(item.status) && <section className="reservation-visit-actions"><h3>Manage reservation</h3><div>
          {["CONFIRMED", "SEATED"].includes(item.status) &&
            item.preorder_payment_method === "PAY_AT_DESK" &&
            item.preorder_payment_status === "PENDING" && (
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => confirmPreorderPayment(item)}
              >
                {busyId === item.id
                  ? "Recording…"
                  : "Record preorder payment received"}
              </button>
            )}
          {item.status === "PENDING_PAYMENT" && (
            <div>
              {item.fulfillment_type !== "PREORDER" && (
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => openFoodEditor(item)}
                >
                  Add food before confirming
                </button>
              )}
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() =>
                  setPendingAction({
                    item,
                    action: "confirm-payment",
                  })
                }
              >
                Record payment & confirm
              </button>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => {
                  setActionReason("");
                  setPendingAction({ item, action: "cancel" });
                }}
              >
                Cancel
              </button>
            </div>
          )}
          {item.status === "PENDING_PAYMENT" && (
            <button
              type="button"
              disabled={busyId === item.id}
              onClick={() => {
                setActionReason("");
                setPendingAction({ item, action: "reject" });
              }}
            >
              Reject reservation
            </button>
          )}
          {item.status === "CONFIRMED" && (
            <>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() =>
                  updateReservationStatus(item, "SEATED")
                }
              >
                {busyId === item.id
                  ? "Updating…"
                  : "Mark guest seated"}
              </button>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => {
                  setActionReason("");
                  setPendingAction({ item, action: "no-show" });
                }}
              >
                Mark no-show
              </button>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => {
                  setActionReason("");
                  setPendingAction({ item, action: "cancel" });
                }}
              >
                Cancel reservation
              </button>
            </>
          )}
          {item.status === "SEATED" && (
            <button
              type="button"
              disabled={busyId === item.id}
              onClick={() =>
                updateReservationStatus(item, "COMPLETED")
              }
            >
              {busyId === item.id
                ? "Updating…"
                : "Complete dining session"}
            </button>
          )}
        </div></section>}
      </div>
    </>;
  }

  return (
    <ManagerLayout title="Reservation Management">
      <main className="manager-dashboard-content reservation-page">
        <div className="reservation-page-heading">
          <div>
            <span className="reservation-eyebrow">YOUR RESTAURANT, IN SYNC</span>
            <h2>Reservations &amp; Orders</h2>
            <p>
              View reservations, preorders, and kitchen orders together by date
              ·{" "}
              {realtimeStatus === "connected"
                ? "Live updates connected"
                : realtimeStatus === "reconnecting"
                  ? "Reconnecting to live updates…"
                  : realtimeStatus === "disconnected"
                    ? "Live updates disconnected · Refresh to sync"
                    : "Connecting to live updates…"}
            </p>
          </div>
        </div>

        <div className="reservation-toolbar">
          <button
            type="button"
            className="reservation-scan-trigger"
            onClick={() => {
              setScannerOpen(true);
              setScanError("");
            }}
          >
            <QrCode size={16} /> Scan pass
          </button>
          <select
            aria-label="Filter by table"
            value={tableFilter}
            onChange={(event) => setTableFilter(event.target.value)}
          >
            <option value="all">Filter by Table: All</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                Table {table.table_number}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by reservation or order status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(activityStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by party size"
            value={guestFilter}
            onChange={(event) => setGuestFilter(event.target.value)}
          >
            <option value="all">All party sizes</option>
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={String(count)}>
                {count} guests
              </option>
            ))}
            <option value="6+">6+ guests</option>
          </select>
          <select
            aria-label="Sort reservations"
            value={reservationSort}
            onChange={(event) => setReservationSort(event.target.value)}
          >
            <option value="time">Time: earliest first</option>
            <option value="guests">Party size: smallest first</option>
          </select>
          <div className="reservation-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search by reservation code, order code, guest, or item"
              placeholder="Search reservation code, order code, guest…"
            />
          </div>
        </div>

        {error && (
          <div className="reservation-error" role="alert">
            {error}
          </div>
        )}
        {cancellationNotice && (
          <p className="reservation-cancellation-notice" role="status">
            {cancellationNotice}
          </p>
        )}
        <ReservationDateStrip
          month={month}
          selectedDate={selectedDate}
          calendarDays={calendarDays}
          workingDays={workingDays}
          onSelect={selectDate}
          onMonthChange={moveMonth}
          onToday={goToToday}
        />
        <div className="reservation-workspace">
          <aside className="reservation-list-column">
            <header className="reservation-list-summary">
              <div>
                <span className="reservation-eyebrow">DAILY OVERVIEW</span>
                <h3>{isReservationIdLookup ? "Reservation lookup" : "Reservations & spot orders"}</h3>
                <p>{selectedLabel} · {dayGuestCount} {dayGuestCount === 1 ? "guest" : "guests"}</p>
              </div>
              <span className="reservation-activity-total" aria-label={`${reservationTotal} reservations and ${ordersTotal} orders`}>{reservationTotal + ordersTotal}</span>
            </header>
            <div
              ref={reservationListScrollRef}
              className="reservation-list-scroll"
              onScroll={(event) => {
                const element = event.currentTarget;
                if (
                  element.scrollTop + element.clientHeight >=
                    element.scrollHeight - 80 &&
                  !loadingNextPageRef.current &&
                  (items.length < reservationTotal ||
                    orders.length < ordersTotal)
                ) {
                  void loadNextCalendarPage();
                }
              }}
            >
              {calendarLoading ? (
                <LoadingState variant="list" label="Loading this date…" />
              ) : selectedItems.length === 0 &&
                selectedStandaloneOrders.length === 0 ? (
                <div className="reservation-empty">
                  <CalendarDays size={28} />
                  <strong>No reservations or orders on this date</strong>
                  <span>
                    Choose another date or adjust the table or search filters.
                  </span>
                </div>
              ) : (
                <>
                  <section
                    className="reservation-list-section"
                    aria-labelledby="reservation-list-section-title"
                  >
                    <h4
                      id="reservation-list-section-title"
                      className="reservation-list-section-title"
                    >
                      <CalendarDays size={16} />
                      Reservations
                      <span>{visibleReservations.length}</span>
                    </h4>
                    {visibleReservations.length === 0 ? (
                      <p className="reservation-list-section-empty">
                        No reservations on this date.
                      </p>
                    ) : (
                      visibleReservations.map(
                        ({ item, selectionId, active }, index) => (
                          <Fragment key={selectionId}>
                            {(index === 0 ||
                              active !==
                                visibleReservations[index - 1].active) && (
                              <h5 className="reservation-list-group-title">
                                {active
                                  ? "Upcoming & active"
                                  : "Completed & cancelled"}
                              </h5>
                            )}
                            <article
                              className={`reservation-guest-card${selectedReservation?.id === item.id ? " expanded" : ""}`}
                            >
                              <button
                                type="button"
                                className="reservation-card-select"
                                aria-label={`View reservation ${reservationCode(item)} for ${item.customer_name}`}
                                aria-pressed={
                                  selectedReservation?.id === item.id
                                }
                                aria-controls="reservation-detail-panel"
                                onClick={() =>
                                  selectActivity(selectionId)
                                }
                              >
                                <div className="reservation-card-tags">
                                  <span className="reservation-card-code">
                                    <small>Reservation code</small>
                                    <strong>
                                      {reservationCode(item)}
                                    </strong>
                                  </span>
                                  <span>
                                    {item.fulfillment_type === "PREORDER"
                                      ? "Preorder"
                                      : "Table booking"}
                                  </span>
                                </div>
                                <div className="reservation-guest-top">
                                  <ReservationAvatar
                                    name={item.customer_name}
                                    url={item.customer_avatar_url}
                                  />
                                  <span className="reservation-guest-name">
                                    <strong>{item.customer_name}</strong>
                                    <span>
                                      {item.customer_email ||
                                        "Restaurant guest"}
                                    </span>
                                  </span>
                                  <ChevronRight
                                    size={17}
                                    className="reservation-card-chevron"
                                  />
                                </div>
                                <div className="reservation-guest-meta">
                                  <span>
                                    <Clock3 size={14} />
                                    {shortTime(item.start_time)}
                                  </span>
                                  <span>
                                    <Users size={14} />
                                    {item.number_of_guests}{" "}
                                    {item.number_of_guests === 1
                                      ? "guest"
                                      : "guests"}
                                  </span>
                                  <span>
                                    <Table2 size={14} />
                                    {item.tables
                                      .map(
                                        (table) =>
                                          `Table ${table.table_number}`,
                                      )
                                      .join(", ")}
                                  </span>
                                </div>
                                <div
                                  className={`reservation-card-status ${statusClass[item.status] || "pending"}`}
                                >
                                  <span>
                                    {statusLabel[item.status] || item.status}
                                  </span>
                                  <small>
                                    {selectedReservation?.id === item.id
                                      ? "Viewing details"
                                      : "View reservation"}
                                  </small>
                                </div>
                              </button>
                            </article>
                          </Fragment>
                        ),
                      )
                    )}
                  </section>

                  <section
                    className="reservation-list-section"
                    aria-labelledby="spot-order-list-section-title"
                  >
                    <h4
                      id="spot-order-list-section-title"
                      className="reservation-list-section-title"
                    >
                      <Utensils size={16} />
                      Spot orders
                      <span>{visibleSpotOrders.length}</span>
                    </h4>
                    {visibleSpotOrders.length === 0 ? (
                      <p className="reservation-list-section-empty">
                        No spot orders on this date.
                      </p>
                    ) : (
                      visibleSpotOrders.map(
                        ({ item, selectionId, active }, index) => (
                          <Fragment key={selectionId}>
                            {(index === 0 ||
                              active !==
                                visibleSpotOrders[index - 1].active) && (
                              <h5 className="reservation-list-group-title">
                                {active
                                  ? "Upcoming & active"
                                  : "Completed & cancelled"}
                              </h5>
                            )}
                            <ManagerCalendarOrderCard
                              order={item}
                              selected={selectedOrder?.id === item.id}
                              onSelect={() =>
                                selectActivity(selectionId)
                              }
                            />
                          </Fragment>
                        ),
                      )
                    )}
                  </section>
                  {loadingNextPage && (
                    <div
                      className="reservation-list-skeleton"
                      aria-label="Loading more reservations and orders"
                      aria-live="polite"
                    >
                      <div className="reservation-skeleton-card">
                        <span />
                        <div>
                          <i />
                          <i />
                        </div>
                      </div>
                      <div className="reservation-skeleton-card">
                        <span />
                        <div>
                          <i />
                          <i />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
          <section id="reservation-detail-panel" className="reservation-detail-panel" aria-label={selectedOrder ? "Order details" : "Reservation details"} aria-busy={calendarLoading}>
            {calendarLoading ? <LoadingState variant="cards" label="Loading reservation and order details…" /> : selectedOrder ? <ManagerCalendarOrderDetails order={selectedOrder} dateLabel={selectedLabel} /> : selectedReservation ? renderReservationDetails(selectedReservation) : (
              <div className="reservation-detail-empty">
                <span><Utensils size={30} /></span>
                <h3>Your service, at a glance</h3>
                <p>Choose a date with reservations or orders to view guest information, payments, and food orders here.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      {pendingAction &&
        ["cancel", "reject", "no-show"].includes(pendingAction.action) && (
          <ConfirmActionDialog
            action="cancel"
            resourceType="reservation"
            resourceName={pendingAction.item.customer_name}
            title={
              pendingAction.action === "reject"
                ? "Reject this reservation?"
                : pendingAction.action === "no-show"
                  ? "Mark guest as a no-show?"
                  : "Cancel this reservation?"
            }
            description={
              pendingAction.action === "cancel"
                ? `This will cancel ${pendingAction.item.customer_name}'s reservation and refund any paid reservation fee and preorder amount to their DineBook wallet.`
                : pendingAction.action === "no-show"
                  ? `This will mark ${pendingAction.item.customer_name}'s reservation as a no-show and prevent them from creating another reservation for 30 minutes.`
                  : `This will mark ${pendingAction.item.customer_name}'s reservation as rejected.`
            }
            confirmLabel={
              pendingAction.action === "reject"
                ? "Reject reservation"
                : pendingAction.action === "no-show"
                  ? "Mark no-show"
                  : "Cancel reservation"
            }
            showReason
            reasonLabel="Reason (optional)"
            reason={actionReason}
            onReasonChange={setActionReason}
            busy={busyId === pendingAction.item.id}
            onCancel={() => {
              if (busyId !== pendingAction.item.id) setPendingAction(null);
            }}
            onConfirm={async (reason) => {
              let succeeded = false;
              if (pendingAction.action === "cancel")
                succeeded = await update(pendingAction.item, "cancel", reason);
              else if (pendingAction.action === "reject")
                succeeded = await updateReservationStatus(
                  pendingAction.item,
                  "REJECTED",
                  reason,
                );
              else
                succeeded = await updateReservationStatus(
                  pendingAction.item,
                  "NO_SHOW",
                  reason,
                );
              if (succeeded) setPendingAction(null);
            }}
          />
        )}
      {pendingAction?.action === "confirm-payment" && (
        <div
          className="manager-reservation-confirm-backdrop"
          role="presentation"
        >
          <section
            className="manager-reservation-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="manager-reservation-confirm-title"
            aria-describedby="manager-reservation-confirm-description"
          >
            <button
              type="button"
              className="manager-reservation-confirm-close"
              onClick={() => setPendingAction(null)}
              disabled={busyId === pendingAction.item.id}
              aria-label="Close confirmation"
            >
              <X size={18} />
            </button>
            <div
              className={`manager-reservation-confirm-icon ${["cancel", "reject", "no-show"].includes(pendingAction.action) ? "danger" : "success"}`}
            >
              <AlertTriangle size={21} />
            </div>
            <h3 id="manager-reservation-confirm-title">
              {pendingAction.action === "cancel"
                ? "Cancel this reservation?"
                : pendingAction.action === "reject"
                  ? "Reject this reservation?"
                  : pendingAction.action === "no-show"
                    ? "Mark guest as a no-show?"
                    : "Confirm payment received?"}
            </h3>
            <p id="manager-reservation-confirm-description">
              {["cancel", "reject", "no-show"].includes(pendingAction.action)
                ? `This will mark ${pendingAction.item.customer_name}'s reservation as ${pendingAction.action === "no-show" ? "a no-show" : pendingAction.action === "reject" ? "rejected" : "cancelled"}. Any eligible refund follows the existing wallet refund policy.`
                : `This records ₹${(Number(pendingAction.item.fee_amount) + Number(pendingAction.item.preorder_total || 0)).toFixed(2)} received at the desk and confirms the booking for ${pendingAction.item.customer_name}.`}
            </p>
            {["cancel", "reject", "no-show"].includes(pendingAction.action) && (
              <label className="manager-reservation-action-reason">
                Reason (optional)
                <textarea
                  value={actionReason}
                  maxLength={500}
                  onChange={(event) => setActionReason(event.target.value)}
                  rows={3}
                  placeholder="Add a note for the reservation record"
                />
              </label>
            )}
            <div className="manager-reservation-confirm-actions">
              <button
                type="button"
                className="confirm-dismiss"
                onClick={() => setPendingAction(null)}
                disabled={busyId === pendingAction.item.id}
              >
                Go back
              </button>
              <button
                type="button"
                className={
                  ["cancel", "reject", "no-show"].includes(pendingAction.action)
                    ? "confirm-danger"
                    : "confirm-success"
                }
                onClick={async () => {
                  let succeeded = false;
                  if (pendingAction.action === "cancel")
                    succeeded = await update(
                      pendingAction.item,
                      "cancel",
                      actionReason,
                    );
                  else if (pendingAction.action === "reject")
                    succeeded = await updateReservationStatus(
                      pendingAction.item,
                      "REJECTED",
                      actionReason,
                    );
                  else if (pendingAction.action === "no-show")
                    succeeded = await updateReservationStatus(
                      pendingAction.item,
                      "NO_SHOW",
                      actionReason,
                    );
                  else
                    succeeded = await update(
                      pendingAction.item,
                      pendingAction.action,
                    );
                  if (succeeded) setPendingAction(null);
                }}
                disabled={busyId === pendingAction.item.id}
              >
                {busyId === pendingAction.item.id
                  ? "Processing…"
                  : pendingAction.action === "cancel"
                    ? "Cancel reservation"
                    : pendingAction.action === "reject"
                      ? "Reject reservation"
                      : pendingAction.action === "no-show"
                        ? "Mark no-show"
                        : "Confirm payment"}
              </button>
            </div>
          </section>
        </div>
      )}
      {scannerOpen && (
        <div
          className="manager-reservation-confirm-backdrop"
          role="presentation"
        >
          <section
            className="manager-reservation-confirm reservation-pass-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-pass-title"
            aria-describedby="reservation-pass-description"
          >
            <button
              type="button"
              className="manager-reservation-confirm-close"
              onClick={() => setScannerOpen(false)}
              aria-label="Close scanner"
            >
              <X size={18} />
            </button>
            <div className="manager-reservation-confirm-icon success">
              <QrCode size={21} />
            </div>
            <h3 id="reservation-pass-title">Verify reservation pass</h3>
            <p id="reservation-pass-description">
              Scan the customer’s QR pass, upload a pass image, or enter its
              reservation ID.
            </p>
            <div className="reservation-camera-stage">
              {!cameraActive && (
                <div className="reservation-camera-placeholder">
                  <QrCode size={40} aria-hidden="true" />
                  <strong>Scan a reservation QR code</strong>
                  <span>
                    Start the camera or upload a clear image of the pass.
                  </span>
                </div>
              )}
              <video
                ref={videoRef}
                className={`reservation-camera-preview${cameraActive ? " active" : ""}`}
                muted
                playsInline
                aria-label="Reservation pass camera preview"
              />
            </div>
            <div className="reservation-pass-controls">
              <button
                type="button"
                disabled={cameraActive || scanBusy}
                onClick={async () => {
                  setScanError("");
                  scanActiveRef.current = true;
                  try {
                    const detector =
                      "BarcodeDetector" in window
                        ? new window.BarcodeDetector({ formats: ["qr_code"] })
                        : null;
                    const stream = await navigator.mediaDevices.getUserMedia({
                      video: { facingMode: "environment" },
                    });
                    if (!scanActiveRef.current || !videoRef.current) {
                      stream.getTracks().forEach((track) => track.stop());
                      return;
                    }
                    cameraRef.current = stream;
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setCameraActive(true);
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d", {
                      willReadFrequently: true,
                    });
                    const scanFrame = async () => {
                      if (!scanActiveRef.current) return;
                      try {
                        let value = "";
                        if (detector)
                          value =
                            (await detector.detect(videoRef.current))[0]
                              ?.rawValue || "";
                        else if (videoRef.current.videoWidth) {
                          canvas.width = videoRef.current.videoWidth;
                          canvas.height = videoRef.current.videoHeight;
                          context.drawImage(
                            videoRef.current,
                            0,
                            0,
                            canvas.width,
                            canvas.height,
                          );
                          value =
                            jsQR(
                              context.getImageData(
                                0,
                                0,
                                canvas.width,
                                canvas.height,
                              ).data,
                              canvas.width,
                              canvas.height,
                              { inversionAttempts: "attemptBoth" },
                            )?.data || "";
                        }
                        if (value) {
                          scanActiveRef.current = false;
                          stream.getTracks().forEach((track) => track.stop());
                          cameraRef.current = null;
                          setCameraActive(false);
                          verifyPass(value);
                          return;
                        }
                      } catch {
                        /* Wait for the next camera frame. */
                      }
                      window.setTimeout(scanFrame, 450);
                    };
                    scanFrame();
                  } catch (e) {
                    scanActiveRef.current = false;
                    cameraRef.current
                      ?.getTracks()
                      .forEach((track) => track.stop());
                    cameraRef.current = null;
                    setCameraActive(false);
                    setScanError(
                      e.message ||
                        "Camera access failed. Upload the pass image or enter its ID.",
                    );
                  }
                }}
              >
                <QrCode size={16} />
                {cameraActive ? "Camera active" : "Use camera"}
              </button>
              <label>
                <Upload size={16} /> Upload pass
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const bitmap = await createImageBitmap(file);
                      const canvas = document.createElement("canvas");
                      canvas.width = bitmap.width;
                      canvas.height = bitmap.height;
                      const context = canvas.getContext("2d", {
                        willReadFrequently: true,
                      });
                      context.drawImage(bitmap, 0, 0);
                      const code = jsQR(
                        context.getImageData(0, 0, canvas.width, canvas.height)
                          .data,
                        canvas.width,
                        canvas.height,
                        { inversionAttempts: "attemptBoth" },
                      );
                      if (!code?.data)
                        throw new Error(
                          "No reservation QR code was found in that image.",
                        );
                      await verifyPass(code.data);
                    } catch (e) {
                      setScanError(e.message);
                    } finally {
                      event.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
            <div className="reservation-pass-divider">
              <span>Or enter the reservation code or ID</span>
            </div>
            <CustomForm
              onSubmit={(event) => {
                event.preventDefault();
                verifyPass(scanValue);
              }}
              className="reservation-pass-id-form"
            >
              <input
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                placeholder="Reservation code or ID"
                aria-label="Reservation code or ID"
              />
              <button type="submit" disabled={scanBusy || !scanValue.trim()}>
                {scanBusy ? "Verifying…" : "Verify ID"}
              </button>
            </CustomForm>
            {scanError && (
              <div className="reservation-error" role="alert">
                {scanError}
              </div>
            )}
          </section>
        </div>
      )}
      {foodReservation && (
        <div
          className="manager-reservation-confirm-backdrop"
          role="presentation"
        >
          <section
            className="manager-reservation-confirm reservation-food-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-food-title"
          >
            <button
              type="button"
              className="manager-reservation-confirm-close"
              onClick={() => setFoodReservation(null)}
              aria-label="Close food editor"
            >
              <X size={18} />
            </button>
            <h3 id="reservation-food-title">Add preorder food</h3>
            <p>
              Add dishes to this reservation before confirming. The updated
              total will appear in reservation details.
            </p>
            {deskOrderSearchLoading && menu.length === 0 && !deskOrderSearch.trim() ? (
              <LoadingState variant="menu" label="Loading menu…" />
            ) : (
              <CustomForm onSubmit={addFood} className="reservation-food-form">
                <label>
                  Menu item
                  <select
                    value={variantId}
                    onChange={(event) => setVariantId(event.target.value)}
                    required
                  >
                    <option value="">Choose a dish</option>
                    {availableVariants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.foodName} · {variant.name} — ₹
                        {Number(variant.price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={foodQuantity}
                    onChange={(event) => setFoodQuantity(event.target.value)}
                    required
                  />
                </label>
                <div className="manager-reservation-confirm-actions">
                  <button
                    type="button"
                    className="confirm-dismiss"
                    onClick={() => setFoodReservation(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="confirm-success"
                    disabled={!variantId || busyId === foodReservation.id}
                  >
                    {busyId === foodReservation.id
                      ? "Adding…"
                      : "Add to reservation"}
                  </button>
                </div>
              </CustomForm>
            )}
          </section>
        </div>
      )}
      {pendingOrderRemoval && (
        <ConfirmActionDialog
          action="cancel"
          resourceType="manager-added food order"
          resourceName={`Order for ${pendingOrderRemoval.order.customer_name || "this guest"}`}
          title="Remove this order from the kitchen?"
          description="The kitchen will no longer prepare this order. Its record will stay in the visit history."
          confirmLabel="Remove order"
          busy={busyId === pendingOrderRemoval.order.id}
          showReason={false}
          onCancel={() => {
            if (busyId !== pendingOrderRemoval.order.id)
              setPendingOrderRemoval(null);
          }}
          onConfirm={removeManagerAddedOrder}
        />
      )}
      {deskOrderReservation && (
        <div
          className="manager-reservation-confirm-backdrop"
          role="presentation"
        >
          <section
            className="manager-reservation-confirm reservation-food-dialog desk-order-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="desk-order-title"
          >
            <button
              type="button"
              className="manager-reservation-confirm-close"
              onClick={() => setDeskOrderReservation(null)}
              aria-label="Close desk order"
            >
              <X size={18} />
            </button>
            <h3 id="desk-order-title">Add food order</h3>
            <p>
              Choose the dishes and quantities, then review before sending the
              order to the kitchen. Payment will be due at the desk for{" "}
              {deskOrderReservation.customer_name}.
            </p>
            <CustomForm
                onSubmit={createDeskOrder}
                className="reservation-food-form desk-order-form"
              >
                <div className="desk-order-picker-heading">
                  <div><h4>Choose dishes</h4><p>Select an item to add it. Eligible automatic offers are calculated when the order is sent.</p></div>
                  <span aria-live="polite">{deskOrderItemCount} {deskOrderItemCount === 1 ? "item" : "items"} · Subtotal ₹{deskOrderTotal.toFixed(2)}</span>
                  <label className="desk-order-search">
                    <Search size={16} aria-hidden="true" />
                    <input aria-label="Search dishes" value={deskOrderSearch} onChange={(event) => setDeskOrderSearch(event.target.value)} placeholder="Search dishes, variants, or descriptions" />
                    {deskOrderSearchLoading && <span className="desk-order-search-status" role="status">Searching…</span>}
                    {deskOrderSearch && <button type="button" className="desk-order-search-clear" onClick={() => setDeskOrderSearch("")} aria-label="Clear dish search"><X size={15} /></button>}
                  </label>
                </div>
                <div className="desk-order-menu" role="list" aria-label="Available dishes">
                  {visibleDeskOrderVariants.length === 0 ? <p className="desk-order-menu-empty" role="status">{menuBusy || deskOrderSearchLoading ? deskOrderSearch.trim() ? "Searching dishes…" : "Loading menu…" : deskOrderSearch.trim() ? `No available dishes match “${deskOrderSearch.trim()}”.` : "No available menu items right now."}</p> : visibleDeskOrderVariants.map((variant) => {
                    const line = deskOrderLines.find((entry) => entry.variant_id === variant.id);
                    const quantity = Number(line?.quantity || 0);
                    const offers = displayOffersForFood(deskOrderOffers, {
                      id: variant.foodId,
                      category_id: variant.categoryId,
                      is_available: true,
                      variants: [variant],
                    }, variant.categoryId);
                    return <article className={`desk-order-dish${quantity ? " is-selected" : ""}`} role="listitem" key={variant.id}>
                      <div className="desk-order-dish-media" aria-hidden="true"><Utensils size={22} />
                        {variant.image_url && <img src={variant.image_url} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
                      </div>
                      {offers.length > 0 && <div className="desk-order-dish-offers" aria-label={`Offers for ${variant.foodName}`}>
                        {offers.map((offer) => <span key={offer.id}><Tag size={12} aria-hidden="true" />{offerSavingLabel(offer)}{isCoupon(offer) && " · Coupon"}</span>)}
                      </div>}
                      <div className="desk-order-dish-copy">
                        <h5>{variant.foodName}</h5>
                        {variant.name && <span>{variant.name}</span>}
                        {variant.foodDescription && <p>{variant.foodDescription}</p>}
                        <strong>₹{Number(variant.price).toFixed(2)}</strong>
                      </div>
                      {quantity ? <div className="desk-order-quantity" aria-label={`${variant.foodName} quantity`}>
                        <button type="button" onClick={() => setDeskOrderQuantity(variant.id, quantity - 1)} aria-label={`Remove one ${variant.foodName}`}><Minus size={15} /></button>
                        <output aria-label={`${quantity} ${variant.foodName}`}>{quantity}</output>
                        <button type="button" onClick={() => setDeskOrderQuantity(variant.id, Math.min(99, quantity + 1))} disabled={quantity >= 99} aria-label={`Add one ${variant.foodName}`}><Plus size={15} /></button>
                      </div> : <button type="button" className="desk-order-select" disabled={deskOrderLines.length >= 50} onClick={() => setDeskOrderQuantity(variant.id, 1)}><Plus size={15} /> Add</button>}
                    </article>;
                  })}
                </div>
                <div className="manager-reservation-confirm-actions">
                  <button
                    type="button"
                    className="confirm-dismiss"
                    onClick={() => setDeskOrderReservation(null)}
                  >
                    Go back
                  </button>
                  <button
                    type="submit"
                    className="confirm-success"
                    disabled={
                      deskOrderLines.length === 0 || deskOrderLines.some(
                        (line) =>
                          !line.variant_id ||
                          !Number.isInteger(Number(line.quantity)) ||
                          Number(line.quantity) < 1 ||
                          Number(line.quantity) > 99,
                      ) ||
                      consolidateDeskOrderLines(deskOrderLines).some(
                        (line) => line.quantity > 99,
                      ) ||
                      busyId === deskOrderReservation.id
                    }
                  >
                    {busyId === deskOrderReservation.id
                      ? "Sending…"
                      : "Send order to kitchen"}
                  </button>
                </div>
              </CustomForm>
          </section>
        </div>
      )}
    </ManagerLayout>
  );
}
