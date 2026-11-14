import { memo, useEffect, useRef, useState } from "react";
import { donutGradient, formatBucket, formatCurrency, formatNumber, SERIES_COLORS } from "../../lib/managerDashboard.js";

export function EmptyState({ children = "No activity in this period." }) {
  return <p className="manager-analytics-empty">{children}</p>;
}

export const BarChart = memo(function BarChart({ points, series, group, currency = false, label }) {
  const format = currency ? formatCurrency : formatNumber;
  const formatAxis = currency
    ? (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(value)
    : formatNumber;
  const values = points.flatMap((point) => series.map(({ key }) => Number(point[key] || 0)));
  const hasValues = values.some((value) => value !== 0);
  const viewport = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (!hasValues || !viewport.current) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(Math.floor(entry.contentRect.width)));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [hasValues]);
  if (!hasValues) return <EmptyState>{currency ? "No recorded collections or refunds in this period." : "No activity in this period."}</EmptyState>;
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const width = Math.max(480, points.length * (series.length * 3 + 4) + 90, containerWidth);
  const top = 12, bottom = 152, left = 80;
  const y = (value) => top + (max - value) / span * (bottom - top);
  const step = (width - left - 10) / points.length;
  const barWidth = Math.min(18, (step - Math.min(8, step / 4)) / series.length);
  const labelEvery = Math.max(1, Math.ceil(60 / step));
  return <>
    <div className="manager-chart-scroll" ref={viewport} tabIndex={0} role="region" aria-label={`${label}. Scroll to view all dates.`}>
      <svg className="manager-analytics-bars" viewBox={`0 0 ${width} 192`} style={{ minWidth: width }} role="img" aria-label={label}>
        {[max, (max + min) / 2, min].map((tick, index) => <g key={index}>
          <line x1={left} x2={width} y1={y(tick)} y2={y(tick)} className="manager-chart-gridline" />
          <text x={left - 8} y={y(tick) + 4} textAnchor="end">{formatAxis(tick)}</text>
        </g>)}
        <line x1={left} x2={width} y1={y(0)} y2={y(0)} className="manager-chart-baseline" />
        {points.map((point, index) => <g key={point.date}>
          {series.map(({ key, name, color }, seriesIndex) => {
            const value = Number(point[key] || 0);
            return <rect key={key} x={left + index * step + step / 2 + (seriesIndex - series.length / 2) * barWidth}
              y={Math.min(y(0), y(value))} height={Math.abs(y(0) - y(value))} width={barWidth - 1} rx="2"
              fill={color || SERIES_COLORS[seriesIndex]} tabIndex={0} aria-label={`${formatBucket(point.date, group)}: ${name} ${format(value)}`}>
              <title>{`${formatBucket(point.date, group)} · ${name}: ${format(value)}`}</title>
            </rect>;
          })}
          {(index === 0 || index === points.length - 1 || (index % labelEvery === 0 && index < points.length - 1 - labelEvery / 2))
            && <text x={left + index * step + step / 2} y="176" textAnchor="middle">{formatBucket(point.date, group)}</text>}
        </g>)}
      </svg>
    </div>
    <div className="manager-chart-legend">{series.map(({ key, name, color }, index) => <span key={key}><i style={{ background: color || SERIES_COLORS[index] }} />{name}</span>)}</div>
  </>;
});

export const DonutChart = memo(function DonutChart({ items, label, currency = false, detailed = false }) {
  const visible = items.filter((item) => Number(item.value) > 0);
  if (!visible.length) return <EmptyState>No {label.toLowerCase()} in this period.</EmptyState>;
  const total = visible.reduce((sum, item) => sum + Number(item.value), 0);
  return <div className="manager-dashboard-status-chart">
    <div className="manager-order-donut manager-analytics-donut" role="img" aria-label={`${label}: ${currency ? formatCurrency(total) : formatNumber(total)}`}
      style={{ background: donutGradient(visible) }}><strong>{currency ? "INR" : formatNumber(total)}</strong></div>
    <div className={`manager-order-legend${detailed ? " manager-order-legend-detailed" : ""}`}>{visible.map((item, index) => <div key={item.label} title={`${item.label}: ${currency ? formatCurrency(item.value) : formatNumber(item.value)} (${formatNumber(Number(item.value) / total * 100)}%)`}>
      <span className="status-dot" style={{ background: item.color || SERIES_COLORS[index % SERIES_COLORS.length] }} />
      {detailed ? <><span className="manager-legend-label">{item.label}</span><b>{currency ? formatCurrency(item.value) : formatNumber(item.value)}</b>
        <span className="manager-legend-track" aria-hidden="true"><i style={{ width: `${Number(item.value) / total * 100}%`, background: item.color || SERIES_COLORS[index % SERIES_COLORS.length] }} /></span></>
        : <>{item.label} ({currency ? formatCurrency(item.value) : formatNumber(item.value)})</>}
    </div>)}</div>
  </div>;
});
