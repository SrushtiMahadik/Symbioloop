import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";
import Sidebar from "./Sidebar";
import { getUser } from "../api";

export default function AppShell({children}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const user = getUser();
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <div className="app-shell">
    <Sidebar open={open} onClose={() => setOpen(false)}/>
    <div className={"scrim" + (open ? " show" : "")} onClick={() => setOpen(false)}/>
    <main className="main">
      <header className="topbar">
        <button className="menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={21}/></button>
        <div className="search"><Search size={17}/><input aria-label="Search" placeholder="Search materials, industries..."/></div>
        <div className="top-actions"><Bell size={18}/><button className="profile-pill" onClick={()=>navigate("/profile")}><span>{(user?.name || "S").slice(0,1).toUpperCase()}</span><div><b>{user?.name || "SymbioLoop Industry"}</b><small>{user?.industry_type || "Industry Account"}</small></div></button></div>
      </header>
      <div className="page">{children}</div>
    </main>
  </div>
}
