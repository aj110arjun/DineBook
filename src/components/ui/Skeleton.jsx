export function Skeleton({
  width,
  height,
  radius,
  shape,
  animated = true,
  className = "",
  style,
  ...props
}) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={`db-skeleton ${shape === "circle" ? "is-circle" : ""} ${animated ? "" : "is-static"} ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}
export function SkeletonText({ lines = 3 }) {
  return (
    <div className="db-skeleton-text">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? "64%" : "100%"} />
      ))}
    </div>
  );
}
export function SkeletonCard({ image = false }) {
  return (
    <div className="db-skeleton-card">
      {image && <Skeleton className="db-skeleton-image" />}
      <Skeleton width="44%" height="var(--space-5)" />
      <SkeletonText lines={2} />
      <Skeleton width="32%" height="var(--space-8)" />
    </div>
  );
}
export function SkeletonRows({ rows = 5, columns = 5 }) {
  return Array.from({ length: rows }, (_, row) => (
    <tr key={row} aria-hidden="true">
      {Array.from({ length: columns }, (_, column) => (
        <td key={column}>
          <Skeleton width={column ? "72%" : "88%"} />
        </td>
      ))}
    </tr>
  ));
}
export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="db-skeleton-table" aria-hidden="true">
      <table>
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th key={index}>
                <Skeleton width="60%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <SkeletonRows rows={rows} columns={columns} />
        </tbody>
      </table>
    </div>
  );
}
export function SkeletonChart() {
  return (
    <div className="db-skeleton-card">
      <Skeleton width="44%" />
      <div className="db-skeleton-chart">
        {[35, 58, 42, 76, 64, 90, 72, 82].map((height, index) => (
          <Skeleton key={index} height={`${height}%`} />
        ))}
      </div>
    </div>
  );
}
export function SkeletonForm() {
  return (
    <div className="db-skeleton-card">
      <div className="db-skeleton-identity">
        <Skeleton
          shape="circle"
          width="var(--space-12)"
          height="var(--space-12)"
        />
        <SkeletonText lines={2} />
      </div>
      <div className="db-skeleton-fields">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}>
            <Skeleton width="40%" />
            <Skeleton height="var(--space-10)" />
          </div>
        ))}
      </div>
    </div>
  );
}
export function SkeletonChat() {
  return (
    <div className="db-skeleton-chat">
      {["75%", "55%", "82%"].map((width, index) => (
        <div key={index} style={{ width }}>
          <SkeletonText lines={index === 1 ? 1 : 2} />
        </div>
      ))}
    </div>
  );
}
export function SkeletonPage({
  variant = "list",
  count = 3,
  rows = 5,
  columns = 5,
}) {
  if (variant === "chat") return <SkeletonChat />;
  if (variant === "table")
    return <SkeletonTable rows={rows} columns={columns} />;
  if (variant === "form") return <SkeletonForm />;
  if (variant === "dashboard")
    return (
      <>
        <div className="db-skeleton-stats">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
        <div className="db-skeleton-grid">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonTable columns={columns} rows={3} />
      </>
    );
  if (variant === "detail" || variant === "wallet")
    return (
      <>
        <div className="db-skeleton-card">
          <Skeleton width="40%" height="var(--space-8)" />
          <SkeletonText />
        </div>
        <SkeletonTable rows={3} columns={3} />
      </>
    );
  if (variant === "calendar")
    return (
      <div className="db-skeleton-calendar">
        {Array.from({ length: 14 }, (_, index) => (
          <Skeleton key={index} height="var(--space-12)" />
        ))}
      </div>
    );
  return (
    <div
      className={`db-skeleton-grid ${variant === "cards" || variant === "menu" ? "has-cards" : "is-list"}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard
          key={index}
          image={variant === "cards" || variant === "menu"}
        />
      ))}
    </div>
  );
}
