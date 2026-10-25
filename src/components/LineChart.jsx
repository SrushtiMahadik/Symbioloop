import React from "react";

// Simple responsive SVG line chart: solid actual line, dashed forecast line and a range band.
export default function LineChart({ labels, actual, forecast, low, high, min = 0, max = 100, step = 20, unit = "kg", className = "", showForecast = true }) {
  const W = 720, H = 300, L = 54, R = 16, T = 28, B = 34;
  const x = i => L + (i * (W - L - R)) / (labels.length - 1);
  const y = v => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  const line = a => a.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean).map((p, i) => (i ? "L" : "M") + p).join(" ");
  const idx = low ? labels.map((_, i) => i).filter(i => low[i] != null) : [];
  const band = idx.map(i => `${x(i)},${y(high[i])}`).concat(idx.slice().reverse().map(i => `${x(i)},${y(low[i])}`)).join(" ");
  return <div className={`linechart ${className}`}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Demand over time, actual and forecast">
      {ticks.map(v => <g key={v}>
        <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e3ebe6" strokeWidth="1"/>
        <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#6b7871">{v}</text>
      </g>)}
      <text x={12} y={14} fontSize="12" fill="#6b7871">{unit}</text>
      {band && <polygon points={band} fill="#2aa969" opacity="0.12"/>}
      <path d={line(actual)} fill="none" stroke="#159451" strokeWidth="3" strokeLinejoin="round"/>
      <path d={line(forecast)} fill="none" stroke="#159451" strokeWidth="3" strokeDasharray="7 6" opacity="0.65"/>
      {actual.map((v, i) => v != null && <circle key={"a" + i} cx={x(i)} cy={y(v)} r="4" fill="#159451"/>)}
      {forecast.map((v, i) => v != null && actual[i] == null && <circle key={"f" + i} cx={x(i)} cy={y(v)} r="4" fill="#fff" stroke="#159451" strokeWidth="2"/>)}
      {labels.map((l, i) => <text key={l + i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fill="#6b7871">{l}</text>)}
    </svg>
    <div className="chart-legend">
      <span><i className="lg solid"/>Actual</span>
      {showForecast && <span><i className="lg dashed"/>Forecast</span>}
      {band && <span><i className="lg band"/>Likely range</span>}
    </div>
  </div>;
}