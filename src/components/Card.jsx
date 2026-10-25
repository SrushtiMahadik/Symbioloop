import React from "react";


export default function Card({title,icon:Icon,children}) { return <section className="card"><div className="card-head"><h3>{Icon&&<Icon size={17}/>} {title}</h3></div>{children}</section> }
