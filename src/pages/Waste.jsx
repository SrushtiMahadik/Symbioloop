import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, UploadCloud, BrainCircuit, Image as ImageIcon, CircleDot, CheckCircle2 } from "lucide-react";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import PageTitle from "../components/PageTitle";
import WasteList from "../components/WasteList";
import { useAppState } from "../state/AppState";

const FORMS = ["Moulding flash", "Die-cut sheet offcuts", "Rejected parts", "Sponge offcuts", "Bonded-to-metal rejects", "Uncured compound", "Granules / crumb", "Mixed scrap"];
const POLYMERS = ["NBR", "HNBR", "EPDM", "Silicone", "Natural rubber", "Neoprene", "Viton (FKM)", "SBR", "Teflon (PTFE)", "Mixed / unknown"];
const CURE = ["Vulcanised", "Uncured compound"];
const CONTAM = ["None", "Metal inserts", "Fabric", "Oil or dirt", "Mixed polymers"];
const PROCESS = ["None", "Grinding", "Shredding", "Pelletizing"];

const empty = {
  form: FORMS[0], polymer: POLYMERS[0], cure: CURE[0], qty: "", unit: "KG", quality: "Good", purity: "85",
  contamination: CONTAM[0], hardness: "", sg: "", from: "2026-10-10", until: "2026-10-30",
  location: "Pune, Maharashtra", processing: PROCESS[0], description: "",
};

