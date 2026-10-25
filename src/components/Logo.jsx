import React from "react";
import { Recycle } from "lucide-react";

export default function Logo({ light=false }) {
  return <div className="logo">
    <div className="logo-mark"><Recycle size={21}/></div>
    <div><b className={light ? "light" : ""}>Symbio<span>Loop</span></b><small className={light ? "light-sub" : ""}>Rubber Resource Exchange</small></div>
  </div>;
}
