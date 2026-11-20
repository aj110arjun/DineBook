import { RefreshCw, CircleAlert, Search } from "lucide-react";
import { SkeletonPage } from "./Skeleton.jsx";

export default function LoadingState({
  label = "Loading…",
  variant = "list",
  error,
  onRetry,
  className = "",
  children,
  ...props
}) {
  if (error)
    return (
      <ErrorState
        message={typeof error === "string" ? error : error.message}
        onRetry={onRetry}
      />
    );
  return (
    <div
      className={`db-loading-state ${className}`}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="ux-sr-only">{label}</span>
      <div aria-hidden="true">
        {children ?? <SkeletonPage variant={variant} {...props} />}
      </div>
    </div>
  );
}
export function RefreshIndicator({
  active,
  label = "Updating… Showing the latest available information.",
}) {
  return active ? (
    <p className="db-refresh-indicator" role="status">
      <RefreshCw size={14} aria-hidden="true" />
      {label}
    </p>
  ) : null;
}
export function ErrorState({
  message = "This information could not be loaded.",
  onRetry,
}) {
  return (
    <div className="db-content-state is-error" role="alert">
      <CircleAlert size={24} aria-hidden="true" />
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title = "No results yet",
  children,
  onAction,
  actionLabel,
}) {
  return (
    <div className="db-content-state">
      <Search size={24} aria-hidden="true" />
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {onAction && actionLabel && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
