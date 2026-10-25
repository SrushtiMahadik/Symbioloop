import React, { useEffect, useState } from "react";
import { Recycle, Leaf, Wind, Handshake, Factory, Info } from "lucide-react";
import AppShell from "../components/AppShell";
import Stat from "../components/Stat";
import Card from "../components/Card";
import PageTitle from "../components/PageTitle";
import LineChart from "../components/LineChart";
import { api } from "../api";

// Pick a "nice" y-axis maximum and step so the chart ticks are readable.
function niceScale(maxValue) {
  if (!maxValue || maxValue <= 0) return { max: 4, step: 1 };
  const rough = maxValue / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 10].map(m => m * pow).find(s => s >= rough);
  return { max: step * 4, step };
}

const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

const SDGS = [
  { id: "SDG 9", name: "Industry, Innovation & Infrastructure", text: "Matches one factory's rubber scrap to another's raw-material need." },
  { id: "SDG 12", name: "Responsible Consumption & Production", text: "Reused kilograms are waste that does not go to disposal." },
  { id: "SDG 13", name: "Climate Action", text: "Estimated CO₂e avoided by reusing material instead of disposing it." },
];

export default function Sustainability() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [scope, setScope] = useState("platform");
  const [metric, setMetric] = useState("reused_kg");

  useEffect(() => {
    setError("");
    api(`/api/sustainability?scope=${scope}&months=6`).then(setData).catch(e => setError(e.message));
  }, [scope]);

  const monthly = data?.monthly || [];
  const values = monthly.map(m => m[metric]);
  const { max, step } = niceScale(Math.max(0, ...values));
  const hasActivity = values.some(v => v > 0);
  const co2 = data?.co2;
  const placeholder = co2?.factor_status === "placeholder";
  const maxMaterial = Math.max(1, ...(data?.by_material || []).map(m => m.reused_kg));

  return (
    <AppShell>
      <PageTitle
        title="Sustainability Impact"
        subtitle="Reuse, landfill diversion and estimated CO₂ avoided, calculated from completed exchanges."
        action={
          <div className="btn-row">
            <button className={scope === "platform" ? "primary small" : "outline-btn"} onClick={() => setScope("platform")}>Platform-wide</button>
            <button className={scope === "mine" ? "primary small" : "outline-btn"} onClick={() => setScope("mine")}>My industry</button>
          </div>
        }
      />
      {error && <div className="form-msg error">{error}. Log in to load sustainability data.</div>}

      {data && (
        <>
          {placeholder && (
            <div className="form-msg">
              <b>Placeholder emission factor:</b> CO₂ values use {co2.factor_default} kg CO₂e per kg reused, which is not yet backed by a source. Set a verified factor and its citation in <code>backend/.env</code> (CO2_FACTOR_DEFAULT, CO2_FACTOR_SOURCE) before presenting these numbers as results.
            </div>
          )}

          <div className="stats">
            <Stat icon={Recycle} value={`${fmt(data.total_reused_kg)} kg`} label="Rubber Reused (completed exchanges)" accent="green" />
            <Stat icon={Wind} value={`${fmt(co2.estimated_saved_kg)} kg`} label={`Estimated CO₂e avoided${placeholder ? " (placeholder factor)" : ""}`} accent="teal" />
            <Stat icon={Handshake} value={data.completed_exchange_count} label="Completed Exchanges" accent="blue" />
            <Stat icon={Leaf} value={`${data.waste_diversion_percent}%`} label="Diversion Rate (reused vs reused + available)" accent="orange" />
          </div>

          <Card title="Monthly Trend (last 6 months)" icon={Leaf}>
            <div className="btn-row" style={{ justifyContent: "flex-start", marginBottom: 12 }}>
              <button className={metric === "reused_kg" ? "primary small" : "outline-btn"} onClick={() => setMetric("reused_kg")}>Rubber reused (kg)</button>
              <button className={metric === "co2_saved_kg" ? "primary small" : "outline-btn"} onClick={() => setMetric("co2_saved_kg")}>CO₂e avoided (kg)</button>
            </div>
            {hasActivity ? (
              <LineChart
                labels={monthly.map(m => m.label)}
                actual={values}
                forecast={values.map(() => null)}
                min={0}
                max={max}
                step={step}
                unit="kg"
                className="wide"
                showForecast={false}
              />
            ) : (
              <p className="empty-note">No completed exchanges in the last 6 months. Complete an exchange from the Resource Exchange page, or run the demo seed script, to see the trend.</p>
            )}
          </Card>

          <div className="grid-two">
            <Card title="Reuse by Material" icon={Factory}>
              {!data.by_material.length ? (
                <p className="empty-note">No completed exchanges yet.</p>
              ) : (
                <table>
                  <thead><tr><th>Material</th><th>Reused</th><th>CO{"₂"}e avoided</th><th>Exchanges</th></tr></thead>
                  <tbody>
                    {data.by_material.map(m => (
                      <tr key={m.material_type}>
                        <td>
                          <b>{m.material_type}</b>
                          <i style={{ display: "block", height: 5, marginTop: 5, borderRadius: 5, background: "#e9efeb", overflow: "hidden" }}>
                            <em style={{ display: "block", height: "100%", width: `${(m.reused_kg / maxMaterial) * 100}%`, background: "#31aa69" }} />
                          </i>
                        </td>
                        <td>{fmt(m.reused_kg)} kg</td>
                        <td>{fmt(m.co2_saved_kg)} kg</td>
                        <td>{m.exchanges}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Waste Pool" icon={Recycle}>
              <div className="impact">
                <div><b>{fmt(data.total_listed_kg)}</b><span>kg currently listed</span></div>
                <div><b>{fmt(data.currently_available_kg)}</b><span>kg still available</span></div>
                <div><b>{data.industries_participating}</b><span>industries in completed exchanges</span></div>
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>{data.environmental_note}</p>
            </Card>
          </div>

          <Card title="UN SDG Alignment" icon={Info}>
            <div className="grid-two">
              {SDGS.map(s => (
                <div className="insight" key={s.id}>
                  <div><b>{s.id}: {s.name}</b><p>{s.text}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </AppShell>
  );
}