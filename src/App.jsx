import React, { useState } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Recycle, Leaf, Factory, Eye, EyeOff, Bell, Search, LayoutDashboard,
  UserRound, PlusCircle, ClipboardList, Sparkles, Handshake, BarChart3,
  MessageCircle, LogOut, UploadCloud, CheckCircle2, MapPin, CalendarDays,
  ArrowRight, BrainCircuit, TrendingUp, Truck, CircleDollarSign, ShieldCheck,
  Send, Image as ImageIcon, ChevronRight
} from "lucide-react";

const green = "#07543e";

const demoWaste = [
  { id: 1, material: "NBR Rubber Scrap", polymer: "NBR", qty: 500, quality: 85, status: "Available", date: "10 Oct 2026" },
  { id: 2, material: "Rejected O-Rings", polymer: "NBR", qty: 120, quality: 91, status: "Available", date: "08 Oct 2026" },
  { id: 3, material: "EPDM Scrap", polymer: "EPDM", qty: 250, quality: 78, status: "Matched", date: "05 Oct 2026" }
];

const matches = [
  { rank: 1, name: "Rubber Recycler A", type: "Recycler", location: "Pimpri, Pune (32 km)", score: 91, required: "NBR Scrap / 400 KG", min: "70%", image: "🏭" },
  { rank: 2, name: "Rubber Processing Unit B", type: "Manufacturer", location: "Chakan, Pune (56 km)", score: 84, required: "Rubber Scrap / 300 KG", min: "75%", image: "🏗️" },
  { rank: 3, name: "Construction Material C", type: "Construction", location: "Nashik (120 km)", score: 76, required: "Rubber Granules / 1000 KG", min: "60%", image: "🏢" }
];

function Logo({ light=false }) {
  return <div className="logo">
    <div className="logo-mark"><Recycle size={21}/></div>
    <div><b className={light ? "light" : ""}>Symbio<span>Loop</span></b><small className={light ? "light-sub" : ""}>Rubber Resource Exchange</small></div>
  </div>;
}

function AuthShell({ children, register=false }) {
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

function Login() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  return <AuthShell>
    <div className="auth-card">
      <h2>Welcome Back</h2>
      <p className="muted">Login to your SymbioLoop account</p>
      <form onSubmit={e => {e.preventDefault(); navigate("/dashboard")}}>
        <label>Email Address<input type="email" placeholder="Enter your email" defaultValue="admin@starenterprises.com" required/></label>
        <label>Password<div className="password"><input type={show?"text":"password"} placeholder="Enter your password" defaultValue="password"/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
        <div className="form-row"><label className="check"><input type="checkbox" defaultChecked/> Remember me</label><a href="#forgot">Forgot password?</a></div>
        <button className="primary wide">Login</button>
      </form>
      <p className="auth-switch">Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  </AuthShell>
}

function Register() {
  const navigate = useNavigate();
  return <AuthShell register>
    <div className="auth-card register-card">
      <div className="mobile-logo"><Logo/></div>
      <h2>Create Industry Account</h2>
      <p className="muted">Register your rubber industry and join the resource network.</p>
      <form onSubmit={e => {e.preventDefault(); navigate("/login")}}>
        <div className="two"><label>Industry Name<input required placeholder="Enter industry name"/></label><label>Industry Type<select defaultValue="Rubber Manufacturing"><option>Rubber Manufacturing</option><option>Rubber Recycling</option><option>Rubber Processing</option></select></label></div>
        <div className="two"><label>Production Type<select required defaultValue=""><option value="">Select type</option><option>O-Rings</option><option>Seals</option><option>Gaskets</option><option>Rubber Sheets</option><option>Rubber Components</option></select></label><label>Location<input required placeholder="Pune, Maharashtra"/></label></div>
        <div className="two"><label>Contact Person<input required placeholder="Contact person name"/></label><label>Email<input type="email" required placeholder="Enter email"/></label></div>
        <div className="two"><label>Phone Number<input required placeholder="Enter phone number"/></label><label>Password<input type="password" required placeholder="Create password"/></label></div>
        <label className="check"><input type="checkbox" required/> I agree to the terms and conditions.</label>
        <button className="primary wide">Create Account</button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Login</Link></p>
    </div>
  </AuthShell>
}

