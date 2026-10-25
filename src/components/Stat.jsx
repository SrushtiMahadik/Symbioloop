import React from "react";


export default function Stat({icon:Icon,value,label,accent}) {
  return <div className="stat"><div className={"stat-icon "+(accent||"")}>{<Icon size={19}/>}</div><div><b>{value}</b><span>{label}</span></div></div>
}
