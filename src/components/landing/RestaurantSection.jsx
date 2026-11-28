import useLoadingPhase from "../../hooks/useLoadingPhase.js";
import { ArrowRight, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import RevealOnScroll from "./RevealOnScroll.jsx";
import SectionHeading from "./SectionHeading.jsx";
import RestaurantCard from "./RestaurantCard.jsx";

export default function RestaurantSection({
  id,
  eyebrow,
  title,
  restaurants,
  onReserve,
  loading = false,
  error = "",
  onRetry,
  emptyTitle = "No restaurants to show",
  emptyMessage = "No restaurants are available yet.",
  actionLabel = "View All Featured",
  actionHref = "#featured",
}) {
  const { initialLoading, refreshing } = useLoadingPhase(loading, restaurants.length, error);
  return (
    <section className="content-section restaurant-section" id={id}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        action={
          <Link className="section-action" to={actionHref}>
            {actionLabel}
            <ArrowRight size={14} />
          </Link>
        }
      />
      {refreshing && (
        <p className="landing-refresh-status" role="status">
          Updating restaurant suggestions…
        </p>
      )}
      {initialLoading ? (
        <div
          className="restaurant-grid landing-restaurant-skeleton-grid"
          role="status"
          aria-label="Loading restaurants"
          aria-busy="true"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div className="landing-restaurant-skeleton" key={index}>
              <span className="landing-skeleton-image" />
              <div>
                <span />
                <span />
                <span />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty-state landing-empty-state" role="alert">
          <Utensils size={22} aria-hidden="true" />
          <p>{error}</p>
          <button
            className="section-action"
            type="button"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : restaurants.length ? (
        <div className="restaurant-grid">
          {restaurants.map((restaurant, index) => (
            <RevealOnScroll
              key={restaurant.id || restaurant.name}
              className="landing-restaurant-reveal"
              delay={Math.min(index, 3) * 70}
            >
              <RestaurantCard restaurant={restaurant} onReserve={onReserve} />
            </RevealOnScroll>
          ))}
        </div>
      ) : (
        <div className="empty-state landing-empty-state">
          <Utensils size={24} aria-hidden="true" />
          <strong>{emptyTitle}</strong>
          <p>{emptyMessage}</p>
          {onRetry && error && (
            <button type="button" className="section-action" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}
    </section>
  );
}