const navItems = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/profile", "My Profile", UserRound],
  ["/waste", "Add Waste", PlusCircle],
  ["/requirement", "Add Requirement", ClipboardList],
  ["/matches", "Find Matches", Sparkles],
  ["/exchanges", "Exchanges", Handshake],
  ["/sustainability", "Sustainability", Leaf],
  ["/assistant", "AI Assistant", MessageCircle],
];

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  return <aside className="sidebar">
    <Logo light/>
    <nav>{navItems.map(([path,label,Icon]) => <Link className={location.pathname===path?"active":""} key={path} to={path}><Icon size={17}/>{label}</Link>)}</nav>
    <button className="logout" onClick={()=>navigate("/login")}><LogOut size={17}/> Logout</button>
  </aside>
}

function AppShell({children}) {
  const navigate = useNavigate();
  return <div className="app-shell">
    <Sidebar/>
    <main className="main">
      <header className="topbar">
        <div className="search"><Search size={17}/><input placeholder="Search materials, industries..."/></div>
        <div className="top-actions"><Bell size={18}/><button className="profile-pill" onClick={()=>navigate("/profile")}><span>S</span><div><b>Star Enterprises</b><small>Rubber Manufacturing</small></div></button></div>
      </header>
      <div className="page">{children}</div>
    </main>
  </div>
}

function Stat({icon:Icon,value,label,accent}) {
  return <div className="stat"><div className={"stat-icon "+(accent||"")}>{<Icon size={19}/>}</div><div><b>{value}</b><span>{label}</span></div></div>
}

function Dashboard() {
  return <AppShell>
    <PageTitle title="Welcome, Star Enterprises 👋" subtitle="AI-powered insights for your rubber waste and resource exchange." action={<Link className="primary small" to="/matches"><Sparkles size={16}/> Find AI Matches</Link>}/>
    <div className="stats"><Stat icon={ClipboardList} value="12" label="Waste Listings" accent="green"/><Stat icon={Sparkles} value="8" label="Potential Matches" accent="blue"/><Stat icon={Handshake} value="3" label="Ongoing Exchanges" accent="orange"/><Stat icon={Leaf} value="1.68 Ton" label="Waste Reused" accent="teal"/></div>
    <div className="grid-two">
      <Card title="AI Insights" icon={BrainCircuit}><div className="insight"><div className="insight-icon"><Sparkles/></div><div><b>NBR demand is increasing by 17%</b><p>AI forecast indicates stronger demand next month.</p></div></div><Link to="/forecast" className="outline-btn">View AI Forecast <ArrowRight size={15}/></Link></Card>
      <Card title="AI Demand Forecast" icon={TrendingUp}><div className="mini-bars"><div><span>NBR</span><i style={{width:"89%"}}></i><b>89% ↑</b></div><div><span>EPDM</span><i style={{width:"72%"}}></i><b>72% ↑</b></div><div><span>Silicone</span><i style={{width:"54%"}}></i><b>54%</b></div><div><span>Natural</span><i style={{width:"46%"}}></i><b>46%</b></div></div><Link to="/forecast" className="outline-btn">View Full Forecast <ArrowRight size={15}/></Link></Card>
    </div>
    <div className="grid-two">
      <Card title="Rubber Waste Overview"><div className="donut"><div><b>850 kg</b><span>Total Waste</span></div></div><div className="legend"><span><i className="dot green"></i>Matched <b>410 kg</b></span><span><i className="dot gray"></i>Available <b>320 kg</b></span><span><i className="dot orange"></i>In Progress <b>120 kg</b></span></div></Card>
      <Card title="Recent Waste Listings"><Link className="viewall" to="/waste">View All</Link><WasteList/></Card>
    </div>
  </AppShell>
}

function WasteList(){return <div className="waste-list">{demoWaste.map(w=><div className="waste-row" key={w.id}><div className="material-icon">◉</div><div><b>{w.material}</b><small>{w.date}</small></div><span>{w.qty} kg</span><em className={w.status==="Matched"?"matched":""}>{w.status}</em></div>)}</div>}

function Card({title,icon:Icon,children}) { return <section className="card"><div className="card-head"><h3>{Icon&&<Icon size={17}/>} {title}</h3></div>{children}</section> }

function PageTitle({title,subtitle,action}) {return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}

