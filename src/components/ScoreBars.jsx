import React from "react";


export default function ScoreBars(){let rows=[["Material Compatibility",95],["Quantity Fit",90],["Quality Fit",88],["Location Compatibility",92],["Industry Compatibility",94],["Timing Compatibility",85]];return <div className="score-bars">{rows.map(([n,v])=><div key={n}><span>{n}</span><i><em style={{width:v+"%"}}/></i><b>{v}%</b></div>)}</div>}
