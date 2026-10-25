import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Leaf, LayoutDashboard, UserRound, PlusCircle, ClipboardList, Sparkles, Handshake, MessageCircle, LogOut, TrendingUp, Truck, X } from "lucide-react";
import Logo from "./Logo";
import { clearSession } from "../api";

const navItems = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/profile", "My Profile", UserRound],
  ["/waste", "Add Waste", PlusCircle],
  ["/requirement", "Add Requirement", ClipboardList],
  ["/matches", "Find Matches", Sparkles],
  ["/forecast", "Demand Forecast", TrendingUp],
  ["/optimization", "Cost & Route", Truck],
  ["/exchanges", "Exchanges", Handshake],
  ["/sustainability", "Sustainability", Leaf],
  ["/assistant", "AI Assistant", MessageCircle],
];

export default function Sidebar({ open = false, onClose = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  return <aside className={"sidebar" + (open ? " open" : "")}>
    <button className="close-btn" aria-label="Close menu" onClick={onClose}><X size={20}/></button>
    <Logo light/>
    <nav>{navItems.map(([path,label,Icon]) => <Link className={location.pathname===path?"active":""} key={path} to={path} title={label} onClick={onClose}><Icon size={17}/>{label}</Link>)}</nav>
    <button className="logout" onClick={()=>{clearSession(); navigate("/login");}}><LogOut size={17}/> Logout</button>
  </aside>
}