function Waste() {
  const [detected,setDetected]=useState(false);
  return <AppShell><PageTitle title="Add Rubber Waste" subtitle="Enter details or use AI vision to identify rubber waste."/>
    <Card title="AI Waste Detection" icon={BrainCircuit}>
      <div className="upload-grid">
        <div className="upload-box"><UploadCloud size={34}/><b>Upload Waste Image</b><p>Drag & drop or click to upload JPG/PNG</p><button className="outline-btn" onClick={()=>setDetected(true)}><ImageIcon size={16}/> Detect with AI</button></div>
        <div className="ai-result">
          <div className="ai-label"><Sparkles size={16}/> AI Detection Result</div>
          {!detected ? <div className="empty-ai">Upload an image and run AI detection to see material classification.</div> :
          <><div className="detect-main"><div className="rubber-preview">◉</div><div><small>Detected Material</small><h2>NBR Rubber Scrap</h2><span className="confidence">Confidence: 94%</span></div></div><div className="detect-grid"><b>Estimated Quality<small>82%</small></b><b>Recommended Processing<small>Grinding</small></b><b>Waste Category<small>Production Scrap</small></b><b>Possible Uses<small>Recycled Rubber, Granules</small></b></div><button className="primary wide">Use This Result</button></>}
        </div>
      </div>
    </Card>
    <Card title="Waste Details"><form className="form-grid" onSubmit={e=>e.preventDefault()}>
      <label>Waste Material<select><option>Rubber Scrap</option><option>Rejected O-Rings</option><option>EPDM Scrap</option></select></label><label>Polymer Type<select><option>NBR</option><option>EPDM</option><option>Silicone</option><option>Natural Rubber</option></select></label><label>Available Quantity<input defaultValue="500"/></label><label>Unit<select><option>KG</option><option>TON</option></select></label><label>Quality<select><option>Good</option><option>Average</option><option>Low</option></select></label><label>Purity (%)<input defaultValue="85"/></label><label>Available From<input type="date" defaultValue="2026-10-10"/></label><label>Available Until<input type="date" defaultValue="2026-10-30"/></label><label>Location<input defaultValue="Pune, Maharashtra"/></label><label>Processing Required<select><option>Grinding</option><option>Shredding</option><option>Pelletizing</option></select></label><label className="full">Description<textarea placeholder="Production scrap from rubber manufacturing..."/></label><button className="primary">Add Waste</button>
    </form></Card>
  </AppShell>
}

function Requirement() {
  return <AppShell><PageTitle title="Add Resource Requirement" subtitle="Specify the rubber material you need for production."/><Card title="Resource Requirement" icon={ClipboardList}><form className="form-grid" onSubmit={e=>e.preventDefault()}><label>Required Material<select><option>Rubber Scrap</option><option>Rubber Granules</option><option>NBR Scrap</option></select></label><label>Required Location<select><option>Maharashtra</option><option>Pune</option><option>Anywhere in India</option></select></label><label>Preferred Polymer Type<select><option>NBR</option><option>EPDM</option><option>Silicone</option></select></label><label>Required By<input type="date" defaultValue="2026-10-20"/></label><label>Required Quantity<input defaultValue="400"/></label><label>Unit<select><option>KG</option><option>TON</option></select></label><label>Minimum Quality (%)<input defaultValue="70"/></label><label>Processing Requirement<select><option>Grinding</option><option>Shredding</option></select></label><label className="full">Additional Notes<textarea defaultValue="Need consistent supply for 3 months."/></label><button className="primary">Submit Requirement</button></form></Card></AppShell>
}

function Matches() {
  const [running,setRunning]=useState(false);
  return <AppShell><PageTitle title="AI Match Results" subtitle="Top resource-exchange recommendations based on AI compatibility analysis." action={<button className="primary small" onClick={()=>setRunning(true)}><Sparkles size={16}/> {running?"AI Analysis Complete":"Run AI Analysis"}</button>}/><div className="ai-banner"><BrainCircuit/><div><b>{running?"AI analyzed 42 candidate requirements":"AI-ready matching engine"}</b><p>Semantic material similarity + quantity + quality + location + industry + timing.</p></div><span>{running?"42 analyzed":"Ready"}</span></div><div className="match-layout"><div>{matches.map(m=><MatchCard m={m} key={m.rank}/>)}</div><Card title="AI Match Analysis" icon={BrainCircuit}><div className="selected-material"><div className="rubber-preview">◉</div><div><b>NBR Rubber Scrap</b><small>500 KG · Quality 85% · Pune</small></div></div><ScoreBars/><div className="big-score"><span>AI Match Score</span><b>91%</b><i><em style={{width:"91%"}}/></i></div><h4>Why this match?</h4><ul className="checks"><li>Same polymer type (NBR)</li><li>Required quantity available</li><li>Quality requirement satisfied</li><li>Located within feasible distance</li><li>Compatible industry</li><li>Availability period matches</li></ul><button className="primary wide">Connect with Partner</button></Card></div></AppShell>
}

