import { Utensils } from "lucide-react";
import "../../assets/css/ManagerOrderItems.css";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function ManagerOrderItems({ items = [], title }) {
  const count = items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  return (
    <div className="manager-order-item-cards">
      {title && (
        <div className="manager-order-items-heading">
          <h3>{title}</h3>
          <span>{count} {count === 1 ? "item" : "items"}</span>
        </div>
      )}
      {items.length ? (
        <ul className="manager-order-items-list">
          {items.map((item, index) => (
            <li className="manager-order-item" key={`${item.variant_id || item.food_name}-${index}`}>
              <span className="manager-order-item-media" aria-hidden="true">
                <Utensils size={20} />
                {item.image_url && <img key={item.image_url} src={item.image_url} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
              </span>
              <div className="manager-order-item-description">
                <strong>{item.food_name || "Menu item"}</strong>
                {item.variant_name && <span>{item.variant_name}</span>}
                {item.description && <small>{item.description}</small>}
                {item.unit_price != null && <small>{money(item.unit_price)} each</small>}
              </div>
              <div className="manager-order-item-summary">
                <span className="manager-order-item-quantity" aria-label={`Quantity: ${item.quantity}`}>×{item.quantity}</span>
                {item.line_total != null && <strong>{money(item.line_total)}</strong>}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="manager-order-items-empty">No item details are available.</p>}
    </div>
  );
}
