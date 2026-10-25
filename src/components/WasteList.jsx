import React from "react";
import { CircleDot, X } from "lucide-react";
import { useAppState } from "../state/AppState";

export default function WasteList({ limit, removable = false }) {
  const { waste, removeWaste } = useAppState();
  const items = limit ? waste.slice(0, limit) : waste;
  if (!items.length) return <p className="empty-note">No listings yet. Add your first rubber waste listing.</p>;
  return <div className="waste-list">{items.map(w =>
    <div className={"waste-row" + (removable ? " removable" : "")} key={w.id}>
      <div className="material-icon"><CircleDot size={15}/></div>
      <div><b>{w.material}</b><small>{w.date}</small></div>
      <span>{w.qty} {(w.unit || "KG").toLowerCase()}</span>
      <em className={w.status==="Matched"?"matched":""}>{w.status}</em>
      {removable && <button className="row-x" aria-label={"Remove " + w.material} onClick={() => removeWaste(w.id)}><X size={14}/></button>}
    </div>)}</div>
}