function MatchCard({m}){return <div className="match-card"><div className="rank">{m.rank}</div><div className="partner-icon">{m.image}</div><div className="match-info"><b>{m.name}</b><span className="tag">{m.type}</span><small><MapPin size={13}/> {m.location}</small><small>Requires: {m.required} · Min Quality: {m.min}</small></div><div className="score"><b>{m.score}%</b><small>Match Score</small><i><em style={{width:m.score+"%"}}/></i><button className="outline-btn">View Details</button></div></div>}
function ScoreBars(){let rows=[["Material Compatibility",95],["Quantity Fit",90],["Quality Fit",88],["Location Compatibility",92],["Industry Compatibility",94],["Timing Compatibility",85]];return <div className="score-bars">{rows.map(([n,v])=><div key={n}><span>{n}</span><i><em style={{width:v+"%"}}/></i><b>{v}%</b></div>)}</div>}

function Assistant() {
  const [messages,setMessages]=useState([{from:"ai",text:"Hello! I'm SymbioAI 👋 I can help you find rubber matches, analyze waste, explain recommendations, predict demand and suggest cost-efficient options."}]);
  const [input,setInput]=useState("");
  const send=()=>{if(!input.trim())return; const q=input;setInput("");setMessages(m=>[...m,{from:"user",text:q},{from:"ai",text: q.toLowerCase().includes("500")||q.toLowerCase().includes("match") ? "I found 4 potential matches for your rubber waste. The best match is Rubber Recycler A with a 91% compatibility score.": "Based on your rubber-industry data, I recommend running AI matching and checking the demand forecast for NBR and EPDM."}])};
  return <AppShell><PageTitle title="SymbioAI Assistant" subtitle="Your AI-powered rubber industry assistant."/><div className="chat-card"><div className="chat-head"><div className="ai-avatar"><BrainCircuit/></div><div><b>SymbioAI</b><span>Online · Rubber Industry Intelligence</span></div></div><div className="messages">{messages.map((m,i)=><div className={"message "+m.from} key={i}><div>{m.text}</div></div>)}</div><div className="quick"><button onClick={()=>setInput("I have 500 kg of NBR scrap. Who can use it?")}>Find matches</button><button onClick={()=>setInput("Analyze my waste")}>Analyze waste</button><button onClick={()=>setInput("Why is Recycler A better?")}>Explain a match</button><button onClick={()=>setInput("What is the demand for NBR?")}>Demand forecast</button></div><div className="chat-input"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask SymbioAI..."/><button onClick={send}><Send size={18}/></button></div></div></AppShell>
}

function Forecast(){return <AppShell><PageTitle title="AI Demand Forecast" subtitle="Predict future demand for rubber materials using historical exchange data."/><div className="stats"><Stat icon={TrendingUp} value="420 KG" label="Current NBR Demand" accent="green"/><Stat icon={TrendingUp} value="498 KG" label="Next Month · +17%" accent="blue"/><Stat icon={TrendingUp} value="560 KG" label="Next 3 Months · +33%" accent="orange"/><Stat icon={BrainCircuit} value="89%" label="AI Confidence" accent="teal"/></div><Card title="Demand Prediction"><div className="chart"><div className="chart-title"><b>NBR Scrap Demand</b><span>Oct 2026 — Mar 2027</span></div><div className="chart-area"><div className="line one"></div><div className="line two"></div><div className="chart-labels"><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span></div></div></div></Card><div className="grid-two"><Card title="AI Insights"><div className="insight"><Sparkles/><p><b>NBR demand is expected to increase.</b><br/>AI predicts stronger requirements from rubber recyclers and compound manufacturers over the next 3 months.</p></div></Card><Card title="Material Outlook"><div className="outlook">{["NBR","EPDM","Silicone","Natural Rubber"].map((x,i)=><div key={x}><span>{x}</span><b>{[89,72,54,46][i]}%</b><i><em style={{width:[89,72,54,46][i]+"%"}}/></i></div>)}</div></Card></div></AppShell>}

function Optimization(){return <AppShell><PageTitle title="AI Cost & Route Optimization" subtitle="Find the most cost-efficient and sustainable exchange option."/><div className="grid-two"><Card title="Route Overview" icon={Truck}><div className="map-box"><div className="route r1">📍 Supplier<br/><b>Pune</b></div><div className="route r2">🏭 Recycler A<br/><b>32 km</b></div><div className="route r3">🏭 Recycler B<br/><b>56 km</b></div><div className="road"></div></div></Card><Card title="Cost Comparison" icon={CircleDollarSign}><table><thead><tr><th>Option</th><th>Material</th><th>Transport</th><th>Total</th></tr></thead><tbody>{[["Recycler A","₹10,000","₹2,000","₹12,000"],["Recycler B","₹9,500","₹5,500","₹15,000"],["Recycler C","₹10,500","₹8,200","₹18,700"]].map((r,i)=><tr key={i}><td><b>{r[0]}</b>{i===0&&<em className="best">Best Option</em>}</td><td>{r[1]}</td><td>{r[2]}</td><td><b>{r[3]}</b></td></tr>)}</tbody></table><div className="optimization-note"><Sparkles size={17}/><span>AI recommends <b>Recycler A</b> as the most efficient option with lower total cost and shorter transport distance.</span></div></Card></div></AppShell>}

