import React, { useEffect, useState } from "react";
import { Sparkles, BrainCircuit, TrendingUp, FlaskConical } from "lucide-react";
import AppShell from "../components/AppShell";
import Stat from "../components/Stat";
import Card from "../components/Card";
import PageTitle from "../components/PageTitle";
import { api } from "../api";

export default function Forecast() {
  const [data, setData] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/forecast?periods=6").then(setData).catch(e => setError(e.message));
    api("/api/industrial-data/summary").then(setDataset).catch(() => {});
  }, []);

  const synthetic = data?.source === "synthetic_project_dataset";
  const history = data?.history || [];
  const forecast = data?.forecast || [];
  const quantityValue = synthetic
    ? (forecast[0]?.predicted_quantity ?? 0)
    : (forecast[0]?.predicted_quantity_kg ?? 0);
  const quantityLabel = synthetic ? "Source quantity (unit unknown)" : "Waste quantity (kg)";

  return (
    <AppShell>
      <PageTitle
        title="Demand & Quality Analytics"
        subtitle="Uses the expanded COA dataset for prototype analytics and real application records when available."
      />
      {error && <div className="form-msg error">{error}. Log in again and check that the backend is running.</div>}

      {synthetic && (
        <div className="form-msg">
          <b>Prototype data notice:</b> This forecast uses synthetic generated records. Quantity units are not specified in the source, so values are not labelled as kilograms. Do not use them for operational decisions.
        </div>
      )}

      {data && (
        <>
          <div className="stats">
            <Stat icon={TrendingUp} value={history.length} label="Observed Monthly Periods" accent="green" />
            <Stat icon={TrendingUp} value={Number(quantityValue).toLocaleString()} label="Next Period Baseline" accent="blue" />
            <Stat icon={TrendingUp} value={forecast.length} label="Forecast Periods" accent="orange" />
            <Stat icon={BrainCircuit} value={synthetic ? "Synthetic baseline" : "Database baseline"} label="Model Type" accent="teal" />
          </div>

          <Card title="Forecast Results">
            <p className="muted">{data.method}</p>
            <p><b>Measure:</b> {data.measure || "waste quantity (kg)"}</p>
            {data.note && <p>{data.note}</p>}
            {!history.length && !forecast.length ? (
              <p className="empty-note">No historical records are available yet.</p>
            ) : (
              <table>
                <thead><tr><th>Period</th><th>{quantityLabel}</th><th>Type</th><th>Records</th></tr></thead>
                <tbody>
                  {history.map(x => (
                    <tr key={`h-${x.month}`}>
                      <td>{x.month}</td>
                      <td>{Number(synthetic ? x.total_quantity : x.total_quantity_kg).toLocaleString()}</td>
                      <td>Observed {synthetic ? "(synthetic)" : "(database)"}</td>
                      <td>{x.record_count ?? "—"}</td>
                    </tr>
                  ))}
                  {forecast.map(x => (
                    <tr key={`f-${x.month}`}>
                      <td>{x.month}</td>
                      <td>{Number(synthetic ? x.predicted_quantity : x.predicted_quantity_kg).toLocaleString()}</td>
                      <td>Baseline forecast</td><td>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="insight">
              <Sparkles />
              <p><b>Interpretation:</b> This is a moving-average baseline, not a trained or validated machine-learning model. Replace synthetic rows with verified historical production, demand, and waste data before using it for planning.</p>
            </div>
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
