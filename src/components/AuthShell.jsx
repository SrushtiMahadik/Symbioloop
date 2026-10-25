import React from "react";
import { Recycle, Leaf, Handshake } from "lucide-react";
import Logo from "./Logo";

export default function AuthShell({ children, register=false }) {
  return <div className="auth-page">
    <div className="auth-left">
      <div className="auth-overlay"/>
      <div className="auth-content">
        <Logo light />
        <div className="hero-copy">
          <h1>{register ? "Join the Rubber Resource Network" : "Turning Rubber Waste Into New Opportunities"}</h1>
          <p>AI-powered resource exchange for rubber industries. Discover compatible partners, reduce waste and build a circular manufacturing ecosystem.</p>
        </div>
        <div className="hero-features">
          <span><Recycle/> Reduce Waste</span>
          <span><Handshake/> Enable Reuse</span>
          <span><Leaf/> Greener Future</span>
        </div>
      </div>
    </div>
    <div className="auth-right">{children}</div>
  </div>
}