function Exchanges(){return <AppShell><PageTitle title="Resource Exchange" subtitle="Track the status of confirmed exchanges."/><Card title="Exchange EX-2026-001" icon={Handshake}><div className="timeline"><span className="done">Requested<small>10 Oct</small></span><span className="done">Confirmed<small>12 Oct</small></span><span className="current">In Transit</span><span>Completed</span></div><div className="exchange-details"><div><b>Supplier</b><span>Star Enterprises · Pune</span></div><div><b>Receiver</b><span>Rubber Recycler A · Pimpri</span></div><div><b>Material</b><span>NBR Rubber Scrap</span></div><div><b>Quantity</b><span>400 KG</span></div><div><b>Exchange Date</b><span>15 Oct 2026</span></div><div><b>Status</b><span className="blue-text">In Transit</span></div></div><button className="primary">Mark as Completed</button></Card></AppShell>}

function Sustainability(){return <AppShell><PageTitle title="Sustainability Impact" subtitle="Track environmental and economic benefits from resource exchange."/><div className="stats"><Stat icon={Recycle} value="2,450 KG" label="Total Rubber Waste Listed" accent="green"/><Stat icon={Leaf} value="1,680 KG" label="Waste Successfully Matched" accent="teal"/><Stat icon={Leaf} value="1.68 Ton" label="Potential Waste Diversion" accent="blue"/><Stat icon={CircleDollarSign} value="₹42,500" label="Estimated Cost Saving" accent="orange"/></div><div className="grid-two"><Card title="AI Sustainability Analysis" icon={BrainCircuit}><div className="impact"><div><b>68%</b><span>Disposal Reduction</span></div><div><b>1.24 t</b><span>Estimated CO₂ Avoidance</span></div><div><b>18%</b><span>Potential Transport Impact Reduction</span></div></div><div className="insight"><Sparkles/><p><b>AI Insight:</b> Local exchanges could reduce transport-related impact while improving rubber waste diversion.</p></div></Card><Card title="Waste Category Distribution"><div className="donut big"><div><b>2,450</b><span>KG Total</span></div></div><div className="legend"><span><i className="dot green"></i>NBR Scrap <b>35%</b></span><span><i className="dot blue"></i>EPDM Scrap <b>25%</b></span><span><i className="dot orange"></i>Rejected O-Rings <b>18%</b></span><span><i className="dot gray"></i>Rubber Granules <b>15%</b></span></div></Card></div></AppShell>}

function Profile(){return <AppShell><PageTitle title="Industry Profile" subtitle="Manage your rubber manufacturing organization details."/><Card title="Star Enterprises" icon={Factory}><form className="form-grid"><label>Industry Name<input defaultValue="Star Enterprises"/></label><label>Industry Type<select defaultValue="Rubber Manufacturing"><option>Rubber Manufacturing</option><option>Rubber Recycling</option></select></label><label>Production Type<input defaultValue="O-Rings / Seals / Gaskets"/></label><label>Location<input defaultValue="Pune, Maharashtra"/></label><label>Contact Person<input defaultValue="Industry Administrator"/></label><label>Email<input defaultValue="admin@starenterprises.com"/></label><label>Phone<input defaultValue="+91 98765 43210"/></label><button className="primary">Save Changes</button></form></Card></AppShell>}

function Page404(){return <AppShell><div className="empty-page"><ShieldCheck size={50}/><h2>Page not found</h2><Link to="/dashboard" className="primary">Back to Dashboard</Link></div></AppShell>}

export default function App(){
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
    <Route path="/dashboard" element={<Dashboard/>}/>
    <Route path="/profile" element={<Profile/>}/>
    <Route path="/waste" element={<Waste/>}/>
    <Route path="/requirement" element={<Requirement/>}/>
    <Route path="/matches" element={<Matches/>}/>
    <Route path="/assistant" element={<Assistant/>}/>
    <Route path="/forecast" element={<Forecast/>}/>
    <Route path="/optimization" element={<Optimization/>}/>
    <Route path="/exchanges" element={<Exchanges/>}/>
    <Route path="/sustainability" element={<Sustainability/>}/>
    <Route path="*" element={<Page404/>}/>
  </Routes>
}