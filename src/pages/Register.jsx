import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import AuthShell from "../components/AuthShell";
import { api, setSession } from "../api";

export default function Register() {
  const navigate = useNavigate(); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const submit = async e => { e.preventDefault(); setBusy(true); setError(""); const fd = new FormData(e.currentTarget);
    try { const result = await api("/api/auth/register", { method:"POST", body:JSON.stringify({ name:fd.get("name"), email:fd.get("email"), password:fd.get("password"), industry_type:fd.get("industry_type"), location:fd.get("location"), phone:fd.get("phone") }) }); setSession(result); navigate("/dashboard"); }
    catch (err) { setError(err.message || "Registration failed. Ensure the backend is running and the email is not already registered."); } finally { setBusy(false); }
  };
  return <AuthShell register><div className="auth-card register-card"><div className="mobile-logo"><Logo/></div><h2>Create Industry Account</h2><p className="muted">Register your industry and join the rubber resource network.</p>
    <form onSubmit={submit}><div className="two"><label>Industry Name<input name="name" required minLength="2" placeholder="Enter industry name"/></label><label>Industry Category<select name="industry_type" defaultValue="Rubber manufacturing"><option>Rubber manufacturing</option><option>Rubber recycling / reclaim</option><option>Auto components</option><option>Tyre making / retreading</option><option>Footwear</option><option>Flooring, mats and tiles</option><option>Road and civil construction</option><option>Cement or energy</option><option>Other</option></select></label></div>
      <div className="two"><label>Location<input name="location" required placeholder="Pune, Maharashtra"/></label><label>Contact Person<input name="contact_person" placeholder="Contact person name"/></label></div>
      <label>Email<input name="email" type="email" required placeholder="Enter email"/></label><div className="two"><label>Phone Number<input name="phone" required placeholder="Enter phone number"/></label><label>Password<input name="password" type="password" required minLength="8" placeholder="At least 8 characters"/></label></div>
      <label className="check"><input type="checkbox" required/> I agree to the terms and conditions.</label>
      {error && <div className="form-msg error" role="alert">{error}</div>}<button className="primary wide" disabled={busy}>{busy ? "Creating account…" : "Create Account"}</button>
    </form><p className="auth-switch">Already have an account? <Link to="/login">Login</Link></p>
  </div></AuthShell>;
}
