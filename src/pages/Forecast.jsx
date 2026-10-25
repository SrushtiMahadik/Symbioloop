import React, { useEffect, useState } from "react";
import { Sparkles, BrainCircuit, TrendingUp, FlaskConical, Gauge, TriangleAlert } from "lucide-react";
import AppShell from "../components/AppShell";
import Stat from "../components/Stat";
import Card from "../components/Card";
import PageTitle from "../components/PageTitle";
import LineChart from "../components/LineChart";
import { api } from "../api";

const SHOW_HISTORY = 18; // months of history drawn on the chart

const fmt = n => (n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortMonth = key => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;

// Pick a "nice" y-axis maximum and step so the chart ticks are readable.
function niceScale(maxValue) {
  if (!maxValue || maxValue <= 0) return { max: 4, step: 1 };
  const rough = maxValue / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 10].map(m => m * pow).find(s => s >= rough);
  return { max: step * 4, step };
}

export default function Forecast() {
  const [data, setData] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState("dataset");
  const [product, setProduct] = useState("all");

  useEffect(() => {
    setError("");
    api(`/api/forecast?periods=6&source=${source}&product=${encodeURIComponent(product)}`)
      .then(setData)
      .catch(e => setError(e.message));
  }, [source, product]);

  useEffect(() => {
    api("/api/industrial-data/summary").then(setDataset).catch(() => {});
  }, []);

  const history = data?.history || [];
  const forecast = data?.forecast || [];
  const models = data?.models || [];
  const warnings = data?.warnings || [];
  const synthetic = data?.synthetic;
  const unit = source === "database" ? "kg" : "units";

  // Chart series: last SHOW_HISTORY months of history followed by the forecast months.
  const shownHistory = history.slice(-SHOW_HISTORY);
  const labels = [...shownHistory.map(h => shortMonth(h.month)), ...forecast.map(f => shortMonth(f.month))];
  const pad = forecast.map(() => null);
  const histPad = shownHistory.map(() => null);
  const actual = [...shownHistory.map(h => h.value), ...pad];
  const lastIdx = shownHistory.length - 1;
  const forecastLine = [...histPad.map((_, i) => (i === lastIdx ? shownHistory[lastIdx].value : null)), ...forecast.map(f => f.value)];
  const low = data?.validated ? [...histPad, ...forecast.map(f => f.low)] : undefined;
  const high = data?.validated ? [...histPad, ...forecast.map(f => f.high)] : undefined;
  const topValue = Math.max(0, ...shownHistory.map(h => h.value), ...forecast.map(f => (f.high ?? f.value)));
  const { max, step } = niceScale(topValue);
  const canChart = shownHistory.length >= 2 && forecast.length > 0;

  const selected = models.find(m => m.selected);
  const baseline = models.find(m => m.name === data?.baseline_model);

  return (
    <AppShell>
      <PageTitle
        title="Demand Forecast"
        subtitle="Monthly forecast with model comparison, backtest accuracy and an approximate prediction range."
        action={
          <div className="btn-row">
            <button className={source === "dataset" ? "primary small" : "outline-btn"} onClick={() => { setSource("dataset"); setProduct("all"); }}>COA dataset</button>
            <button className={source === "database" ? "primary small" : "outline-btn"} onClick={() => { setSource("database"); setProduct("all"); }}>Platform listings</button>
          </div>
        }
      />
      {error && <div className="form-msg error">{error}. Log in again and check that the backend is running.</div>}

      {synthetic && (
        <div className="form-msg">
          <b>Prototype data notice:</b> this forecast uses synthetic generated records. Quantity units are not specified in the source, so values are not labelled as kilograms. Do not use them for operational decisions.
        </div>
      )}

      {data && (
        <>
          {source === "dataset" && data.products?.length > 0 && (
            <div className="btn-row" style={{ justifyContent: "flex-start", marginBottom: 14 }}>
              <button className={product === "all" ? "primary small" : "outline-btn"} onClick={() => setProduct("all")}>All products</button>
              {data.products.map(p => (
                <button key={p} className={product === p ? "primary small" : "outline-btn"} onClick={() => setProduct(p)}>{p}</button>
              ))}
            </div>
          )}

          <div className="stats">
            <Stat icon={TrendingUp} value={`${data.n_observed ?? 0} of ${history.length}`} label="Months with records" accent="green" />
            <Stat icon={TrendingUp} value={forecast[0] ? fmt(forecast[0].value) : "—"} label={forecast[0] ? `Forecast for ${forecast[0].month}` : "Next month forecast"} accent="blue" />
            <Stat icon={BrainCircuit} value={data.selected_label || "—"} label={data.validated ? "Selected model (lowest RMSE)" : "Model (not validated)"} accent="teal" />
            <Stat icon={Gauge} value={data.improvement_vs_baseline_pct == null ? "—" : `${data.improvement_vs_baseline_pct}%`} label="RMSE improvement vs 3-month average" accent="orange" />
          </div>

          {warnings.length > 0 && (
            <div className="form-msg">
              <TriangleAlert size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              {warnings.map((w, i) => <div key={i}>{w}</div>)}
            </div>
          )}

          <Card title="History and Forecast" icon={TrendingUp}>
            {canChart ? (
              <LineChart
                labels={labels}
                actual={actual}
                forecast={forecastLine}
                low={low}
                high={high}
                min={0}
                max={max}
                step={step}
                unit={unit}
                className="wide"
                labelEvery={3}
              />
            ) : (
              <p className="empty-note">Not enough monthly history to draw a chart yet.</p>
            )}
            <p className="muted" style={{ fontSize: 12 }}>
              {data.measure}. Chart shows the last {Math.min(SHOW_HISTORY, history.length)} months. {data.interval ? `Shaded band: ${data.interval}.` : "No prediction range is shown because the model could not be validated."}
            </p>
          </Card>

          {data.validated && (
            <Card title="Model Comparison (rolling backtest)" icon={FlaskConical}>
              <table>
                <thead><tr><th>Model</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th></th></tr></thead>
                <tbody>
                  {models.map(m => (
                    <tr key={m.name} style={m.selected ? { background: "#f2fbf5" } : undefined}>
                      <td><b>{m.label}</b></td>
                      <td>{fmt(m.mae)}</td>
                      <td>{fmt(m.rmse)}</td>
                      <td>{m.mape == null ? "—" : `${m.mape}%`}</td>
                      <td>{m.selected ? "Selected" : m.name === data.baseline_model ? "Baseline" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="insight">
                <Sparkles />
                <div>
                  <b>{data.verdict}</b>
                  <p>
                    Each model was refitted at the last {data.backtest.origins} months and asked to predict 1 to {data.backtest.max_horizon} months ahead ({data.backtest.points} predictions in total). MAE and RMSE are in the data's own units. MAPE is inflated when some months are very small. With so few months, the choice of best model is itself uncertain
                    {selected && baseline && selected.name !== baseline.name ? `, and the winning model was picked using the same test months it is scored on, so its advantage is likely optimistic.` : "."}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card title="Forecast Table" icon={TrendingUp}>
            {!forecast.length ? (
              <p className="empty-note">No monthly records are available yet.</p>
            ) : (
              <table>
                <thead><tr><th>Month</th><th>Forecast</th><th>Likely range (80%)</th></tr></thead>
                <tbody>
                  {forecast.map(f => (
                    <tr key={f.month}>
                      <td>{f.month}</td>
                      <td><b>{fmt(f.value)}</b></td>
                      <td>{f.low == null ? "—" : `${fmt(f.low)} – ${fmt(f.high)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {dataset && (
        <Card title="Industrial Certificate-of-Analysis Dataset" icon={FlaskConical}>
          <p><b>{dataset.record_count}</b> generated batch records are bundled for development and demonstration.</p>
          <p className="muted">{dataset.data_status}</p>
          <div className="grid-two">
            {dataset.product_counts?.map(item => (
              <div className="stat-card" key={item.product}>
                <b>{item.product}</b>
                <p>{item.records} synthetic records</p>
              </div>
            ))}
          </div>
          <h3>Quality parameter summary</h3>
          <p className="muted">Observed ranges and specification checks are calculated from the synthetic records. Missing parameters are not assumed to be zero.</p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Product</th><th>Parameter</th><th>Samples</th><th>Average</th><th>Spec range</th><th>Out of spec</th></tr></thead>
              <tbody>
                {(dataset.quality_summary || []).map((q, i) => (
                  <tr key={`${q.product}-${q.parameter}-${i}`}>
                    <td>{q.product}</td><td>{q.parameter}</td><td>{q.sample_count}</td>
                    <td>{q.average} {q.uom}</td>
                    <td>{q.min_spec ?? "—"} – {q.max_spec ?? "—"} {q.uom}</td>
                    <td>{q.out_of_spec_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul>
            {(dataset.limitations || []).map((note, i) => <li key={i}>{note}</li>)}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}