import { useState } from "react";
import { formatBucket, formatCurrency, formatNumber } from "../../lib/managerDashboard.js";

/** Lightweight SVG chart, with keyboard-accessible point values and data table. */
export default function AdminTrendChart({ points, series, group, label, currency = false }) {
  const [hidden, setHidden] = useState([]);
  const [focused, setFocused] = useState(null);
  const format = currency ? formatCurrency : formatNumber;
  const visible = series.filter((s) => !hidden.includes(s.key));
  const values = points.flatMap((p) => visible.map((s) => Number(p[s.key] || 0)));
  const max = Math.max(0, ...values), min = Math.min(0, ...values), span = max - min || 1;
  const x = (index) => 80 + index / Math.max(1, points.length - 1) * 640;
  const y = (value) => 20 + (max - value) / span * 160;
  const tick = currency ? (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(v) : formatNumber;
  const activePoint = focused == null ? null : points[focused];
  return <div className="admin-trend">
    <div className="admin-trend-toggles" aria-label={`${label} series`}>
      {series.map((s) => <button type="button" key={s.key} aria-pressed={!hidden.includes(s.key)} onClick={() => {
        setHidden((current) => current.includes(s.key) ? current.filter((key) => key !== s.key) : current.length < series.length - 1 ? [...current, s.key] : current);
        setFocused(null);
      }}><i style={{ background: s.color }} />{s.name}</button>)}
    </div>
    {!values.some((v) => v !== 0) ? <p className="admin-analytics-empty">No recorded activity for the visible series in this period.</p>
      : <div className="admin-trend-scroll" tabIndex={0} role="region" aria-label={`${label}. Scroll on smaller screens.`}>
        <svg viewBox="0 0 750 216" className="admin-trend-svg" role="img" aria-label={label}>
          {[max, (max + min) / 2, min].map((value, i) => <g key={i}><line x1="80" x2="720" y1={y(value)} y2={y(value)} className="manager-chart-gridline" /><text x="70" y={y(value) + 4} textAnchor="end">{tick(value)}</text></g>)}
          <line x1="80" x2="720" y1={y(0)} y2={y(0)} className="manager-chart-baseline" />
          {visible.map((s) => <polyline key={s.key} points={points.map((p, i) => `${x(i)},${y(Number(p[s.key] || 0))}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" />)}
          {points.map((p, i) => <g key={p.date}>
            <rect x={x(i) - Math.max(3, 320 / points.length)} y="12" width={Math.max(6, 640 / points.length)} height="174" fill="transparent"
              tabIndex={0} role="button" aria-label={`${formatBucket(p.date, group)}: ${visible.map((s) => `${s.name} ${format(p[s.key])}`).join(", ")}`}
              onFocus={() => setFocused(i)} onBlur={() => setFocused(null)} onMouseEnter={() => setFocused(i)} onMouseLeave={() => setFocused(null)}>
              <title>{`${formatBucket(p.date, group)} · ${visible.map((s) => `${s.name}: ${format(p[s.key])}`).join(" · ")}`}</title>
            </rect>
            {visible.map((s) => <circle key={s.key} cx={x(i)} cy={y(Number(p[s.key] || 0))} r={focused === i ? 4 : points.length < 2 ? 3 : 0} fill={s.color} pointerEvents="none" />)}
            {(i === 0 || i === points.length - 1 || (i % Math.max(1, Math.ceil(points.length / 6)) === 0 && i < points.length - Math.ceil(points.length / 12)))
              && <text x={x(i)} y="205" textAnchor="middle">{formatBucket(p.date, group)}</text>}
          </g>)}
        </svg>
      </div>}
    {activePoint && <div className="admin-trend-tooltip" role="status"><strong>{formatBucket(activePoint.date, group)}</strong>{visible.map((s) => <span key={s.key}>{s.name}: {format(activePoint[s.key])}</span>)}</div>}
    <details className="admin-chart-data"><summary>View chart data</summary><div className="admin-table-scroll"><table><caption>{label}</caption><thead><tr><th>Date</th>{series.map((s) => <th key={s.key}>{s.name}</th>)}</tr></thead><tbody>{points.map((p) => <tr key={p.date}><th>{formatBucket(p.date, group)}</th>{series.map((s) => <td key={s.key}>{format(p[s.key])}</td>)}</tr>)}</tbody></table></div></details>
  </div>;
}
