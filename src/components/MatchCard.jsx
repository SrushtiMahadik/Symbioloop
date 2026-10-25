import React from "react";
import { MapPin, Recycle, Factory, Building2 } from "lucide-react";

const icons = { Recycler: Recycle, Manufacturer: Factory, Construction: Building2 };

export default function MatchCard({m}){
  const Icon = icons[m.type] || Factory;
  return <div className="match-card"><div className="rank">{m.rank}</div><div className="partner-icon"><Icon size={24}/></div><div className="match-info"><b>{m.name}</b><span className="tag">{m.type}</span><small><MapPin size={13}/> {m.location}</small><small>Requires: {m.required} · Min Quality: {m.min}</small></div><div className="score"><b>{m.score}%</b><small>Match Score</small><i><em style={{width:m.score+"%"}}/></i><button className="outline-btn">View Details</button></div></div>
}
