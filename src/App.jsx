import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Waste from "./pages/Waste";
import Requirement from "./pages/Requirement";
import Matches from "./pages/Matches";
import Assistant from "./pages/Assistant";
import Forecast from "./pages/Forecast";
import Optimization from "./pages/Optimization";
import Exchanges from "./pages/Exchanges";
import Sustainability from "./pages/Sustainability";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { getToken } from "./api";

function Protected({ children }) { return getToken() ? children : <Navigate to="/login" replace />; }

export default function App(){
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
    <Route path="/dashboard" element={<Protected><Dashboard/></Protected>}/>
    <Route path="/profile" element={<Protected><Profile/></Protected>}/>
    <Route path="/waste" element={<Protected><Waste/></Protected>}/>
    <Route path="/requirement" element={<Protected><Requirement/></Protected>}/>
    <Route path="/matches" element={<Protected><Matches/></Protected>}/>
    <Route path="/assistant" element={<Protected><Assistant/></Protected>}/>
    <Route path="/forecast" element={<Protected><Forecast/></Protected>}/>
    <Route path="/optimization" element={<Protected><Optimization/></Protected>}/>
    <Route path="/exchanges" element={<Protected><Exchanges/></Protected>}/>
    <Route path="/sustainability" element={<Protected><Sustainability/></Protected>}/>
    <Route path="*" element={<NotFound/>}/>
  </Routes>
}