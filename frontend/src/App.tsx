import React, { useState, useEffect } from "react";
import { 
  MessageSquare, Share2, 
  Phone, User, Car, Briefcase, Download, 
  Mic, MicOff, Volume2, Volume1, VolumeX, Search, ArrowRight, TrendingUp, AlertTriangle, HelpCircle, Sun, Moon,
  Copy, Check
} from "lucide-react";
import { 
  ResponsiveContainer, XAxis, YAxis, 
  Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend 
} from "recharts";

// Interfaces
interface Case {
  id: string;
  fir_number: string;
  police_station: string;
  district: string;
  crime_head: string;
  date_of_offence: string;
  date_of_registration: string;
  description: string;
  status: string;
  accused: string[];
  location: string;
  phone_numbers: string[];
  vehicles: string[];
  bank_accounts: string[];
}

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  confidence_score?: number;
  evidence_trail?: string[];
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphLink {
  source: string;
  target: string;
  relationship: string;
}

interface Theme {
  id: "dark" | "light";
  name: string;
  bodyBg: string;
  cardBg: string;
  border: string;
  textMain: string;
  textMuted: string;
  accentBg: string;
  accentText: string;
  chatUser: string;
  chatAssistant: string;
  chartGrid: string;
  chartStroke: string;
  chartBar: string;
  chartLine: string;
  nodeIncident: string;
  nodeAccused: string;
  nodePhone: string;
  nodeVehicle: string;
  nodeBankAccount: string;
}

