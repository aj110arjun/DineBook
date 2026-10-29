import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, CookingPot, PackageCheck, Search } from "lucide-react";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import "./CustomerOrderTracker.css";

const steps = [
  { status: "PLACED", label: "Order placed", icon: Clock3 },
  { status: "ACCEPTED", label: "Accepted", icon: Check },
  { status: "PREPARING", label: "Preparing", icon: CookingPot },
  { status: "READY", label: "Ready", icon: PackageCheck },
];
const activeStatuses = new Set(steps.map(({ status }) => status));

export default function CustomerOrderTracker({ enabled }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const loadOrders = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await requestJson("/api/customer/orders");
      setOrders(Array.isArray(result) ? result : []);
      setError("");
    } catch (reason) {
      setError(reason.message || "Unable to load your active orders.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      setLoading(true);
      loadOrders();
    }
  }, [enabled, loadOrders]);

  useRealtimeEvents({ enabled, onEvent: loadOrders, onReconnect: loadOrders });

  const activeOrders = useMemo(
    () =>
      orders
        .filter((order) => activeStatuses.has(order.status))
        .sort(
          (left, right) =>
            Date.parse(right.created_at || 0) -
            Date.parse(left.created_at || 0),
        ),
    [orders],
  );
  const visibleOrders = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/^#/, "");
    if (!needle) return activeOrders;
    return orders
      .filter((order) => {
        const searchable = [
          order.id,
          order.restaurant_name,
          ...(order.items || []).map((item) => item.food_name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(needle);
      })
      .sort((left, right) => {
        const leftId = left.id.toLowerCase();
        const rightId = right.id.toLowerCase();
        const leftRank = leftId.startsWith(needle)
          ? 0
          : leftId.includes(needle)
            ? 1
            : 2;
        const rightRank = rightId.startsWith(needle)
          ? 0
          : rightId.includes(needle)
            ? 1
            : 2;
        if (leftRank !== rightRank) return leftRank - rightRank;
        const activeDelta =
          Number(activeStatuses.has(right.status)) -
          Number(activeStatuses.has(left.status));
        return (
          activeDelta ||
          Date.parse(right.created_at || 0) - Date.parse(left.created_at || 0)
        );
      });
  }, [activeOrders, orders, query]);

  if (!enabled || (!loading && !error && orders.length === 0)) return null;

  return (
    <section
      className="customer-order-tracker"
      aria-labelledby="customer-order-tracker-title"
      aria-live="polite"
    >
      <div className="customer-order-tracker-heading">
        <div>
          <span>YOUR FOOD ORDERS</span>
          <h2 id="customer-order-tracker-title">Order progress</h2>
        </div>
        <button type="button" onClick={loadOrders} disabled={loading}>
          {loading ? "Updating…" : "Refresh"}
        </button>
      </div>
      <label className="customer-order-search">
        <Search size={17} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order ID, restaurant, or dish"
          aria-label="Search your orders"
        />
      </label>
      {loading && activeOrders.length === 0 ? (
        <p className="customer-order-tracker-message">
          Checking for active orders…
        </p>
      ) : error ? (
        <p className="customer-order-tracker-message is-error" role="alert">
          {error}
        </p>
      ) : visibleOrders.length === 0 ? (
        <p className="customer-order-tracker-message">
          {query
            ? "No orders match that search."
            : "You have no active food orders right now."}
        </p>
      ) : (
        visibleOrders.map((order) => {
          const currentIndex =
            order.status === "COMPLETED"
              ? steps.length - 1
              : steps.findIndex(({ status }) => status === order.status);
          const isActive = activeStatuses.has(order.status);
          const terminalLabel = order.status
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
          return (
            <article className="customer-order-progress-card" key={order.id}>
              <header>
                <div>
                  <span>ORDER #{order.id.slice(0, 8).toUpperCase()}</span>
                  <h3>{order.restaurant_name || "Restaurant order"}</h3>
                </div>
                <strong
                  className={`customer-order-current-status status-${order.status.toLowerCase()}`}
                >
                  {steps[currentIndex]?.label || terminalLabel}
                </strong>
              </header>
              <p className="customer-order-items-summary">
                {(order.items || [])
                  .map((item) => `${item.quantity} × ${item.food_name}`)
                  .join(" · ")}
              </p>
              {isActive || order.status === "COMPLETED" ? (
                <ol
                  className="customer-order-status-steps"
                  aria-label={`Order status: ${steps[currentIndex]?.label}`}
                >
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const completed =
                      index < currentIndex || order.status === "COMPLETED";
                    const current = index === currentIndex && isActive;
                    return (
                      <li
                        key={step.status}
                        className={`${completed ? "is-complete" : ""}${current ? " is-current" : ""}`}
                        aria-current={current ? "step" : undefined}
                      >
                        <span className="customer-order-step-marker">
                          {completed ? <Check size={15} /> : <Icon size={15} />}
                        </span>
                        <span>{step.label}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="customer-order-terminal-note">
                  This order is {terminalLabel.toLowerCase()}.
                </p>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
