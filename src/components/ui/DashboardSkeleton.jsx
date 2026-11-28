import { Skeleton } from "./Skeleton.jsx";

// Keep known labels' font metrics and wrapping without showing placeholder data.
export function SkeletonCopy({ children }) {
  return (
    <Skeleton className="db-skeleton-copy" style={{ color: "transparent" }}>
      {children}
    </Skeleton>
  );
}

export function SkeletonBars({ series = 2, height = 192 }) {
  return (
    <>
      <div className="manager-chart-scroll">
        <div className="db-dashboard-skeleton-bars" style={{ height }}>
          {[38, 65, 48, 82, 58, 94, 72, 86].map((value, index) => (
            <Skeleton key={index} height={`${value}%`} />
          ))}
        </div>
      </div>
      {series > 0 && (
        <div className="manager-chart-legend">
          {Array.from({ length: series }, (_, index) => (
            <Skeleton key={index} width={88} height={12} />
          ))}
        </div>
      )}
    </>
  );
}

export function SkeletonDonut({ detailed = false }) {
  return (
    <div className="manager-dashboard-status-chart db-dashboard-skeleton-donut">
      <Skeleton
        shape="circle"
        className="manager-order-donut manager-analytics-donut"
      />
      <div
        className={`manager-order-legend${detailed ? " manager-order-legend-detailed" : ""}`}
      >
        {[76, 92, 64, 84].map((width, index) => (
          <div key={index}>
            <Skeleton shape="circle" width={8} height={8} />
            <Skeleton width={`${width}%`} height={12} />
            {detailed && (
              <>
                <Skeleton width={20} height={12} />
                <Skeleton className="manager-legend-track" height={4} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPairs({ count = 4 }) {
  return Array.from({ length: count }, (_, index) => (
    <div key={index} className="db-dashboard-skeleton-pair">
      <Skeleton width="75%" height={12} />
      <Skeleton width="52%" height={16} />
    </div>
  ));
}

export function SkeletonManagerList({ rows = 3 }) {
  return (
    <div className="manager-list">
      {Array.from({ length: rows }, (_, index) => (
        <div className="manager-list-row" key={index}>
          <div>
            <Skeleton width={105} height={14} />
            <Skeleton width={140} height={12} />
          </div>
          <Skeleton width={64} height={28} />
        </div>
      ))}
    </div>
  );
}