const THEMES: Theme[] = [
  {
    id: "dark",
    name: "Dark Mode",
    bodyBg: "bg-[#060608] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0d0d15] via-[#060608] to-[#010102]",
    cardBg: "glass-panel-dark",
    border: "border-slate-800/80",
    textMain: "text-slate-100",
    textMuted: "text-slate-400",
    accentBg: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.45)] transition-all duration-300",
    accentText: "text-white",
    chatUser: "bg-gradient-to-br from-blue-600/15 to-indigo-600/20 border border-blue-500/30 text-slate-100",
    chatAssistant: "bg-[#0a0a0f]/90 border border-slate-800/90 text-slate-100",
    chartGrid: "#181824",
    chartStroke: "#475569",
    chartBar: "#3b82f6",
    chartLine: "#06b6d4",
    nodeIncident: "#ef4444",
    nodeAccused: "#f59e0b",
    nodePhone: "#06b6d4",
    nodeVehicle: "#10b981",
    nodeBankAccount: "#8b5cf6"
  },
  {
    id: "light",
    name: "Light Mode",
    bodyBg: "bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]",
    cardBg: "glass-panel-light",
    border: "border-slate-200/80",
    textMain: "text-slate-900",
    textMuted: "text-slate-500",
    accentBg: "bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)] transition-all duration-300",
    accentText: "text-white",
    chatUser: "bg-indigo-50 border border-indigo-100/80 text-indigo-950",
    chatAssistant: "bg-white/90 border border-slate-200/90 text-slate-900",
    chartGrid: "#e2e8f0",
    chartStroke: "#94a3b8",
    chartBar: "#4f46e5",
    chartLine: "#2563eb",
    nodeIncident: "#dc2626",
    nodeAccused: "#d97706",
    nodePhone: "#0891b2",
    nodeVehicle: "#059669",
    nodeBankAccount: "#7c3aed"
  }
];

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "network" | "cases">("dashboard");
  const [language, setLanguage] = useState<"en" | "kn">("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  
  // Theme state
  const [theme, setTheme] = useState<Theme>(THEMES[0]);

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatSessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "CrimeMind AI Online. Authorized access granted to Inspector Gowda. System operates under security protocol KSP-A9.",
      confidence_score: 1.0,
      evidence_trail: ["System startup initialized with active database links."]
    }
  ]);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechVolume, setSpeechVolume] = useState(0.8);

  // Copy state for chat messages
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  // Graph state
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([
    { id: "FIR-10235", label: "FIR-10235 (Burglary)", type: "incident" },
    { id: "Accused-101", label: "Ramesh Kumar (Suspect)", type: "accused" },
    { id: "Phone-9876543211", label: "9876543211", type: "phone" },
    { id: "Vehicle-KA05MJ1001", label: "KA-05-MJ-1001", type: "vehicle" }
  ]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([
    { source: "Accused-101", target: "FIR-10235", relationship: "COMMITTED" },
    { source: "Accused-101", target: "Phone-9876543211", relationship: "USED_PHONE" },
    { source: "Accused-101", target: "Vehicle-KA05MJ1001", relationship: "DRIVES" }
  ]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Load cases from mock API or local fallback on init
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/cases/all`)
      .then(res => res.json())
      .then(data => setCases(data))
      .catch(() => {
        // Fallback mock cases
        const mock: Case[] = Array.from({ length: 15 }, (_, i) => ({
          id: `case-${i}`,
          fir_number: `FIR-10${234 + i}/2026`,
          police_station: i % 2 === 0 ? "Jayanagar PS" : "Indiranagar PS",
          district: "Bengaluru City",
          crime_head: i % 3 === 0 ? "Burglary" : (i % 3 === 1 ? "Vehicle Theft" : "Cyber Fraud"),
          date_of_offence: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000).toISOString(),
          date_of_registration: new Date(Date.now() - i * 4 * 24 * 60 * 60 * 1000).toISOString(),
          description: i % 3 === 0 
            ? "Burglary reported at residential building in Bengaluru. Suspect entered through window lock bypass at night. Stole gold ornaments." 
            : (i % 3 === 1 ? "Vehicle theft of Royal Enfield Bullet. Stolen from parking slot outside commercial complex." : "Phishing fraud via WhatsApp payment link."),
          status: i % 5 === 0 ? "Closed" : "Under Investigation",
          accused: [`Accused-${100 + (i % 5)}`],
          location: i % 2 === 0 ? "Jayanagar 4th Block" : "Indiranagar 100ft Road",
          phone_numbers: [`98765432${i%10}${i%10}`],
          vehicles: i % 3 === 1 ? [`KA-05-MJ-${1000 + i}`] : [],
          bank_accounts: i % 3 === 2 ? [`SBIN0001${2345 + i}`] : []
        }));
        setCases(mock);
      });
  }, []);

  // Synchronize theme state with the root html class for Tailwind dark selector
  useEffect(() => {
    if (theme.id === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme.id]);

  // Web Speech API: Text-to-Speech
  const speakText = (text: string) => {
    if (speechVolume === 0) return;
    const cleanText = text.replace(/[^\w\s\u0C80-\u0CFF]/gi, ''); // Retain Kannada & English
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === "kn" ? "kn-IN" : "en-US";
    utterance.volume = speechVolume; // Set speech volume level (0.0 to 1.0)
    window.speechSynthesis.speak(utterance);
  };

  // Web Speech API: Speech-to-Text
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === "kn" ? "kn-IN" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setChatInput(speechToText);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  // Submit chat queries
  const submitChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setLoadingResponse(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          session_id: chatSessionId,
          language: language
        })
      });
      const data = await res.json();
      
      const assistantMsg: Message = {
        role: "assistant",
        text: data.message,
        sources: data.sources,
        confidence_score: data.confidence_score,
        evidence_trail: data.evidence_trail
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      // Update Graph visualization with new node context if available
      if (data.graph_data?.nodes) {
        setGraphNodes(data.graph_data.nodes);
      }
      if (data.graph_data?.links) {
        setGraphLinks(data.graph_data.links);
      }

      speakText(data.message);
    } catch (err) {
      // Local fallback simulator for offline/standalone execution
      setTimeout(() => {
        let text = `Simulated response: Analyzed databases for search term "${userMsg}". No backend connections detected.`;
        if (userMsg.toLowerCase().includes("burglary")) {
          text = "Found 3 matching Burglaries in South Bengaluru. Accessing cases FIR-10234, FIR-10237, showing residential lock entry similarity patterns.";
        }
        setMessages(prev => [...prev, {
          role: "assistant",
          text: text,
          confidence_score: 0.88,
          sources: ["FIR-10234", "FIR-10237"],
          evidence_trail: ["Pattern detected via Jayanagar police precinct reports."]
        }]);
        speakText(text);
      }, 800);
    } finally {
      setLoadingResponse(false);
    }
  };

  // Export PDF
  const downloadPdf = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: chatSessionId })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CrimeMind_Session_${chatSessionId.slice(0,6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert("Could not connect to backend. Backend needs to be running to generate PDFs.");
    }
  };

  // Helper to generate UUID
  function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  // Analytics mock data
  const crimeTrends = [
    { month: "Jan", Burglaries: 12, Theft: 34, Fraud: 18 },
    { month: "Feb", Burglaries: 15, Theft: 30, Fraud: 24 },
    { month: "Mar", Burglaries: 22, Theft: 42, Fraud: 28 },
    { month: "Apr", Burglaries: 18, Theft: 45, Fraud: 35 },
    { month: "May", Burglaries: 27, Theft: 38, Fraud: 42 },
    { month: "Jun", Burglaries: 31, Theft: 50, Fraud: 39 },
  ];

  const crimeTypes = [
    { name: "Burglary", value: 40, color: theme.id === "dark" ? "#ffffff" : "#000000" },
    { name: "Vehicle Theft", value: 35, color: theme.id === "dark" ? "#a1a1aa" : "#52525b" },
    { name: "Cyber Fraud", value: 25, color: theme.id === "dark" ? "#52525b" : "#a1a1aa" }
  ];

  const toggleTheme = () => {
    setTheme(prev => prev.id === "dark" ? THEMES[1] : THEMES[0]);
  };

  return (
    <div className={`min-h-screen ${theme.bodyBg} ${theme.textMain} transition-colors duration-300 flex flex-col font-sans selection:${theme.id === "dark" ? "bg-cyan-500 text-black" : "bg-indigo-600 text-white"}`}>
      {/* Header */}
      <header className={`border-b ${theme.border} bg-transparent px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 ${theme.textMain}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${theme.id === "dark" ? "from-cyan-500/10 to-blue-500/20 border border-cyan-500/30" : "from-indigo-100 to-blue-100 border border-indigo-200/60"}`}>
            <img src="/logo.png" className="w-5 h-5 object-cover rounded-md" alt="CrimeMind Logo" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight font-sans">
              CrimeMind AI
            </h1>
            <p className={`text-[9px] ${theme.textMuted} font-mono uppercase tracking-widest`}>KSP Intelligence Command Console</p>
          </div>
        </div>

        {/* Minimal Underlined Navigation Tabs */}
        <nav className="flex gap-1.5 bg-slate-500/10 dark:bg-white/5 p-1 rounded-full border border-slate-200/50 dark:border-slate-800/40">
          {(["dashboard", "chat", "network", "cases"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all rounded-full cursor-pointer relative ${
                activeTab === tab 
                  ? `${theme.accentText} bg-gradient-to-r ${theme.id === "dark" ? "from-cyan-500 to-blue-600" : "from-indigo-600 to-blue-700"} shadow-sm` 
                  : `${theme.textMuted} hover:${theme.textMain}`
              }`}
            >
              {tab === "chat" ? "AI Assistant" : tab === "network" ? "Link Analysis" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {/* Actions & Theme Picker */}
        <div className="flex items-center gap-6">
          {/* Language Selector */}
          <div className="flex items-center gap-2 text-xs">
            <button 
              onClick={() => setLanguage("en")} 
              className={`hover:${theme.textMain} transition-all cursor-pointer ${language === "en" ? "font-bold text-slate-300 dark:text-white" : theme.textMuted}`}
            >
              EN
            </button>
            <span className={theme.textMuted}>/</span>
            <button 
              onClick={() => setLanguage("kn")} 
              className={`hover:${theme.textMain} transition-all cursor-pointer ${language === "kn" ? "font-bold text-slate-300 dark:text-white" : theme.textMuted}`}
            >
              ಕನ್ನಡ
            </button>
          </div>

          {/* Theme Toggle Switch */}
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-full border ${theme.border} hover:bg-slate-500/10 transition-all cursor-pointer flex items-center justify-center`}
            title="Switch Theme"
          >
            {theme.id === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Inspector Badge Details */}
          <div className={`text-right border-l ${theme.border} pl-5`}>
            <div className="text-xs font-semibold">
              Inspector Gowda
            </div>
            <div className={`text-[9px] ${theme.textMuted} font-mono uppercase tracking-wider`}>KSP-8932</div>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Minimal Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: "Active Cases", val: "142", trend: "+8% vs last month" },
                { label: "Suspects Monitored", val: "89", trend: "Mapping connections" },
                { label: "AI Match Rate", val: "92%", trend: "Average confidence" },
                { label: "Burglary Threat Alert", val: "High Probability", trend: "Jayanagar Sector 4", critical: true }
              ].map((m, idx) => (
                <div key={idx} className={`p-6 rounded-2xl border ${theme.border} ${theme.cardBg} transition-all duration-300 hover:shadow-lg hover:border-slate-500/30 group relative overflow-hidden ${theme.textMain}`}>
                  {/* Glowing top line */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${m.critical ? 'from-amber-500 to-red-500' : 'from-cyan-500 to-blue-600'}`} />
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-widest`}>{m.label}</div>
                    <span className={`w-2.5 h-2.5 rounded-full ${m.critical ? 'bg-red-500 glow-indicator-red' : 'bg-emerald-500 glow-indicator-green'}`} />
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{m.val}</div>
                  <div className={`text-[10px] ${theme.textMuted} mt-2 font-mono uppercase tracking-wider`}>{m.trend}</div>
                </div>
              ))}
            </div>

            {/* Hotspots & Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trends Line Chart */}
              <div className={`lg:col-span-2 border ${theme.border} ${theme.cardBg} p-5 rounded-2xl flex flex-col shadow-sm ${theme.textMain}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Six-Month Criminology Projection
                </h3>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={crimeTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} />
                      <XAxis dataKey="month" stroke={theme.chartStroke} fontSize={10} tickLine={false} />
                      <YAxis stroke={theme.chartStroke} fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: theme.id === "dark" ? "#0a0a0f" : "#ffffff", borderColor: theme.id === "dark" ? "#1e293b" : "#e2e8f0", borderRadius: "12px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="Burglaries" stroke={theme.chartLine} strokeWidth={2} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="Theft" stroke={theme.chartStroke} strokeWidth={1} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="Fraud" stroke={theme.chartBar} strokeWidth={1} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Crime Type distribution */}
              <div className={`border ${theme.border} ${theme.cardBg} p-5 rounded-2xl flex flex-col items-center justify-between shadow-sm ${theme.textMain}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 self-start mb-4">
                  Active Crime Categories
                </h3>
                <div className="w-full h-44 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={crimeTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {crimeTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke={theme.id === "dark" ? "#07070a" : "#ffffff"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: theme.id === "dark" ? "#0a0a0f" : "#ffffff", borderColor: theme.id === "dark" ? "#1e293b" : "#e2e8f0", borderRadius: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center w-full mt-4">
                  {crimeTypes.map((c, i) => (
                    <div key={i} className="text-xs">
                      <div className="font-semibold text-slate-400">{c.name}</div>
                      <div className={`text-[10px] ${theme.textMuted} mt-0.5 font-mono`}>{c.value}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Leads suggestion panel */}
            <div className={`border ${theme.border} ${theme.cardBg} p-6 rounded-2xl shadow-sm ${theme.textMain}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                AI Generated Investigation Leads
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: "Modus Operandi Match", desc: "A burglary at Indiranagar matches recent Jayanagar incident (FIR-10234). Both bypassed lock cylinders using identical templates.", conf: "94% Conf", act: "Run Verification" },
                  { title: "Offender Network Alert", desc: "Accused Ramesh Kumar identified co-communicating with an absconding burglar via phone node: 9876543211.", conf: "89% Conf", act: "Graph Links" },
                  { title: "Financial Anomaly", desc: "High-volume transfer linked to Cyber Fraud Case was routed to SBI Account SBIN0001237.", conf: "91% Conf", act: "Audit Log" }
                ].map((lead, lIdx) => (
                  <div key={lIdx} className={`border ${theme.border} p-5 rounded-xl flex flex-col justify-between hover:border-blue-500/50 hover:bg-slate-500/5 hover:-translate-y-0.5 transition-all duration-300 ${theme.textMain}`}>
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-zinc-800/10 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest">{lead.title}</span>
                        <span className={`text-[10px] font-mono ${theme.textMuted}`}>{lead.conf}</span>
                      </div>
                      <p className={`text-xs ${theme.textMuted} leading-relaxed`}>{lead.desc}</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (lead.act === "Graph Links") setActiveTab("network");
                        else {
                          setActiveTab("chat");
                          setChatInput(`Analyze ${lead.title} details`);
                        }
                      }}
                      className={`mt-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:underline text-left cursor-pointer`}
                    >
                      {lead.act} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI ASSISTANT CHAT */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[72vh]">
            {/* Chat conversation area */}
            <div className={`lg:col-span-2 flex flex-col border ${theme.border} ${theme.cardBg} rounded-2xl overflow-hidden h-full shadow-lg ${theme.textMain}`}>
              {/* Chat Header */}
              <div className={`p-4 bg-transparent border-b ${theme.border} flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full glow-indicator-green"></div>
                  <span className="text-xs font-mono uppercase tracking-wider">Session Console</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center gap-1.5 group/vol bg-slate-500/5 dark:bg-white/5 px-2.5 py-1 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
                    <button 
                      onClick={() => setSpeechVolume(prev => prev === 0 ? 0.8 : 0)}
                      className={`p-1 rounded-lg hover:bg-slate-500/10 transition-all cursor-pointer ${speechVolume > 0 ? theme.textMain : 'text-zinc-500'}`}
                      title={speechVolume === 0 ? "Unmute speech" : "Mute speech"}
                    >
                      {speechVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-500" />
                      ) : speechVolume < 0.4 ? (
                        <Volume1 className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-cyan-400 dark:text-cyan-400" />
                      )}
                    </button>
                    {/* Volume Slider - expands on hover/interaction */}
                    <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-300 flex items-center">
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        value={speechVolume} 
                        onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 h-1 rounded-lg cursor-pointer bg-slate-300 dark:bg-slate-700"
                        title={`Volume: ${Math.round(speechVolume * 100)}%`}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={downloadPdf}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-all border ${theme.border} bg-transparent px-3 py-1.5 rounded-xl cursor-pointer`}
                  >
                    <Download className="w-3.5 h-3.5" /> PDF REPORT
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-xs">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 relative group transition-all duration-200 ${
                      m.role === "user" ? theme.chatUser + ' rounded-tr-sm' : theme.chatAssistant + ' rounded-tl-sm'
                    } shadow-sm hover:shadow-md`}>
                      
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(m.text, idx)}
                        className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer ${
                          theme.id === "dark" 
                            ? "hover:bg-slate-800/80 text-slate-400 hover:text-slate-100" 
                            : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                        }`}
                        title="Copy message"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <p className="leading-relaxed pr-6 whitespace-pre-wrap">{m.text}</p>
                      
                      {m.role === "assistant" && (m.confidence_score !== undefined || m.sources || m.evidence_trail) && (
                        <div className="mt-3.5 pt-3 border-t border-slate-500/10 space-y-2 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-500">CONFIDENCE SCORE:</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              theme.id === "dark" ? "bg-slate-800 text-cyan-400" : "bg-indigo-50 text-indigo-700"
                            }`}>{((m.confidence_score ?? 0) * 100).toFixed(0)}%</span>
                          </div>
                          
                          {m.sources && m.sources.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-500">SOURCES:</span>
                              {m.sources.map((src, sIdx) => (
                                <span key={sIdx} className="bg-slate-500/10 px-1.5 py-0.5 rounded text-[9px] border border-slate-500/5">{src}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loadingResponse && (
                  <div className="flex justify-start">
                    <div className="bg-slate-500/5 border border-slate-800 rounded-xl p-4 max-w-[80%] flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 bg-zinc-500 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-zinc-500 animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-zinc-500 animate-bounce delay-200"></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={submitChat} className={`p-4 border-t ${theme.border} flex gap-3 bg-slate-500/5`}>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={language === "kn" ? "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಇತ್ತೀಚಿನ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸಿ..." : "Show burglary cases in Bengaluru..."}
                  className={`flex-1 bg-transparent border ${theme.border} rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${theme.textMain} placeholder-slate-500`}
                />
                
                <button 
                  type="button"
                  onClick={startListening}
                  className={`p-3 rounded-xl border ${theme.border} transition-all cursor-pointer ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-slate-500/10 text-slate-400'}`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button 
                  type="submit"
                  disabled={loadingResponse || !chatInput.trim()}
                  className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl uppercase font-bold tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1.5 cursor-pointer shadow-sm`}
                >
                  Send
                </button>
              </form>
            </div>

            {/* Quick guide panel */}
            <div className={`border ${theme.border} ${theme.cardBg} rounded-2xl p-5 space-y-5 flex flex-col justify-between shadow-lg ${theme.textMain}`}>
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-zinc-500" /> Criminology Guide
                </h3>
                <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
                  Ask CrimeMind AI queries regarding burglary patterns, offender links, phone nodes, or transactions.
                </p>
                <div className="space-y-2">
                  {[
                    "Burglary cases in Bengaluru",
                    "Trace transactions for SBIN0001237",
                    "Which suspects link to Accused-101"
                  ].map((q, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setChatInput(q)}
                      className={`w-full text-left p-3 bg-slate-500/5 rounded-xl border ${theme.border} hover:border-slate-500/50 transition-all text-xs font-mono ${theme.textMuted} hover:${theme.textMain} cursor-pointer`}
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-500/5 rounded-xl border border-zinc-950/20 dark:border-white/5 text-xs">
                <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Compliance Log</div>
                <div className="text-zinc-500 font-mono space-y-0.5 text-[10px]">
                  <div>Officer: KSP-8932</div>
                  <div>Record: Auto-Audit Active</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RELATIONSHIP INTELLIGENCE */}
        {activeTab === "network" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[72vh]">
            <div className={`lg:col-span-3 border ${theme.border} ${theme.cardBg} rounded-2xl overflow-hidden flex flex-col relative shadow-lg ${theme.textMain}`}>
              <div className={`p-4 bg-transparent border-b ${theme.border} flex items-center justify-between`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Criminal Relationship Graph</h3>
                <span className="text-[10px] text-slate-500 font-mono">Hover nodes for metadata</span>
              </div>
              
              <div className="flex-1 relative bg-transparent flex items-center justify-center">
                <svg className="w-full h-full cursor-crosshair">
                  {graphLinks.map((link, idx) => {
                    const srcNode = graphNodes.find(n => n.id === link.source);
                    const tgtNode = graphNodes.find(n => n.id === link.target);
                    if (!srcNode || !tgtNode) return null;
                    
                    const srcIndex = graphNodes.indexOf(srcNode);
                    const tgtIndex = graphNodes.indexOf(tgtNode);
                    const x1 = 150 + (srcIndex * 90) % 500;
                    const y1 = 100 + (srcIndex * 110) % 300;
                    const x2 = 150 + (tgtIndex * 90) % 500;
                    const y2 = 100 + (tgtIndex * 110) % 300;

                    return (
                      <g key={idx}>
                        <line 
                          x1={x1} y1={y1} x2={x2} y2={y2} 
                          stroke={theme.id === "dark" ? "#1e293b" : "#cbd5e1"} strokeWidth="1.5"
                          className="transition-all"
                        />
                        <text 
                          x={(x1 + x2)/2} y={(y1 + y2)/2 - 5}
                          fill="#64748b" fontSize="8" textAnchor="middle" className="font-mono select-none"
                        >
                          {link.relationship}
                        </text>
                      </g>
                    );
                  })}

                  {graphNodes.map((node, idx) => {
                    const x = 150 + (idx * 90) % 500;
                    const y = 100 + (idx * 110) % 300;
                    
                    let nodeColor = theme.nodeIncident;
                    if (node.type === "accused") nodeColor = theme.nodeAccused; 
                    if (node.type === "phone") nodeColor = theme.nodePhone; 
                    if (node.type === "vehicle") nodeColor = theme.nodeVehicle; 
                    if (node.type === "bank_account") nodeColor = theme.nodeBankAccount; 

                    return (
                      <g 
                        key={idx} 
                        transform={`translate(${x}, ${y})`}
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="cursor-pointer group"
                      >
                        {/* Outer glow ring */}
                        <circle 
                          r={hoveredNode?.id === node.id ? "16" : "13"} 
                          fill={nodeColor}
                          opacity="0.25"
                          className="transition-all duration-300"
                        />
                        {/* Main circle */}
                        <circle 
                          r={hoveredNode?.id === node.id ? "10" : "8"} 
                          fill={nodeColor} 
                          stroke={theme.id === "dark" ? "#07070a" : "#ffffff"}
                          strokeWidth="1.5"
                          className="transition-all duration-300 shadow-md"
                        />
                        <text 
                          y="24" 
                          fill={theme.id === "dark" ? "#ffffff" : "#0f172a"} 
                          fontSize="9" 
                          textAnchor="middle" 
                          className="font-sans font-medium select-none"
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {hoveredNode && (
                  <div className="absolute top-4 right-4 bg-slate-900/95 dark:bg-black/95 border border-slate-800 p-4 rounded-xl shadow-xl max-w-xs text-xs font-mono space-y-1 text-slate-100">
                    <div className="font-bold text-cyan-400 border-b border-slate-800 pb-1 mb-1">Entity metadata</div>
                    <div>ID: {hoveredNode.id}</div>
                    <div>Name: {hoveredNode.label}</div>
                    <div>Type: {hoveredNode.type.toUpperCase()}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Network legend */}
            <div className={`border ${theme.border} ${theme.cardBg} rounded-2xl p-5 space-y-5 text-xs shadow-lg ${theme.textMain}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Graph Properties</h3>
              
              <div className="space-y-3">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Node types</div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.nodeIncident }} /> Incident Case Node
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.nodeAccused }} /> Accused / Suspect Node
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.nodePhone }} /> Phone Node
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.nodeVehicle }} /> Vehicle Node
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.nodeBankAccount }} /> Bank Account Node
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CASES PORTAL */}
        {activeTab === "cases" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Case List */}
            <div className={`lg:col-span-1 border ${theme.border} ${theme.cardBg} rounded-2xl overflow-hidden shadow-lg ${theme.textMain}`}>
              <div className={`p-4 bg-transparent border-b ${theme.border} flex items-center justify-between`}>
                <h3 className="text-xs font-bold uppercase tracking-wider">FIR Database</h3>
                <span className="text-[10px] text-slate-500 font-mono">{cases.length} entries</span>
              </div>
              <div className="p-3 border-b border-slate-500/10">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    placeholder="Search case registry..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full bg-transparent border ${theme.border} rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 ${theme.textMain} placeholder-slate-500`}
                  />
                </div>
              </div>
              <div className="divide-y divide-slate-500/15 overflow-y-auto max-h-[58vh]">
                {cases
                  .filter(c => c.fir_number.includes(searchQuery) || c.crime_head.toLowerCase().includes(searchQuery.toLowerCase()) || c.location.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c) => (
                    <button 
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className={`w-full text-left p-4 hover:bg-slate-500/5 transition-all flex flex-col gap-1 cursor-pointer ${theme.textMain} ${
                        selectedCase?.id === c.id 
                          ? (theme.id === "dark" ? "bg-slate-800/60 border-l-4 border-cyan-500" : "bg-indigo-50 border-l-4 border-indigo-600") 
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold">{c.fir_number}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          c.status === "Closed" ? "border-emerald-500/30 text-emerald-500" : "border-amber-500/30 text-amber-500"
                        }`}>{c.status}</span>
                      </div>
                      <h4 className="text-xs font-semibold">{c.crime_head}</h4>
                      <p className={`text-[11px] ${theme.textMuted} truncate`}>{c.description}</p>
                    </button>
                ))}
              </div>
            </div>

            {/* Case Details */}
            <div className={`lg:col-span-2 border ${theme.border} ${theme.cardBg} rounded-2xl p-6 flex flex-col justify-between shadow-lg ${theme.textMain}`}>
              {selectedCase ? (
                <div className="space-y-6">
                  <div className="border-b border-slate-500/10 pb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-500/10">{selectedCase.fir_number}</span>
                      <span className="text-xs text-slate-500 font-mono">{selectedCase.police_station}</span>
                    </div>
                    <h2 className="text-lg font-bold">{selectedCase.crime_head}</h2>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modus Operandi Details</h3>
                    <p className={`text-xs ${theme.textMuted} leading-relaxed bg-slate-500/5 p-4 rounded-xl border ${theme.border} font-mono`}>{selectedCase.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 bg-slate-500/5 rounded-xl border ${theme.border} hover:bg-slate-500/10 transition-colors duration-200 space-y-1`}>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Accused Suspects</div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-mono">{selectedCase.accused.join(", ")}</span>
                      </div>
                    </div>
                    
                    <div className={`p-3 bg-slate-500/5 rounded-xl border ${theme.border} hover:bg-slate-500/10 transition-colors duration-200 space-y-1`}>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Linked Phone Nodes</div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="text-xs font-mono">{selectedCase.phone_numbers.join(", ") || "None"}</span>
                      </div>
                    </div>

                    <div className={`p-3 bg-slate-500/5 rounded-xl border ${theme.border} hover:bg-slate-500/10 transition-colors duration-200 space-y-1`}>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Vehicles Involved</div>
                      <div className="flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-mono">{selectedCase.vehicles.join(", ") || "None"}</span>
                      </div>
                    </div>

                    <div className={`p-3 bg-slate-500/5 rounded-xl border ${theme.border} hover:bg-slate-500/10 transition-colors duration-200 space-y-1`}>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Bank Accounts</div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-xs font-mono">{selectedCase.bank_accounts.join(", ") || "None"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-500/10 pt-4 flex gap-3">
                    <button 
                      onClick={() => { setActiveTab("chat"); setChatInput(`Show me details and leads for ${selectedCase.fir_number}`); }}
                      className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-sm`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> AI Inquiry
                    </button>
                    <button 
                      onClick={() => { 
                        setActiveTab("network");
                        setGraphNodes([
                          { id: selectedCase.fir_number, label: selectedCase.fir_number, type: "incident" },
                          { id: selectedCase.accused[0], label: `${selectedCase.accused[0]} (Accused)`, type: "accused" },
                          { id: selectedCase.phone_numbers[0] || "Phone-9900", label: selectedCase.phone_numbers[0] || "9876543200", type: "phone" }
                        ]);
                        setGraphLinks([
                          { source: selectedCase.accused[0], target: selectedCase.fir_number, relationship: "COMMITTED" },
                          { source: selectedCase.accused[0], target: selectedCase.phone_numbers[0] || "Phone-9900", relationship: "USED_PHONE" }
                        ]);
                      }}
                      className={`border ${theme.border} bg-transparent hover:bg-slate-500/10 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${theme.textMain}`}
                    >
                      <Share2 className="w-3.5 h-3.5" /> View Network Links
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-20 text-slate-500">
                  <img src="/logo.png" className="w-12 h-12 mb-3.5 object-contain opacity-50 animate-pulse grayscale" alt="CrimeMind Logo" />
                  <p className="text-xs font-semibold">Select a case file from the registry to inspect records.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t ${theme.border} py-4 px-6 text-center text-[10px] ${theme.textMuted} font-mono uppercase tracking-widest`}>
        Karnataka State Police • CrimeMind AI Intelligence Console • RESTRICTED
      </footer>
    </div>
  );
}

export default App;
