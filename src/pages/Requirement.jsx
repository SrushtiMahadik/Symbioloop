import React, { useState } from "react";
import { ClipboardList, CheckCircle2, X } from "lucide-react";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import PageTitle from "../components/PageTitle";
import { useAppState } from "../state/AppState";

const MATERIALS = ["Rubber scrap", "Granules / crumb", "Reclaimed rubber", "Uncured compound", "Sheet offcuts"];
const POLYMERS = ["Any", "NBR", "HNBR", "EPDM", "Silicone", "Natural rubber", "Neoprene", "Viton (FKM)", "SBR", "Teflon (PTFE)"];
const USES = ["Reclaim production", "Filler in compound", "Flooring / mats", "Road construction", "Cement kiln co-processing", "Pyrolysis", "Other"];
const CONTAM = ["No metal or fabric", "Small amount acceptable", "Any"];
const LOCS = ["Within 50 km", "Within 150 km", "Maharashtra", "Anywhere in India"];

const empty = {
  material: MATERIALS[0], polymer: POLYMERS[0], use: USES[0], qty: "", unit: "KG", minQuality: "70",
  contamination: CONTAM[0], location: LOCS[1], by: "2026-10-20", processing: "Grinding", notes: "",
};

export default function Requirement() {
  const { requirements, addRequirement, removeRequirement } = useAppState();
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState(null);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault();
    const qty = Number(f.qty), q = Number(f.minQuality);
    if (!(qty > 0)) return setMsg({ type: "error", text: "Enter a quantity greater than zero." });
    if (!(q >= 0 && q <= 100)) return setMsg({ type: "error", text: "Minimum quality must be between 0 and 100." });
    try { await addRequirement({ ...f, qty, minQuality: q }); setMsg({ type: "ok", text: "Requirement saved successfully." }); setF(empty); }
    catch (err) { setMsg({ type: "error", text: err.message || "Could not save requirement. Check backend connection and login." }); }
  };
  return <AppShell><PageTitle title="Add Resource Requirement" subtitle="Specify the rubber material you need for production."/>
    <Card title="Resource Requirement" icon={ClipboardList}><form className="form-grid" onSubmit={submit} noValidate>
      <label>Required Material<select value={f.material} onChange={set("material")}>{MATERIALS.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Preferred Polymer Type<select value={f.polymer} onChange={set("polymer")}>{POLYMERS.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Intended Use<select value={f.use} onChange={set("use")}>{USES.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Contamination Limit<select value={f.contamination} onChange={set("contamination")}>{CONTAM.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Required Quantity<input type="number" min="0" step="any" value={f.qty} onChange={set("qty")} placeholder="e.g. 400"/></label>
      <label>Unit<select value={f.unit} onChange={set("unit")}><option>KG</option><option>TON</option></select></label>
      <label>Minimum Quality (%)<input type="number" min="0" max="100" value={f.minQuality} onChange={set("minQuality")}/></label>
      <label>Required By<input type="date" value={f.by} onChange={set("by")}/></label>
      <label>Supplier Location<select value={f.location} onChange={set("location")}>{LOCS.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Processing Requirement<select value={f.processing} onChange={set("processing")}><option>Grinding</option><option>Shredding</option><option>None</option></select></label>
      <label className="full">Additional Notes<textarea value={f.notes} onChange={set("notes")} placeholder="e.g. Need consistent supply for 3 months."/></label>
      {msg && <div className={"form-msg " + msg.type} role="status">{msg.type === "ok" && <CheckCircle2 size={16}/>} {msg.text}</div>}
      <button className="primary">Submit Requirement</button>
    </form></Card>
    <Card title="Your Requirements">
      {!requirements.length ? <p className="empty-note">No requirements yet. Submit one above and it will appear here.</p> :
      <div className="req-list">{requirements.map(r => <div className="req-row" key={r.id}>
        <div><b>{r.polymer === "Any" ? "Any polymer" : r.polymer} · {r.material}</b><small>{r.use} · {r.location} · needed by {r.by}</small></div>
        <span>{r.qty} {r.unit.toLowerCase()}</span><em>{r.status}</em>
        <button className="row-x" aria-label="Remove requirement" onClick={async () => { try { await removeRequirement(r.id); } catch (err) { setMsg({ type: "error", text: err.message }); } }}><X size={14}/></button>
      </div>)}</div>}
    </Card>
  </AppShell>
}
