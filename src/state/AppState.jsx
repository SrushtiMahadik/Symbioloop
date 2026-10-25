import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { demoWaste } from "../data/demoData";
import { api, getToken } from "../api";

const KEY = "symbioloop.prototype.v1";
const Ctx = createContext(null);
function load() { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
export const today = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const mapWaste = w => ({ ...w, material: w.material_type, qty: w.quantity_kg, unit: "KG", quality: w.quality_percent >= 80 ? "Good" : w.quality_percent >= 60 ? "Average" : "Low", purity: w.quality_percent, date: new Date(w.created_at).toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"}), _remote: true });
const mapReq = r => ({ ...r, material: r.material_type, polymer: r.material_type, qty: r.quantity_kg, unit: "KG", minQuality: r.min_quality_percent, status: r.status, date: new Date(r.created_at).toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"}), _remote: true });
export function AppStateProvider({ children }) {
  const saved = load();
  const [waste, setWaste] = useState(saved?.waste || demoWaste);
  const [requirements, setRequirements] = useState(saved?.requirements || []);
  const [connected, setConnected] = useState(Boolean(getToken()));
  const [dataError, setDataError] = useState("");
  const refresh = useCallback(async () => {
    if (!getToken()) { setConnected(false); return; }
    try {
      const [ws, rs] = await Promise.all([api("/api/waste"), api("/api/requirements")]);
      setWaste(ws.map(mapWaste)); setRequirements(rs.map(mapReq)); setConnected(true); setDataError("");
    } catch (e) { setDataError(e.message); setConnected(false); }
  }, []);
  useEffect(() => {
    const authChanged = () => { setConnected(Boolean(getToken())); if (getToken()) refresh(); };
    window.addEventListener("symbioloop-auth-changed", authChanged);
    if (getToken()) refresh();
    return () => window.removeEventListener("symbioloop-auth-changed", authChanged);
  }, [refresh]);
  useEffect(() => { if (!getToken()) { try { localStorage.setItem(KEY, JSON.stringify({ waste, requirements })); } catch {} } }, [waste, requirements]);
  const addWaste = async w => {
    if (getToken()) {
      const item = await api("/api/waste", { method: "POST", body: JSON.stringify({ material_type: `${w.polymer || "Rubber"} ${w.form || w.material || "scrap"}`, quantity_kg: Number(w.qty) * ((w.unit || "KG") === "TON" ? 1000 : 1), quality_percent: Number(w.purity ?? (w.quality === "Good" ? 85 : w.quality === "Average" ? 65 : 40)), description: [w.description, `Form: ${w.form || "unspecified"}`, `Cure: ${w.cure || "unspecified"}`, `Contamination: ${w.contamination || "unspecified"}`, `Processing: ${w.processing || "unspecified"}`].filter(Boolean).join(" | "), location: w.location || "", status: "Available" }) });
      setWaste(l => [mapWaste(item), ...l]); return item;
    }
    setWaste(l => [{ ...w, id: Date.now(), status: "Available", date: today() }, ...l]);
  };
  const removeWaste = async id => { if (getToken()) { await api(`/api/waste/${id}`, { method: "DELETE" }); setWaste(l => l.filter(w => w.id !== id)); } else setWaste(l => l.filter(w => w.id !== id)); };
  const addRequirement = async r => {
    if (getToken()) {
      const material = r.polymer && r.polymer !== "Any" ? `${r.polymer} ${r.material || "rubber"}` : (r.material || "Rubber scrap");
      const item = await api("/api/requirements", { method: "POST", body: JSON.stringify({ material_type: material, quantity_kg: Number(r.qty) * ((r.unit || "KG") === "TON" ? 1000 : 1), min_quality_percent: Number(r.minQuality ?? 50), description: [r.use, r.contamination, r.notes].filter(Boolean).join(" | "), location: r.location || "", status: "Open" }) });
      setRequirements(l => [mapReq(item), ...l]); return item;
    }
    setRequirements(l => [{ ...r, id: Date.now(), status: "Open", date: today() }, ...l]);
  };
  const removeRequirement = async id => { if (getToken()) { await api(`/api/requirements/${id}`, { method: "DELETE" }); setRequirements(l => l.filter(r => r.id !== id)); } else setRequirements(l => l.filter(r => r.id !== id)); };
  const resetDemo = () => { if (!getToken()) { setWaste(demoWaste); setRequirements([]); } else refresh(); };
  return <Ctx.Provider value={{ waste, requirements, addWaste, removeWaste, addRequirement, removeRequirement, resetDemo, refresh, connected, dataError }}>{children}</Ctx.Provider>;
}
export const useAppState = () => useContext(Ctx);
