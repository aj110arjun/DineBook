import CustomForm from "../../components/forms/CustomForm.jsx";
import { useEffect, useMemo, useState } from "react";
import { Printer, Plus, Trash2 } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import { requestJson } from "../../lib/authApi.js";
import "./ManagerSpotOrderPage.css";

export default function ManagerSpotOrderPage() {
  const [floors, setFloors] = useState([]);
  const [menu, setMenu] = useState([]);
  const [guestName, setGuestName] = useState("");
  const [tableId, setTableId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState([]);
  const [order, setOrder] = useState(null);
  const [offers, setOffers] = useState([]);
  const [offerCode, setOfferCode] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      requestJson("/api/manager/floors"),
      requestJson("/api/manager/menu"),
      requestJson("/api/manager/orders/offers?status=ACTIVE&limit=200"),
    ])
      .then(([floorData, menuData, offerData]) => {
        setFloors(floorData);
        setMenu(menuData);
        setOffers(offerData.items || []);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const tables = useMemo(
    () =>
      floors.flatMap((floor) =>
        (floor.tables || [])
          .filter((table) => table.status === "available")
          .map((table) => ({
            ...table,
            floorName: floor.floor_name || floor.name,
          })),
      ),
    [floors],
  );
  const variants = useMemo(
    () =>
      menu
        .filter((category) => category.is_active)
        .flatMap((category) =>
          (category.foods || [])
            .filter((food) => food.is_available)
            .flatMap((food) =>
              (food.variants || [])
                .filter((variant) => variant.is_available)
                .map((variant) => ({ ...variant, foodName: food.name })),
            ),
        ),
    [menu],
  );
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const checkoutKey = JSON.stringify({
    items: lines.map(({ variant_id, quantity }) => ({ variant_id, quantity })),
    offer_code: offerCode || null,
  });
  const checkout = quote?.key === checkoutKey ? quote.data : null;

  useEffect(() => {
    let active = true;
    setQuoteError("");
    setQuote(null);
    if (!JSON.parse(checkoutKey).items.length || order) return;
    requestJson("/api/manager/orders/spot/preview", {
      method: "POST",
      body: checkoutKey,
    })
      .then((data) => {
        if (active) setQuote({ key: checkoutKey, data });
      })
      .catch((reason) => {
        if (active) setQuoteError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [checkoutKey, order]);

  function addLine() {
    if (
      !selectedVariant ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1 ||
      Number(quantity) > 99
    )
      return;
    const existing = lines.find(
      (line) => line.variant_id === selectedVariant.id,
    );
    if (existing && existing.quantity + Number(quantity) > 99) return;
    setLines((current) =>
      existing
        ? current.map((line) =>
            line.variant_id === selectedVariant.id
              ? { ...line, quantity: line.quantity + Number(quantity) }
              : line,
          )
        : [
            ...current,
            {
              variant_id: selectedVariant.id,
              food_name: selectedVariant.foodName,
              variant_name: selectedVariant.name,
              unit_price: Number(selectedVariant.price),
              quantity: Number(quantity),
            },
          ],
    );
    setVariantId("");
    setQuantity(1);
  }

  async function createOrder(event) {
    event.preventDefault();
    if (!tableId || !guestName.trim() || !lines.length || !checkout) return;
    setSaving(true);
    setError("");
    try {
      const created = await requestJson("/api/manager/orders/spot", {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: window.crypto.randomUUID(),
          table_id: tableId,
          guest_name: guestName.trim(),
          offer_code: offerCode || null,
          items: lines.map(({ variant_id, quantity: count }) => ({
            variant_id,
            quantity: count,
          })),
        }),
      });
      setOrder(created);
      setFloors((current) =>
        current.map((floor) => ({
          ...floor,
          tables: floor.tables.map((table) =>
            table.id === tableId ? { ...table, status: "occupied" } : table,
          ),
        })),
      );
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  function startAnother() {
    setOrder(null);
    setGuestName("");
    setTableId("");
    setLines([]);
    setOfferCode("");
    setQuote(null);
  }

  return (
    <ManagerLayout title="Spot Order">
      <div className="spot-order-page">
        <header className="spot-order-heading">
          <div>
            <span>WALK-IN GUESTS</span>
            <h2>Create a spot order</h2>
            <p>
              Assign an available table, add the guest’s order, and print their
              bill.
            </p>
          </div>
        </header>
        {error && (
          <p className="spot-order-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p>Loading tables and menu…</p>
        ) : order ? (
          <section
            className="spot-order-receipt"
            aria-label="Spot order receipt"
          >
            <div className="spot-order-receipt-top">
              <div>
                <span>DINEBOOK · {order.restaurant_name}</span>
                <h2>Guest bill</h2>
                <p>
                  Order #{order.id.slice(0, 8).toUpperCase()} · Table{" "}
                  {order.tables?.[0]?.table_number || "—"}
                </p>
                <p>{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => window.print()}>
                <Printer size={17} />
                Print bill
              </button>
            </div>
            <p className="spot-order-receipt-guest">
              Guest: <strong>{order.customer_name}</strong>
            </p>
            <ul>
              {order.items.map((item) => (
                <li key={item.variant_id}>
                  <span>
                    {item.quantity} × {item.food_name} · {item.variant_name}
                  </span>
                  <strong>₹{Number(item.line_total).toFixed(2)}</strong>
                </li>
              ))}
            </ul>
            <div className="spot-order-breakdown">
              <div>
                <span>Subtotal</span>
                <strong>₹{Number(order.subtotal).toFixed(2)}</strong>
              </div>
              {order.offer_code && (
                <div>
                  <span>Offer · {order.offer_code}</span>
                  <strong>−₹{Number(order.discount_amount).toFixed(2)}</strong>
                </div>
              )}
              <div>
                <span>GST ({Number(order.tax_percent)}%)</span>
                <strong>₹{Number(order.tax_amount).toFixed(2)}</strong>
              </div>
            </div>
            <div className="spot-order-receipt-total">
              <span>Total due</span>
              <strong>₹{Number(order.total).toFixed(2)}</strong>
            </div>
            <p className="spot-order-payment-note">
              Payment: Pay at restaurant · {order.payment_status}
            </p>
            <button
              type="button"
              className="spot-order-new"
              onClick={startAnother}
            >
              Create another spot order
            </button>
          </section>
        ) : (
          <CustomForm className="spot-order-form" onSubmit={createOrder}>
            <label>
              Guest name
              <input
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                required
                maxLength={120}
                placeholder="Name for the bill"
              />
            </label>
            <label>
              Available table
              <select
                value={tableId}
                onChange={(event) => setTableId(event.target.value)}
                required
              >
                <option value="">Choose a table</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.floorName} · Table {table.table_number} ·{" "}
                    {table.capacity} seats
                  </option>
                ))}
              </select>
            </label>
            {!tables.length && (
              <p className="spot-order-empty">
                There are no available tables. Update a table’s status or finish
                a current visit first.
              </p>
            )}
            <section className="spot-order-items">
              <h3>Order items</h3>
              <div className="spot-order-add-row">
                <label>
                  Menu item
                  <select
                    value={variantId}
                    onChange={(event) => setVariantId(event.target.value)}
                  >
                    <option value="">Choose an item</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.foodName} · {variant.name} — ₹
                        {Number(variant.price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Qty
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={addLine}
                  disabled={!selectedVariant}
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
              {lines.length > 0 && (
                <ul>
                  {lines.map((line) => (
                    <li key={line.variant_id}>
                      <span>
                        {line.quantity} × {line.food_name} · {line.variant_name}
                      </span>
                      <strong>
                        ₹{(line.unit_price * line.quantity).toFixed(2)}
                      </strong>
                      <button
                        type="button"
                        aria-label={`Remove ${line.food_name}`}
                        onClick={() =>
                          setLines((current) =>
                            current.filter(
                              (item) => item.variant_id !== line.variant_id,
                            ),
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="spot-order-offer">
                Offer
                <select
                  value={offerCode}
                  onChange={(event) => setOfferCode(event.target.value)}
                >
                  <option value="">No offer</option>
                  {offers.map((offer) => (
                    <option
                      key={offer.id}
                      value={offer.code}
                      disabled={offer.per_customer_limit != null}
                    >
                      {offer.code} · {offer.title}
                      {offer.per_customer_limit != null
                        ? " (customer account required)"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              {quoteError && (
                <p className="spot-order-error" role="alert">
                  {quoteError}
                </p>
              )}
              {lines.length > 0 && !checkout && !quoteError && (
                <p role="status">Calculating checkout…</p>
              )}
              {checkout && (
                <div className="spot-order-breakdown" aria-live="polite">
                  <div>
                    <span>Subtotal</span>
                    <strong>₹{Number(checkout.subtotal).toFixed(2)}</strong>
                  </div>
                  {checkout.offer_code && (
                    <div>
                      <span>Offer · {checkout.offer_code}</span>
                      <strong>
                        −₹{Number(checkout.discount_amount).toFixed(2)}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span>GST ({Number(checkout.tax_percent)}%)</span>
                    <strong>₹{Number(checkout.tax_amount).toFixed(2)}</strong>
                  </div>
                  <div className="spot-order-total">
                    <span>Bill total</span>
                    <strong>₹{Number(checkout.total).toFixed(2)}</strong>
                  </div>
                </div>
              )}
            </section>
            <button
              className="spot-order-submit"
              type="submit"
              disabled={saving || !tables.length || !lines.length || !checkout}
            >
              {saving
                ? "Sending to Kitchen..."
                : "Create order & send to kitchen"}
            </button>
          </CustomForm>
        )}
      </div>
    </ManagerLayout>
  );
}
