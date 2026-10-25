import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { api, setSession } from "../api";

export default function Login() {
  const navigate = useNavigate(); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async e => { e.preventDefault(); setBusy(true); setError(""); const fd = new FormData(e.currentTarget);
    try { const result = await api("/api/auth/login", { method:"POST", body:JSON.stringify({ email:fd.get("email"), password:fd.get("password") }) }); setSession(result); navigate("/dashboard"); }
    catch (err) { setError(err.message || "Login failed. Check your details and ensure the backend is running."); } finally { setBusy(false); }
  };
  return <AuthShell><div className="auth-card"><h2>Welcome Back</h2><p className="muted">Login to your SymbioLoop account</p>
    <form onSubmit={submit}><label>Email Address<input name="email" type="email" placeholder="Enter your email" required/></label>
      <label>Password<div className="password"><input name="password" type={show?"text":"password"} placeholder="Enter your password" required/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      {error && <div className="form-msg error" role="alert">{error}</div>}
      <button className="primary wide" disabled={busy}>{busy ? "Signing in…" : "Login"}</button>
    </form><p className="auth-switch">Don't have an account? <Link to="/register">Register</Link></p>
  </div></AuthShell>;
}
