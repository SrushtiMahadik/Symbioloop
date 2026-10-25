import React from "react";

// `sample` shows a pill so nobody mistakes demo figures for real results.
export default function PageTitle({title,subtitle,action,sample=false}) {
  return <div className="page-title"><div><h1>{title}{sample && <span className="sample-pill" title="These figures are demo values until the backend and models are connected">Sample data</span>}</h1><p>{subtitle}</p></div>{action}</div>
}
