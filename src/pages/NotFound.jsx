import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AppShell from "../components/AppShell";

export default function NotFound(){return <AppShell><div className="empty-page"><ShieldCheck size={50}/><h2>Page not found</h2><Link to="/dashboard" className="primary">Back to Dashboard</Link></div></AppShell>}