export default function Waste() {
  const { addWaste, resetDemo, connected, refresh } = useAppState();
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [detected, setDetected] = useState(false);
  const [visionResult, setVisionResult] = useState(null);
  const [visionBusy, setVisionBusy] = useState(false);
  const input = useRef(null);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = fl => {
    if (!fl) return;
    if (!/^image\/(png|jpe?g)$/.test(fl.type)) { setMsg({ type: "error", text: "Please choose a JPG or PNG image." }); return; }
    setMsg(null); setDetected(false); setVisionResult(null); setFile(fl); setPreview(URL.createObjectURL(fl));
  };

  const runVision = async () => {
    if (!file) return;
    setVisionBusy(true); setDetected(false); setVisionResult(null); setMsg(null);
    try {
      const { api } = await import("../api");
      const form = new FormData(); form.append("file", file);
      const result = await api("/api/vision/predict", { method: "POST", body: form });
      setVisionResult(result); setDetected(true);
      if (result.status === "success" && result.prediction) {
        const label = String(result.prediction).replaceAll("_", " ").trim();
        // Dataset labels often include a suffix such as NBR_scrap. Map these
        // class names back to the user-facing polymer dropdown safely.
        const normalized = label.toLowerCase();
        const aliases = [
          [/\bnbr\b/, "NBR"], [/\bhnbr\b/, "HNBR"], [/\bepdm\b/, "EPDM"],
          [/\bsbr\b/, "SBR"], [/natural[ _-]*rubber/i, "Natural rubber"],
          [/silicone/i, "Silicone"], [/neoprene/i, "Neoprene"],
          [/viton|\bfkm\b/i, "Viton (FKM)"], [/teflon|\bptfe\b/i, "Teflon (PTFE)"],
          [/mixed|unknown/i, "Mixed / unknown"],
        ];
        const mapped = aliases.find(([pattern]) => pattern.test(normalized))?.[1];
        if (mapped && POLYMERS.includes(mapped)) setF(prev => ({ ...prev, polymer: mapped }));
        setMsg({ type: "ok", text: `Model prediction: ${label}${result.confidence != null ? ` (${Math.round(result.confidence * 100)}% model score)` : ""}. Verify before saving.` });
      } else {
        setMsg({ type: "error", text: result.message || "Image model is not configured yet." });
      }
    } catch (err) { setDetected(true); setMsg({ type: "error", text: err.message || "Could not analyse image." }); }
    finally { setVisionBusy(false); }
  };

  const submit = async e => {
    e.preventDefault();
    const qty = Number(f.qty), purity = Number(f.purity);
    if (!(qty > 0)) return setMsg({ type: "error", text: "Enter a quantity greater than zero." });
    if (!(purity >= 0 && purity <= 100)) return setMsg({ type: "error", text: "Purity must be between 0 and 100." });
    if (f.until < f.from) return setMsg({ type: "error", text: "Available until must be on or after available from." });
    try { await addWaste({ ...f, qty, material: `${f.polymer} ${f.form.toLowerCase()}` });
      setMsg({ type: "ok", text: "Listing saved successfully." });
      setF({ ...empty, location: f.location });
    } catch (err) { setMsg({ type: "error", text: err.message || "Could not save listing. Check backend connection and login." }); }
  };

  return <AppShell><PageTitle title="Add Rubber Waste" subtitle="Enter details or use AI vision to identify rubber waste."/>
    <Card title="AI Waste Detection" icon={BrainCircuit}>
      <div className="upload-grid">
        <div className="upload-box" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
          <input ref={input} id="waste-image" type="file" accept="image/png,image/jpeg" hidden onChange={e => pick(e.target.files[0])}/>
          {preview ? <img className="preview" src={preview} alt="Uploaded scrap"/> : <UploadCloud size={34}/>}
          <b>{file ? file.name : "Upload Waste Image"}</b>
          <p>{file ? "Ready to analyse" : "Drag & drop or choose a JPG/PNG"}</p>
          <div className="btn-row">
            <button type="button" className="outline-btn" onClick={() => input.current.click()}><ImageIcon size={16}/> {file ? "Change image" : "Choose image"}</button>
            <button type="button" className="outline-btn" disabled={!file || visionBusy} onClick={runVision}><Sparkles size={16}/> {visionBusy ? "Analysing…" : "Analyse image"}</button>
          </div>
        </div>
        <div className="ai-result">
          <div className="ai-label"><Sparkles size={16}/> AI Detection Result</div>
          {!detected ? <div className="empty-ai">Upload an image and run AI detection to see material classification.</div> :
          <><div className="empty-ai"><b>{visionResult?.status === "success" ? `Prediction: ${String(visionResult.prediction).replaceAll("_", " ")}` : "Model not configured"}</b><p>{visionResult?.message || visionResult?.warning || "The backend will use a trained local classifier if one has been trained from labelled images. Otherwise it reports that setup is needed."}</p>{visionResult?.confidence != null && <p>Model score: {Math.round(visionResult.confidence * 100)}% (not a guarantee of correctness).</p>}</div></>}
        </div>
      </div>
    </Card>
    <Card title="Waste Details"><form className="form-grid" onSubmit={submit} noValidate>
      <label>Scrap Form<select value={f.form} onChange={set("form")}>{FORMS.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Polymer Type<select value={f.polymer} onChange={set("polymer")}>{POLYMERS.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Cure State<select value={f.cure} onChange={set("cure")}>{CURE.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Contamination<select value={f.contamination} onChange={set("contamination")}>{CONTAM.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Available Quantity<input type="number" min="0" step="any" value={f.qty} onChange={set("qty")} placeholder="e.g. 500"/></label>
      <label>Unit<select value={f.unit} onChange={set("unit")}><option>KG</option><option>TON</option></select></label>
      <label>Quality<select value={f.quality} onChange={set("quality")}><option>Good</option><option>Average</option><option>Low</option></select></label>
      <label>Purity (%)<input type="number" min="0" max="100" value={f.purity} onChange={set("purity")}/></label>
      <label>Hardness (Shore A, optional)<input type="number" min="0" max="100" value={f.hardness} onChange={set("hardness")} placeholder="e.g. 70"/></label>
      <label>Specific Gravity (optional)<input type="number" min="0" step="0.01" value={f.sg} onChange={set("sg")} placeholder="e.g. 1.25"/></label>
      <label>Available From<input type="date" value={f.from} onChange={set("from")}/></label>
      <label>Available Until<input type="date" value={f.until} onChange={set("until")}/></label>
      <label>Location<input value={f.location} onChange={set("location")}/></label>
      <label>Processing Required<select value={f.processing} onChange={set("processing")}>{PROCESS.map(o => <option key={o}>{o}</option>)}</select></label>
      <label className="full">Description<textarea value={f.description} onChange={set("description")} placeholder="e.g. Flash from O-ring moulding, loose, stored dry."/></label>
      {msg && <div className={"form-msg " + msg.type} role="status">{msg.type === "ok" && <CheckCircle2 size={16}/>} {msg.text} {msg.type === "ok" && <Link to="/dashboard">View dashboard</Link>}</div>}
      <button className="primary">Add Waste</button>
    </form></Card>
    <Card title="Your Listings"><WasteList removable/><button type="button" className="link-btn" onClick={connected ? refresh : resetDemo}>{connected ? "Refresh listings" : "Reset demo data"}</button></Card>
  </AppShell>
}
