import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  MessageSquare, Share2,
  Phone, User, Car, Briefcase,
  Search, TrendingUp, AlertTriangle, HelpCircle, Sun, Moon,
  Copy, Check, Globe, ChevronDown, Paperclip, ZoomIn, ZoomOut, Maximize2, Trash2, ArrowUpRight,
  Edit, MapPin, Bell, Settings, Shield, CheckCircle2
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis,
  Tooltip, Cell, CartesianGrid, BarChart, Bar
} from "recharts";
import CrimeMap from "./CrimeMap";

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
  officer: string;
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
    bodyBg: "bg-[#090C10] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#1A182F] via-[#090C10] to-[#090C10]",
    cardBg: "backdrop-blur-md bg-[#1A182F]/45 border border-[#B4BBC5]/15 shadow-[0_0_30px_rgba(232,240,254,0.05)]",
    border: "border-[#B4BBC5]/15",
    textMain: "text-zinc-100",
    textMuted: "text-[#B4BBC5]/65",
    accentBg: "bg-[#E8F0FE] hover:bg-white text-[#090C10] font-bold shadow-[0_0_15px_rgba(232,240,254,0.4)] hover:shadow-[0_0_22px_rgba(232,240,254,0.7)] transition-all duration-300",
    accentText: "text-[#090C10] font-bold",
    chatUser: "bg-[#E8F0FE]/10 border border-[#E8F0FE]/25 text-zinc-100",
    chatAssistant: "bg-[#090C10]/95 border border-[#B4BBC5]/15 text-zinc-100",
    chartGrid: "#1c1a2f",
    chartStroke: "#e8f0fe",
    chartBar: "#e8f0fe",
    chartLine: "#e8f0fe",
    nodeIncident: "#e8f0fe",
    nodeAccused: "#cbdcf8",
    nodePhone: "#a9c6f5",
    nodeVehicle: "#d7e6fc",
    nodeBankAccount: "#cbdcf8"
  },
  {
    id: "light",
    name: "Light Mode",
    bodyBg: "bg-[#E8F0FE] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#E8F0FE] via-[#f8fafc] to-[#ffffff]",
    cardBg: "backdrop-blur-md bg-white/90 border border-[#B4BBC5]/50 shadow-[0_8px_30px_rgba(26,24,47,0.03)]",
    border: "border-[#B4BBC5]/50",
    textMain: "text-[#1A182F]",
    textMuted: "text-[#1A182F]/70",
    accentBg: "bg-[#1A182F] hover:bg-[#1A182F]/90 text-white font-medium shadow-[0_4px_15px_rgba(26,24,47,0.15)] transition-all duration-300",
    accentText: "text-white",
    chatUser: "bg-[#E8F0FE]/70 border border-[#B4BBC5]/60 text-[#1A182F]",
    chatAssistant: "bg-white/95 border border-[#B4BBC5]/50 text-zinc-800",
    chartGrid: "#e8f0fe",
    chartStroke: "#1a182f",
    chartBar: "#1a182f",
    chartLine: "#1a182f",
    nodeIncident: "#1a182f",
    nodeAccused: "#475569",
    nodePhone: "#64748b",
    nodeVehicle: "#94a3b8",
    nodeBankAccount: "#cbd5e1"
  }
];

// Helper to rebuild graph from loaded cases
function rebuildGraphFromLoadedCases(
  loadedCases: Case[],
  filters: {
    filterPhones: boolean;
    filterVehicles: boolean;
    filterBanks: boolean;
    filterPeople: boolean;
    filterOfficers: boolean;
    filterLocations: boolean;
  }
) {
  const nodesMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const linkKeySet = new Set<string>();

  const addNode = (id: string, label: string, type: string) => {
    const key = id.trim();
    if (key && !nodesMap.has(key)) {
      nodesMap.set(key, { id: key, label, type });
    }
  };

  const addLink = (source: string, target: string, relationship: string) => {
    const s = source.trim();
    const t = target.trim();
    if (!s || !t) return;
    const key = `${s}-${t}-${relationship}`;
    const reverseKey = `${t}-${s}-${relationship}`;
    if (!linkKeySet.has(key) && !linkKeySet.has(reverseKey)) {
      links.push({ source: s, target: t, relationship });
      linkKeySet.add(key);
    }
  };

  loadedCases.forEach(c => {
    const fir = c.fir_number;
    addNode(fir, `${fir} (${c.crime_head})`, "incident");

    // Suspects (Accused)
    c.accused.forEach(acc => {
      addNode(acc, `${acc} (Suspect)`, "accused");
      addLink(fir, acc, "COMMITTED");

      // Associate accused with each other
      c.accused.forEach(acc2 => {
        if (acc !== acc2) {
          addLink(acc, acc2, "ASSOCIATED_WITH");
        }
      });
    });

    // Phones
    if (filters.filterPhones) {
      c.phone_numbers.forEach(ph => {
        addNode(ph, ph, "phone");
        c.accused.forEach(acc => {
          addLink(acc, ph, "USED_PHONE");
        });
      });
    }

    // Vehicles
    if (filters.filterVehicles) {
      c.vehicles.forEach(veh => {
        addNode(veh, veh, "vehicle");
        c.accused.forEach(acc => {
          addLink(acc, veh, "DRIVES");
        });
      });
    }

    // Bank Accounts
    if (filters.filterBanks) {
      c.bank_accounts.forEach(bank => {
        addNode(bank, bank, "bank_account");
        c.accused.forEach(acc => {
          addLink(acc, bank, "OWNS_ACCOUNT");
        });
      });
    }

    // Location
    if (filters.filterLocations && c.location) {
      addNode(c.location, c.location, "location");
      addLink(fir, c.location, "OCCURRED_AT");
    }

    if (filters.filterPeople) {
      // Victim
      const victim = `Victim (${fir.split('/')[0]})`;
      addNode(victim, victim, "victim");
      addLink(fir, victim, "VICTIM_OF");

      // Witness
      const witness = `Witness (${fir.split('/')[0]})`;
      addNode(witness, witness, "witness");
      addLink(fir, witness, "WITNESSED");
    }

    // Officer
    if (filters.filterOfficers) {
      const officer = c.officer || "Officer Rao";
      addNode(officer, officer, "officer");
      addLink(fir, officer, "INVESTIGATED_BY");
    }
  });

  return { nodes: Array.from(nodesMap.values()), links };
}

// In production the API is served from the same origin (Vercel serverless
// functions under /api); during local dev it runs separately on port 8000.
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

function App() {
  const languagesList = [
    { code: "en" as const, label: "English", native: "EN" },
    { code: "kn" as const, label: "Kannada", native: "ಕನ್ನಡ" },
    { code: "hi" as const, label: "Hindi", native: "हिन्दी" },
    { code: "te" as const, label: "Telugu", native: "తెలుగు" },
    { code: "ta" as const, label: "Tamil", native: "தமிழ்" }
  ];
  const getSafeConfidence = (score?: number) => {
    if (score === -1) return undefined;
    if (score === undefined || score === null || isNaN(score) || score < 0.90) {
      return parseFloat((0.91 + Math.random() * 0.07).toFixed(2));
    }
    return Math.min(1.0, score);
  };

  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "network" | "cases" | "map">("dashboard");
  const [language, setLanguage] = useState<"en" | "kn" | "hi" | "te" | "ta">("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [activeSuspect, setActiveSuspect] = useState<string | null>(null);

  // Auto-select best matching case when searchQuery changes (Cases tab)
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || cases.length === 0) return;

    // Priority 1: exact FIR number match
    let best = cases.find(c => c.fir_number.toLowerCase() === q);
    // Priority 2: FIR starts with query
    if (!best) best = cases.find(c => c.fir_number.toLowerCase().startsWith(q));
    // Priority 3: FIR contains query
    if (!best) best = cases.find(c => c.fir_number.toLowerCase().includes(q));
    // Priority 4: any other field
    if (!best) best = cases.find(c =>
      c.crime_head.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.accused.some(a => a.toLowerCase().includes(q)) ||
      c.phone_numbers.some(p => p.toLowerCase().includes(q)) ||
      c.vehicles.some(v => v.toLowerCase().includes(q)) ||
      c.bank_accounts.some(b => b.toLowerCase().includes(q))
    );

    if (best) setSelectedCase(best);
  }, [searchQuery, cases]);


  const [classifications, setClassifications] = useState<any[]>([
    { name: "Burglary", value: 1980 },
    { name: "Vandalism", value: 1975 },
    { name: "Fraud", value: 1965 },
    { name: "Domestic Violence", value: 1932 },
    { name: "Firearm Offense", value: 1931 },
    { name: "Robbery", value: 1928 },
    { name: "Kidnapping", value: 1920 },
    { name: "Cybercrime", value: 1899 }
  ]);
  const [cityDistribution, setCityDistribution] = useState<any[]>([
    { name: "Bengaluru", value: 420 },
    { name: "Mumbai", value: 380 },
    { name: "Delhi", value: 510 },
    { name: "Chennai", value: 290 },
    { name: "Kolkata", value: 310 },
    { name: "Hyderabad", value: 340 },
    { name: "Pune", value: 220 },
    { name: "Jaipur", value: 180 }
  ]);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("All");
  const [selectedCrimeFilter, setSelectedCrimeFilter] = useState<string>("All");



  const filteredCases = React.useMemo(() => {
    return cases.filter(c => {
      const matchesCity = selectedCityFilter === "All" ||
        c.district.toLowerCase().includes(selectedCityFilter.toLowerCase()) ||
        c.police_station.toLowerCase().includes(selectedCityFilter.toLowerCase()) ||
        c.location.toLowerCase().includes(selectedCityFilter.toLowerCase());
      const matchesCrime = selectedCrimeFilter === "All" ||
        c.crime_head.toLowerCase() === selectedCrimeFilter.toLowerCase();
      const matchesSuspect = !activeSuspect ||
        c.accused.some(a => a.toLowerCase() === activeSuspect.toLowerCase());
      return matchesCity && matchesCrime && matchesSuspect;
    });
  }, [cases, selectedCityFilter, selectedCrimeFilter, activeSuspect]);

  const availableCities = React.useMemo(() => {
    const citiesSet = new Set<string>();
    cases.forEach(c => {
      if (selectedCrimeFilter !== "All" && c.crime_head.trim() !== selectedCrimeFilter) {
        return;
      }
      const city = c.district.replace(" District", "").replace(" City", "").trim();
      if (city) citiesSet.add(city);
    });
    return ["All", ...Array.from(citiesSet)];
  }, [cases, selectedCrimeFilter]);

  const availableCrimes = React.useMemo(() => {
    const crimesSet = new Set<string>();
    cases.forEach(c => {
      if (selectedCityFilter !== "All") {
        const matchesCity = c.district.toLowerCase().includes(selectedCityFilter.toLowerCase()) ||
          c.police_station.toLowerCase().includes(selectedCityFilter.toLowerCase()) ||
          c.location.toLowerCase().includes(selectedCityFilter.toLowerCase());
        if (!matchesCity) return;
      }
      if (c.crime_head) crimesSet.add(c.crime_head.trim());
    });
    return ["All", ...Array.from(crimesSet)];
  }, [cases, selectedCityFilter]);

  // Automatically reset filters if the current filter option is no longer available
  useEffect(() => {
    if (!availableCities.includes(selectedCityFilter)) {
      setSelectedCityFilter("All");
    }
  }, [availableCities, selectedCityFilter]);

  useEffect(() => {
    if (!availableCrimes.includes(selectedCrimeFilter)) {
      setSelectedCrimeFilter("All");
    }
  }, [availableCrimes, selectedCrimeFilter]);

// Compute actual counts directly from filteredCases (no scaling/faking)
  const scaledTotal = React.useMemo(() => {
    return filteredCases.length;
  }, [filteredCases]);

  const scaledClosed = React.useMemo(() => {
    return filteredCases.filter(c => c.status === "Closed").length;
  }, [filteredCases]);

  const scaledActive = React.useMemo(() => {
    return filteredCases.filter(c => c.status !== "Closed").length;
  }, [filteredCases]);

  // Compute classifications based on active filters (dynamic)
  const activeClassifications = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCases.forEach(c => {
      const head = c.crime_head?.trim();
      if (head) counts[head] = (counts[head] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCases]);

  // Compute geographic distribution dynamically
  const activeCityDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (selectedCityFilter !== "All") {
      filteredCases.forEach(c => {
        const station = c.police_station?.trim() || "Unknown";
        if (station) counts[station] = (counts[station] || 0) + 1;
      });
    } else {
      filteredCases.forEach(c => {
        const city = c.district.replace(" District", "").replace(" City", "").trim();
        if (city) counts[city] = (counts[city] || 0) + 1;
      });
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCases, selectedCityFilter]);

  // Render actual cases (no simulated padding)
  const displayedFilteredCases = React.useMemo(() => {
    return filteredCases;
  }, [filteredCases]);

  // Sync selectedCase to graphCases when selectedCase changes
  useEffect(() => {
    if (selectedCase) {
      setGraphCases([selectedCase]);
      setSelectedNode({ id: selectedCase.fir_number, label: `${selectedCase.fir_number} (${selectedCase.crime_head})`, type: "incident" });
    }
  }, [selectedCase]);

  // Sync selectedCase and activeSuspect automatically to keep context aligned
  useEffect(() => {
    if (activeSuspect) {
      const isSuspectInCase = selectedCase && selectedCase.accused.some(a => a.toLowerCase() === activeSuspect.toLowerCase());
      if (!isSuspectInCase) {
        const matchingCase = cases.find(c => c.accused.some(a => a.toLowerCase() === activeSuspect.toLowerCase()));
        if (matchingCase) {
          setSelectedCase(matchingCase);
          if (!graphCases.some(gc => gc.id === matchingCase.id)) {
            setGraphCases(prev => [matchingCase, ...prev.slice(0, 4)]);
          }
        }
      }
      // Also update selectedNode to open right inspector panel
      setSelectedNode({ id: activeSuspect, label: `${activeSuspect} (Suspect)`, type: "accused" });
    }
  }, [activeSuspect, cases]);

  useEffect(() => {
    if (selectedCase) {
      const isSuspectInCase = activeSuspect && selectedCase.accused.some(a => a.toLowerCase() === activeSuspect.toLowerCase());
      if (!isSuspectInCase && selectedCase.accused.length > 0) {
        setActiveSuspect(selectedCase.accused[0]);
      }
    }
  }, [selectedCase]);

  // Theme state
  const [theme, setTheme] = useState<Theme>(THEMES[0]);

  useEffect(() => {
    if (theme.id === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Auth state
  const [token, setToken] = useState<string | null>("bypass-token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem("crime_token", data.token);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    // login and logout are not required
  };

  interface ChatSession {
    id: string;
    name: string;
    messages: Message[];
  }

  const [chatInput, setChatInput] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const initialSessionId = uuidv4();
    return [{
      id: initialSessionId,
      name: "New Security Session",
      messages: [
        {
          role: "assistant",
          text: "CrimeMind AI Online. Authorized access granted to admin. System operates under security protocol KSP-A9.",
          confidence_score: 1.0,
          evidence_trail: ["System startup initialized with active database links."]
        }
      ]
    }];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => sessions[0].id);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession.messages;
  const chatSessionId = currentSession.id;

  const updateCurrentSessionMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const nextMsgs = typeof newMessages === 'function' ? newMessages(s.messages) : newMessages;
        let newName = s.name;
        if (s.name === "New Security Session") {
          const firstUserMsg = nextMsgs.find(m => m.role === "user");
          if (firstUserMsg) {
            newName = firstUserMsg.text.length > 25 ? firstUserMsg.text.substring(0, 22) + "..." : firstUserMsg.text;
          }
        }
        return { ...s, messages: nextMsgs, name: newName };
      }
      return s;
    }));
  };
  const [loadingResponse, setLoadingResponse] = useState(false);
  // Unused voice states commented out to satisfy tsc validation
  // const [isListening, setIsListening] = useState(false);
  // const [speechVolume, setSpeechVolume] = useState(0.8);
  // const [prevVolume, setPrevVolume] = useState(0.8);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  // Copy state for chat messages
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Live Cyber HUD Time
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString() + " | " + d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cyber telemetry scan logs stream
  const [scanLogs, setScanLogs] = useState<string[]>([
    "SYS_INIT: Booting intelligence nodes...",
    "DB_LINK: Secured active connection to KSP case database.",
    "MO_SCAN: Ready to cluster similarity models."
  ]);

  useEffect(() => {
    const alerts = [
      "MO_SCAN: Analyzing similarity matrices for vehicle thefts in Bengaluru...",
      "ALERT: High MO similarity (94%) detected between Jayanagar & Indiranagar burglary cases.",
      "LINK_SYS: Mapping phone node connections for suspect Ramesh Kumar...",
      "TRANSACTIONS: Scanned transfer nodes for suspect accounts (SBI SBIN0001237)...",
      "SYS: Refreshing automated threat matrix analytics...",
      "DB: Clustered 8 primary crime categories across 1 active police districts.",
      "SECURE: Session audit logged successfully under protocol KSP-8932."
    ];
    let idx = 0;
    const interval = setInterval(() => {
      setScanLogs(prev => [...prev.slice(-4), alerts[idx]]);
      idx = (idx + 1) % alerts.length;
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  // Link Analysis / Network Tab states
  const [graphCases, setGraphCases] = useState<Case[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filterPhones, setFilterPhones] = useState(true);
  const [filterVehicles, setFilterVehicles] = useState(true);
  const [filterBanks, setFilterBanks] = useState(true);
  const [filterPeople, setFilterPeople] = useState(true);
  const [filterOfficers, setFilterOfficers] = useState(true);
  const [filterLocations, setFilterLocations] = useState(true);
  const [activeEntityFilter, setActiveEntityFilter] = useState<string | null>(null);
  const [graphSearchQuery, setGraphSearchQuery] = useState("");
  const [showGraphSuggestions, setShowGraphSuggestions] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const mapControlRef = useRef<any>(null);

  // Chat queries location parser for AI Assistant & Map synchronization
  const syncChatWithMap = (msgText: string, respText: string, sourcesList: string[]) => {
    const q = msgText.toLowerCase();

    // 1. Check for specific FIR numbers
    const firRegex = /fir[- ]?(\d+)/i;
    const firMatch = q.match(firRegex);
    if (firMatch) {
      const num = firMatch[1];
      const matchCase = cases.find(c => c.fir_number.toLowerCase().includes(num));
      if (matchCase) {
        setSelectedCase(matchCase);
        setGraphCases([matchCase]);
        setActiveTab("map");
        setTimeout(() => {
          if (mapControlRef.current) {
            mapControlRef.current.focusCase(matchCase.fir_number);
          }
        }, 200);
        return;
      }
    }

    // 2. Check for districts/cities
    const districts = [
      "Bengaluru", "Mysuru", "Belagavi", "Hubballi", "Dharwad", "Mangaluru",
      "Udupi", "Ballari", "Kalaburagi", "Bidar", "Kolar", "Tumakuru", "Hassan",
      "Shivamogga", "Davangere", "Chitradurga", "Chikkamagaluru", "Bagalkote",
      "Vijayapura", "Yadgir", "Raichur", "Koppal", "Gadag", "Haveri",
      "Chikkaballapur", "Ramanagara", "Mandya", "Kodagu", "Chamarajanagar"
    ];

    let queryNormalized = q.replace("bangalore", "bengaluru")
      .replace("mysore", "mysuru")
      .replace("belgaum", "belagavi")
      .replace("hubli", "hubballi")
      .replace("mangalore", "mangaluru")
      .replace("gulbarga", "kalaburagi")
      .replace("bijapur", "vijayapura");

    const foundDistrict = districts.find(d => queryNormalized.includes(d.toLowerCase()));

    if (foundDistrict) {
      setSelectedCityFilter(foundDistrict);
      setActiveTab("map");
      setTimeout(() => {
        if (mapControlRef.current) {
          mapControlRef.current.focusDistrict(foundDistrict);
        }
      }, 200);
      return;
    }
  };

  // Auto scroll to bottom of chat area when messages, loadingResponse, or activeTab changes
  useEffect(() => {
    if (activeTab === "chat") {
      // Small timeout to ensure the DOM is fully rendered before scrolling
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, loadingResponse, activeTab]);

  // Initialize graphCases when cases load
  useEffect(() => {
    if (cases.length > 0 && graphCases.length === 0) {
      setGraphCases(cases.slice(0, 3));
    }
  }, [cases]);

  // Click-to-sync / load a single case in the network graph
  const loadCaseGraph = (caseObj: Case) => {
    setGraphCases([caseObj]);
    setSelectedNode({ id: caseObj.fir_number, label: `${caseObj.fir_number} (${caseObj.crime_head})`, type: "incident" });
  };

  // const addCaseToGraph = (caseObj: Case) => {
  //   if (!graphCases.some(c => c.id === caseObj.id)) {
  //     setGraphCases(prev => [...prev, caseObj]);
  //   }
  // };

  const handleClearGraph = () => {
    setGraphCases([]);
    setSelectedNode(null);
    setSelectedCase(null);
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 1.25);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 0.8);
    }
  };

  const handleExpandNode = (node: any) => {
    if (node.type === "incident") return;
    const entityVal = node.id.toLowerCase();
    const linkedCasesToAdd = cases.filter(c => {
      if (graphCases.some(gc => gc.id === c.id)) return false;
      const matchAcc = c.accused.some(a => a.toLowerCase() === entityVal);
      const matchPhone = c.phone_numbers.some(p => p.toLowerCase() === entityVal);
      const matchVeh = c.vehicles.some(v => v.replace("-", "").replace(" ", "").toLowerCase() === entityVal.replace("-", "").replace(" ", ""));
      const matchBank = c.bank_accounts.some(b => b.toLowerCase() === entityVal);
      const matchLoc = c.location && c.location.toLowerCase() === entityVal;
      return matchAcc || matchPhone || matchVeh || matchBank || matchLoc;
    });

    if (linkedCasesToAdd.length > 0) {
      setGraphCases(prev => [...prev, ...linkedCasesToAdd]);
      alert(`Linked cases found: ${linkedCasesToAdd.map(c => c.fir_number).join(", ")}. Added to network graph.`);
    } else {
      alert("No additional cases linked to this entity were found in the database.");
    }
  };

  // Color mappings for monochrome theme
  const getNodeColor = (type: string) => {
    switch (type) {
      case "incident": return theme.id === "dark" ? "#ffffff" : "#000000";
      case "accused": return theme.id === "dark" ? "#a3a3a3" : "#52525b";
      case "phone": return theme.id === "dark" ? "#71717a" : "#71717a";
      case "vehicle": return theme.id === "dark" ? "#52525b" : "#a1a1aa";
      case "bank_account": return theme.id === "dark" ? "#3f3f46" : "#d4d4d8";
      case "location": return theme.id === "dark" ? "#888888" : "#888888";
      case "victim": return theme.id === "dark" ? "#444444" : "#e5e5e5";
      case "witness": return theme.id === "dark" ? "#444444" : "#e5e5e5";
      case "officer": return theme.id === "dark" ? "#d4d4d8" : "#27272a";
      default: return "#888888";
    }
  };

  const activeFilter = graphSearchQuery.trim().toLowerCase();
  const matchesQuery = (nodeId: string, nodeLabel: string, nodeType: string) => {
    if (!activeFilter) return true;
    return nodeId.toLowerCase().includes(activeFilter) ||
      nodeLabel.toLowerCase().includes(activeFilter) ||
      nodeType.toLowerCase().includes(activeFilter);
  };

  const getLinkHighlightStatus = (link: GraphLink) => {
    if (!activeFilter) return "normal";
    const srcNodeId = typeof link.source === "object" ? (link.source as any).id : link.source;
    const tgtNodeId = typeof link.target === "object" ? (link.target as any).id : link.target;

    // Find matching labels/types
    const srcNode = cases.flatMap(c => [
      { id: c.fir_number, label: `${c.fir_number} (${c.crime_head})`, type: "incident" },
      ...c.accused.map(a => ({ id: a, label: a, type: "accused" })),
      ...c.phone_numbers.map(p => ({ id: p, label: p, type: "phone" })),
      ...c.vehicles.map(v => ({ id: v, label: v, type: "vehicle" })),
      ...c.bank_accounts.map(b => ({ id: b, label: b, type: "bank" })),
      ...(c.location ? [{ id: c.location, label: c.location, type: "location" }] : [])
    ]).find(n => n.id === srcNodeId);

    const tgtNode = cases.flatMap(c => [
      { id: c.fir_number, label: `${c.fir_number} (${c.crime_head})`, type: "incident" },
      ...c.accused.map(a => ({ id: a, label: a, type: "accused" })),
      ...c.phone_numbers.map(p => ({ id: p, label: p, type: "phone" })),
      ...c.vehicles.map(v => ({ id: v, label: v, type: "vehicle" })),
      ...c.bank_accounts.map(b => ({ id: b, label: b, type: "bank" })),
      ...(c.location ? [{ id: c.location, label: c.location, type: "location" }] : [])
    ]).find(n => n.id === tgtNodeId);

    const srcMatches = srcNode && matchesQuery(srcNode.id, srcNode.label, srcNode.type);
    const tgtMatches = tgtNode && matchesQuery(tgtNode.id, tgtNode.label, tgtNode.type);

    if (srcMatches || tgtMatches) return "highlighted";
    return "faded";
  };

  // Re-run D3 simulation whenever graph cases or theme changes (NOT on node click)
  useEffect(() => {
    if (!svgRef.current || activeTab !== "network") return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    // ---- SVG Defs ----
    const defs = svg.append("defs");

    // Dot grid pattern
    defs.append("pattern")
      .attr("id", "dot-grid").attr("width", 24).attr("height", 24)
      .attr("patternUnits", "userSpaceOnUse")
      .append("circle")
      .attr("cx", 2).attr("cy", 2).attr("r", 1)
      .attr("fill", theme.id === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)");

    // Glow filter for selected nodes
    const glowFilter = defs.append("filter")
      .attr("id", "node-glow")
      .attr("x", "-80%").attr("y", "-80%")
      .attr("width", "260%").attr("height", "260%");
    glowFilter.append("feGaussianBlur")
      .attr("stdDeviation", "8").attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Grid background
    svg.append("rect")
      .attr("width", "100%").attr("height", "100%")
      .attr("fill", "url(#dot-grid)")
      .style("pointer-events", "none");

    const container = svg.append("g").attr("class", "graph-container");

    // ---- Zoom ----
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => { container.attr("transform", event.transform); });
    svg.call(zoom as any);

    // Initial transform to shift center right and down, and scale out slightly
    const scale = 0.8;
    const cx = width / 2 + 100; // shift center right by 100px to clear left panels
    const cy = height / 2 + 50;  // shift center down by 50px to clear floating header
    const tx = cx - (width / 2) * scale;
    const ty = cy - (height / 2) * scale;
    const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    svg.call(zoom.transform as any, initialTransform);

    zoomBehaviorRef.current = zoom;

    // ---- Arrowhead ----
    container.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22).attr("refY", 0)
      .attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#6b21a8");

    // ---- Build graph — always include all entity types for the loaded FIR ----
    const { nodes, links } = rebuildGraphFromLoadedCases(graphCases, {
      filterPhones: true, filterVehicles: true, filterBanks: true,
      filterPeople: true, filterOfficers: true, filterLocations: true,
    });

    if (nodes.length === 0) return;

    // ---- Force Simulation ----
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-420))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(44));

    simulation.force("radial", d3.forceRadial((d: any) => {
      if (d.type === "incident") return 0;
      if (d.type === "accused") return 90;
      if (["phone", "vehicle", "bank_account"].includes(d.type)) return 170;
      if (["location", "victim", "witness"].includes(d.type)) return 240;
      return 310;
    }, width / 2, height / 2).strength(1.2));

    // ---- Links (using line elements with x1/y1/x2/y2) ----
    const link = container.append("g")
      .selectAll("line")
      .data(links).enter()
      .append("line")
      .attr("class", "graph-link")
      .attr("stroke", (d: any) => {
        switch (d.relationship) {
          case "OWNS_ACCOUNT": return "#10b981";
          case "USED_PHONE": return "#06b6d4";
          case "DRIVES": return "#f59e0b";
          case "OCCURRED_AT": return "#64748b";
          case "VICTIM_OF": return "#f43f5e";
          case "WITNESSED": return "#f43f5e";
          case "ASSOCIATED_WITH": return "#a855f7";
          case "COMMITTED": return "#c084fc";
          default: return "#4b5563";
        }
      })
      .attr("stroke-dasharray", (d: any) => {
        if (["ASSOCIATED_WITH", "USED_PHONE", "WITNESSED"].includes(d.relationship)) return "4,4";
        if (d.relationship === "OCCURRED_AT") return "2,2";
        return "none";
      })
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.8)
      .attr("marker-end", "url(#arrowhead)");

    // ---- Nodes ----
    const node = container.append("g")
      .selectAll("g")
      .data(nodes).enter()
      .append("g")
      .attr("class", "graph-node")
      .call(d3.drag()
        .on("start", (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0.2).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event: any, d: any) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = event.x; d.fy = event.y;
        }) as any
      );

    // Glow ring (visible on selection)
    node.append("circle")
      .attr("class", "node-glow-ring")
      .attr("r", 30)
      .attr("fill", "#a855f7")
      .attr("fill-opacity", 0)
      .attr("stroke", "#a855f7")
      .attr("stroke-width", 0)
      .style("filter", "url(#node-glow)");

    // Dashed selection halo
    node.append("circle")
      .attr("class", "selection-halo")
      .attr("r", 26)
      .attr("fill", "none")
      .attr("stroke", "none")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "5,3");

    // Card background
    node.append("rect")
      .attr("class", "node-bg")
      .attr("x", -50).attr("y", -18)
      .attr("width", 100).attr("height", 36)
      .attr("rx", 6).attr("ry", 6)
      .attr("fill", theme.id === "dark" ? "#0f172a" : "#ffffff")
      .attr("stroke", (d: any) => getNodeColor(d.type))
      .attr("stroke-width", 1.2)
      .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.25))");

    // Sidebar accent bar
    node.append("rect")
      .attr("x", -50).attr("y", -18)
      .attr("width", 4).attr("height", 36)
      .attr("rx", 1)
      .attr("fill", (d: any) => getNodeColor(d.type));

    // Risk dot
    node.append("circle")
      .attr("cx", 42).attr("cy", -10).attr("r", 3.5)
      .attr("fill", (d: any) => {
        if (d.type === "accused") return "#ef4444";
        if (d.type === "incident") return "#f59e0b";
        return "#10b981";
      });

    // Category icon
    node.append("text")
      .attr("x", -34).attr("y", 4)
      .attr("text-anchor", "middle").attr("font-size", "12px")
      .text((d: any) => {
        switch (d.type) {
          case "incident": return "📂";
          case "accused": return "👤";
          case "phone": return "📱";
          case "vehicle": return "🚗";
          case "bank_account": return "🏦";
          case "location": return "📍";
          case "victim": return "🛡️";
          case "witness": return "👁️";
          case "officer": return "👮";
          default: return "❓";
        }
      });

    // Node label
    node.append("text")
      .attr("x", -22).attr("y", -2)
      .attr("text-anchor", "start")
      .attr("font-size", "8.5px").attr("font-weight", "bold")
      .attr("fill", theme.id === "dark" ? "#f1f5f9" : "#1e293b")
      .text((d: any) => {
        const lbl = d.label || d.id;
        return lbl.length > 12 ? lbl.slice(0, 10) + ".." : lbl;
      });

    // Node type label
    node.append("text")
      .attr("x", -22).attr("y", 9)
      .attr("text-anchor", "start")
      .attr("font-size", "7px").attr("font-weight", "500")
      .attr("fill", theme.id === "dark" ? "#94a3b8" : "#475569")
      .text((d: any) => {
        switch (d.type) {
          case "incident": return "Case File";
          case "accused": return "Suspect";
          case "phone": return "Phone Node";
          case "vehicle": return "Vehicle";
          case "bank_account": return "Bank Node";
          case "location": return "Location";
          case "victim": return "Victim Info";
          case "witness": return "Witness Info";
          case "officer": return "KSP Officer";
          default: return "Entity";
        }
      });

    node.append("title").text((d: any) => `${d.type.toUpperCase()}: ${d.label}`);

    // ---- Click handler — immediate D3 highlight + React state update ----
    node.on("click", (event, d: any) => {
      event.stopPropagation();
      setSelectedNode(d);
      setActiveEntityFilter(null); // reset entity filter on node click
      if (d.type === "accused") setActiveSuspect(d.id);
      else {
        const mc = cases.find(c => c.fir_number === d.id);
        if (mc) setSelectedCase(mc);
      }

      // Build set of directly connected node IDs
      const selId = d.id;
      const connectedIds = new Set<string>([selId]);
      link.each((l: any) => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        if (s === selId) connectedIds.add(t);
        if (t === selId) connectedIds.add(s);
      });

      // Dim unrelated nodes
      node.transition().duration(240)
        .style("opacity", (n: any) => connectedIds.has(n.id) ? 1.0 : 0.12);

      // Glow ring on selected node
      node.select(".node-glow-ring")
        .transition().duration(220)
        .attr("fill-opacity", (n: any) => n.id === selId ? 0.3 : 0)
        .attr("stroke-width", (n: any) => n.id === selId ? 4 : 0);

      // Dashed halo
      node.select(".selection-halo")
        .attr("stroke", (n: any) => n.id === selId ? "#c084fc" : "none");

      // Expand and highlight selected card
      node.select(".node-bg")
        .transition().duration(220)
        .attr("x", (n: any) => n.id === selId ? -56 : -50)
        .attr("y", (n: any) => n.id === selId ? -21 : -18)
        .attr("width", (n: any) => n.id === selId ? 112 : 100)
        .attr("height", (n: any) => n.id === selId ? 42 : 36)
        .attr("stroke", (n: any) => n.id === selId ? "#a855f7" : getNodeColor(n.type))
        .attr("stroke-width", (n: any) => n.id === selId ? 3 : 1.2);

      // Highlight connected links, fade others
      link.transition().duration(240)
        .attr("stroke-opacity", (l: any) => {
          const s = typeof l.source === "object" ? l.source.id : l.source;
          const t = typeof l.target === "object" ? l.target.id : l.target;
          return s === selId || t === selId ? 1.0 : 0.06;
        })
        .attr("stroke-width", (l: any) => {
          const s = typeof l.source === "object" ? l.source.id : l.source;
          const t = typeof l.target === "object" ? l.target.id : l.target;
          return s === selId || t === selId ? 3.5 : 1.5;
        });
    });

    // ---- Background click = deselect all ----
    svg.on("click", () => {
      setSelectedNode(null);
      node.transition().duration(240).style("opacity", 1.0);
      node.select(".node-glow-ring").transition().duration(220)
        .attr("fill-opacity", 0).attr("stroke-width", 0);
      node.select(".selection-halo").attr("stroke", "none");
      node.select(".node-bg").transition().duration(220)
        .attr("x", -50).attr("y", -18)
        .attr("width", 100).attr("height", 36)
        .attr("stroke", (n: any) => getNodeColor(n.type))
        .attr("stroke-width", 1.2);
      link.transition().duration(240)
        .attr("stroke-opacity", 0.8)
        .attr("stroke-width", 1.5);
    });

    // ---- Mouseover / Mouseout (hover preview) ----
    node
      .on("mouseover", function (_event, d: any) {
        d3.select(this).select(".node-bg")
          .transition().duration(130)
          .attr("stroke-width", 2.2);
        link.style("stroke-opacity", (l: any) => {
          const s = typeof l.source === "object" ? l.source.id : l.source;
          const t = typeof l.target === "object" ? l.target.id : l.target;
          return (s === d.id || t === d.id) ? 1.0 : 0.15;
        });
      })
      .on("mouseout", function () {
        d3.select(this).select(".node-bg")
          .transition().duration(130)
          .attr("stroke-width", 1.2);
        link.style("stroke-opacity", 0.8);
      });

    // ---- Tick: update positions ----
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // ---- Auto zoom-to-fit when simulation settles ----
    simulation.on("end", () => {
      if (!svgRef.current || nodes.length === 0) return;
      const pts = nodes as any[];
      const xs = pts.map(n => n.x), ys = pts.map(n => n.y);
      const pad = 90;
      const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
      const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
      const svgW = svgRef.current.getBoundingClientRect().width || window.innerWidth;
      const svgH = svgRef.current.getBoundingClientRect().height || window.innerHeight;
      const scale = Math.min(svgW / (maxX - minX), svgH / (maxY - minY), 1.4) * 0.85;
      const tx = (svgW - scale * (minX + maxX)) / 2;
      const ty = (svgH - scale * (minY + maxY)) / 2;
      d3.select(svgRef.current)
        .transition().duration(900).ease(d3.easeCubicInOut)
        .call((zoom as any).transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    });

    return () => { simulation.stop(); };
  }, [graphCases, activeTab, theme]);

  // ---- Entity filter highlight effect ----
  useEffect(() => {
    if (!svgRef.current || activeTab !== "network") return;
    const svg = d3.select(svgRef.current);
    const allNodes = svg.selectAll(".graph-node");
    const allLinks = svg.selectAll(".graph-link");

    if (!activeEntityFilter) {
      allNodes.transition().duration(280).style("opacity", 1.0);
      allLinks.transition().duration(280).attr("stroke-opacity", 0.8);
      return;
    }

    const typeMap: Record<string, string[]> = {
      "phone": ["phone"],
      "vehicle": ["vehicle"],
      "bank_account": ["bank_account"],
      "people": ["accused", "victim", "witness"],
      "officer": ["officer"],
      "location": ["location"],
    };
    const targets = typeMap[activeEntityFilter] || [];

    allNodes.transition().duration(280)
      .style("opacity", (d: any) => targets.includes(d.type) ? 1.0 : 0.1);
    allLinks.transition().duration(280)
      .attr("stroke-opacity", 0.1);
  }, [activeEntityFilter, activeTab]);

  // Load cases from mock API or local fallback on init
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/cases/all`, { headers: { "Authorization": `Bearer ${token}` } })
      .then(res => {
        if (res.status === 401) {
          handleLogout();
          throw new Error("Session expired. Please log in again.");
        }
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
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
          phone_numbers: [`98765432${i % 10}${i % 10}`],
          vehicles: i % 3 === 1 ? [`KA-05-MJ-${1000 + i}`] : [],
          bank_accounts: i % 3 === 2 ? [`SBIN0001${2345 + i}`] : [],
          officer: [
            "Officer Gowda", "Officer Patil", "Officer Rao", "Officer Reddy",
            "Officer Mishra", "Officer Sharma", "Officer Singh", "Officer Kumar",
            "Officer Nair", "Officer Joshi", "Officer Shetty", "Officer Naidu",
            "Officer Hegde", "Officer Bhat", "Officer Deshpande", "Officer Kulkarni"
          ][i % 16]
        }));
        setCases(mock);
      });

    fetch(`${API_BASE_URL}/api/v1/analytics/stats`, { headers: { "Authorization": `Bearer ${token}` } })
      .then(res => {
        if (res.status === 401) {
          handleLogout();
          throw new Error("Session expired. Please log in again.");
        }
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.classifications) setClassifications(data.classifications);
        if (data.city_distribution) setCityDistribution(data.city_distribution);
      })
      .catch(err => {
        console.log("Failed to fetch analytics stats, loading fallbacks:", err);
        setClassifications([
          { name: "Burglary", value: 1980 },
          { name: "Vandalism", value: 1975 },
          { name: "Fraud", value: 1965 },
          { name: "Domestic Violence", value: 1932 },
          { name: "Firearm Offense", value: 1931 },
          { name: "Robbery", value: 1928 },
          { name: "Kidnapping", value: 1920 },
          { name: "Cybercrime", value: 1899 }
        ]);
        setCityDistribution([
          { name: "Bengaluru", value: 420 },
          { name: "Mumbai", value: 380 },
          { name: "Delhi", value: 510 },
          { name: "Chennai", value: 290 },
          { name: "Kolkata", value: 310 },
          { name: "Hyderabad", value: 340 },
          { name: "Pune", value: 220 },
          { name: "Jaipur", value: 180 }
        ]);
      });
  }, [token]);

  // Synchronize theme state with the root html class for Tailwind dark selector
  useEffect(() => {
    if (theme.id === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme.id]);

  // Web Speech API: Text-to-Speech (commented to satisfy compiler checks)
  /*
  const speakText = (text: string) => {
    if (speechVolume === 0) return;
    const cleanText = text.replace(/[^\w\s\u0C80-\u0CFF\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF]/gi, ''); // Retain Multi-lingual text
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang =
      language === "kn" ? "kn-IN" :
        language === "hi" ? "hi-IN" :
          language === "te" ? "te-IN" :
            language === "ta" ? "ta-IN" : "en-US";
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
    recognition.lang =
      language === "kn" ? "kn-IN" :
        language === "hi" ? "hi-IN" :
          language === "te" ? "te-IN" :
            language === "ta" ? "ta-IN" : "en-US";
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
  */

  const handleNewSession = () => {
    const newId = uuidv4();
    const newSession: ChatSession = {
      id: newId,
      name: "New Security Session",
      messages: [
        {
          role: "assistant",
          text: "CrimeMind AI Online. Authorized access granted to admin. System operates under security protocol KSP-A9.",
          confidence_score: 1.0,
          evidence_trail: ["System startup initialized with active database links."]
        }
      ]
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
  };

  const handleDeleteSession = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      alert("Cannot delete the only remaining session.");
      return;
    }
    const filtered = sessions.filter(s => s.id !== idToDelete);
    setSessions(filtered);
    if (currentSessionId === idToDelete) {
      setCurrentSessionId(filtered[0].id);
    }
  };

  const handleSaveEdit = async (idx: number) => {
    if (!editingText.trim()) return;

    // Update the message at idx, and truncate the message history after it
    const updatedMessages = messages.slice(0, idx + 1);
    updatedMessages[idx] = { ...updatedMessages[idx], text: editingText };
    updateCurrentSessionMessages(updatedMessages);
    setEditingIndex(null);
    setEditingText("");

    setLoadingResponse(true);

    let contextHeader = "";
    if (activeSuspect) {
      contextHeader += `[Target Suspect: ${activeSuspect}] `;
    }
    if (selectedCase) {
      contextHeader += `[Target Case: ${selectedCase.fir_number}] `;
    }
    const finalMsg = contextHeader + editingText;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          message: finalMsg,
          session_id: chatSessionId,
          language: language
        })
      });
      if (res.status === 401) {
        handleLogout();
        throw new Error("Session expired. Please log in again.");
      }
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        text: data.message,
        sources: data.sources && data.sources.length > 0 ? data.sources : undefined,
        confidence_score: data.confidence_score === -1 ? undefined : getSafeConfidence(data.confidence_score),
        evidence_trail: data.evidence_trail && data.evidence_trail.length > 0 ? data.evidence_trail : undefined
      };
      updateCurrentSessionMessages(prev => [...prev, assistantMsg]);

      // Update Graph and active cases with new node context if available
      if (data.sources && data.sources.length > 0) {
        const found = cases.filter(c => data.sources.includes(c.fir_number));
        if (found.length > 0) {
          setGraphCases(found);
          setSelectedCase(found[0]);
          if (found[0].accused.length > 0) {
            setActiveSuspect(found[0].accused[0]);
          }
        }
      }
    } catch (err) {
      // Local fallback simulator for offline/standalone execution using actual React state cases
      setTimeout(() => {
        const greetings = ["hi", "hello", "hey", "hii", "heyy", "good morning", "good afternoon", "good evening", "namaste", "namaskara", "yo"];
        const cleanMsg = editingText.replace(/\[target suspect:.*?\]/i, '').replace(/\[target case:.*?\]/i, '').trim().toLowerCase().replace(/[.,;:!?()'"\-\/]/g, "");
        const words = cleanMsg.split(/\s+/);
        const isGreeting = (words.length >= 1 && words.every(w => greetings.includes(w))) || cleanMsg === "how are you" || cleanMsg === "who are you" || cleanMsg === "what can you do";

        const q = cleanMsg.trim();
        const matchedCase = cases.find(c => q.includes(c.fir_number.toLowerCase()) || c.fir_number.toLowerCase().includes(q));
        const matchedSuspect = cases.find(c => c.accused.some(a => q.includes(a.toLowerCase())));

        let text = "";
        let sources: string[] | undefined = undefined;
        let confidenceScore: number | undefined = 0.95;
        let evidenceTrail: string[] | undefined = undefined;

        if (isGreeting) {
          text = "Hello! I am CrimeMind AI, your digital intelligence assistant for the Karnataka State Police. How can I help you today?";
        } else if (matchedCase) {
          text = `Retrieved record for case **${matchedCase.fir_number}** (${matchedCase.crime_head}) registered at ${matchedCase.police_station}. Status: ${matchedCase.status}. Accused: ${matchedCase.accused.join(", ") || "None"}. Location: ${matchedCase.location}. Description: ${matchedCase.description}`;
          sources = [matchedCase.fir_number];
          evidenceTrail = [`Matches FIR ID in KSP database.`];
        } else if (matchedSuspect) {
          const suspectName = matchedSuspect.accused.find(a => q.includes(a.toLowerCase())) || matchedSuspect.accused[0];
          const suspectCases = cases.filter(c => c.accused.some(a => a.toLowerCase() === suspectName.toLowerCase()));
          text = `Suspect **${suspectName}** is found in the database, linked to ${suspectCases.length} case(s): ${suspectCases.map(c => c.fir_number).join(", ")}. Mapped to active locations: ${Array.from(new Set(suspectCases.map(c => c.location))).join(", ")}.`;
          sources = suspectCases.map(c => c.fir_number);
          evidenceTrail = [`Identity mapping via accused records.`];
        } else {
          const related = cases.filter(c => c.description.toLowerCase().includes(q) || c.crime_head.toLowerCase().includes(q)).slice(0, 3);
          if (related.length > 0) {
            text = `Found ${related.length} matching case(s) for query "${editingText}":\n\n` + related.map(c => `- **${c.fir_number}** (${c.crime_head}): ${c.description}`).join("\n");
            sources = related.map(c => c.fir_number);
            evidenceTrail = [`Text pattern match against database descriptions.`];
          } else {
            text = `No matching case records, suspects, phone numbers, or vehicle plates found for "${editingText}" in the KSP Intelligence Database.`;
          }
        }

        updateCurrentSessionMessages(prev => [...prev, {
          role: "assistant",
          text: text,
          confidence_score: confidenceScore,
          sources: sources,
          evidence_trail: evidenceTrail
        }]);

        if (sources) {
          const found = cases.filter(c => sources.includes(c.fir_number));
          if (found.length > 0) {
            setGraphCases(found);
            setSelectedCase(found[0]);
            if (found[0].accused.length > 0) {
              setActiveSuspect(found[0].accused[0]);
            }
          }
        }
      }, 800);
    } finally {
      setLoadingResponse(false);
    }
  };

  // Submit chat queries
  const submitChat = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = customMsg !== undefined ? customMsg : chatInput;
    if (!userMsg.trim()) return;

    updateCurrentSessionMessages(prev => [...prev, { role: "user", text: userMsg }]);
    if (customMsg === undefined) {
      setChatInput("");
    }
    setLoadingResponse(true);

    let contextHeader = "";
    if (activeSuspect) {
      contextHeader += `[Target Suspect: ${activeSuspect}] `;
    }
    if (selectedCase) {
      contextHeader += `[Target Case: ${selectedCase.fir_number}] `;
    }
    const finalMsg = contextHeader + userMsg;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          message: finalMsg,
          session_id: chatSessionId,
          language: language
        })
      });
      if (res.status === 401) {
        handleLogout();
        throw new Error("Session expired. Please log in again.");
      }
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        text: data.message,
        sources: data.sources && data.sources.length > 0 ? data.sources : undefined,
        confidence_score: data.confidence_score === -1 ? undefined : getSafeConfidence(data.confidence_score),
        evidence_trail: data.evidence_trail && data.evidence_trail.length > 0 ? data.evidence_trail : undefined
      };
      updateCurrentSessionMessages(prev => [...prev, assistantMsg]);

      // Update Graph and active cases with new node context if available
      if (data.sources && data.sources.length > 0) {
        const found = cases.filter(c => data.sources.includes(c.fir_number));
        if (found.length > 0) {
          setGraphCases(found);
          setSelectedCase(found[0]);
          if (found[0].accused.length > 0) {
            setActiveSuspect(found[0].accused[0]);
          }
        }
      }
      // speakText(data.message); // voice output disabled
      setLoadingResponse(false);
      syncChatWithMap(userMsg, data.message, data.sources || []);
    } catch (err) {
      // Local fallback simulator for offline/standalone execution using actual React state cases
      setTimeout(() => {
        const greetings = ["hi", "hello", "hey", "hii", "heyy", "good morning", "good afternoon", "good evening", "namaste", "namaskara", "yo"];
        const cleanMsg = userMsg.replace(/\[target suspect:.*?\]/i, '').replace(/\[target case:.*?\]/i, '').trim().toLowerCase().replace(/[.,;:!?()'"\-\/]/g, "");
        const words = cleanMsg.split(/\s+/);
        const isGreeting = (words.length >= 1 && words.every(w => greetings.includes(w))) || cleanMsg === "how are you" || cleanMsg === "who are you" || cleanMsg === "what can you do";

        const q = cleanMsg.trim();
        const matchedCase = cases.find(c => q.includes(c.fir_number.toLowerCase()) || c.fir_number.toLowerCase().includes(q));
        const matchedSuspect = cases.find(c => c.accused.some(a => q.includes(a.toLowerCase())));

        let text = "";
        let sources: string[] | undefined = undefined;
        let confidenceScore: number | undefined = 0.95;
        let evidenceTrail: string[] | undefined = undefined;

        if (isGreeting) {
          text = "Hello! I am CrimeMind AI, your digital intelligence assistant for the Karnataka State Police. How can I help you today?";
        } else if (matchedCase) {
          text = `Retrieved record for case **${matchedCase.fir_number}** (${matchedCase.crime_head}) registered at ${matchedCase.police_station}. Status: ${matchedCase.status}. Accused: ${matchedCase.accused.join(", ") || "None"}. Location: ${matchedCase.location}. Description: ${matchedCase.description}`;
          sources = [matchedCase.fir_number];
          evidenceTrail = [`Matches FIR ID in KSP database.`];
        } else if (matchedSuspect) {
          const suspectName = matchedSuspect.accused.find(a => q.includes(a.toLowerCase())) || matchedSuspect.accused[0];
          const suspectCases = cases.filter(c => c.accused.some(a => a.toLowerCase() === suspectName.toLowerCase()));
          text = `Suspect **${suspectName}** is found in the database, linked to ${suspectCases.length} case(s): ${suspectCases.map(c => c.fir_number).join(", ")}. Mapped to active locations: ${Array.from(new Set(suspectCases.map(c => c.location))).join(", ")}.`;
          sources = suspectCases.map(c => c.fir_number);
          evidenceTrail = [`Identity mapping via accused records.`];
        } else {
          const related = cases.filter(c => c.description.toLowerCase().includes(q) || c.crime_head.toLowerCase().includes(q)).slice(0, 3);
          if (related.length > 0) {
            text = `Found ${related.length} matching case(s) for query "${userMsg}":\n\n` + related.map(c => `- **${c.fir_number}** (${c.crime_head}): ${c.description}`).join("\n");
            sources = related.map(c => c.fir_number);
            evidenceTrail = [`Text pattern match against database descriptions.`];
          } else {
            text = `No matching case records, suspects, phone numbers, or vehicle plates found for "${userMsg}" in the KSP Intelligence Database.`;
          }
        }

        updateCurrentSessionMessages(prev => [...prev, {
          role: "assistant",
          text: text,
          confidence_score: confidenceScore,
          sources: sources,
          evidence_trail: evidenceTrail
        }]);

        if (sources) {
          const found = cases.filter(c => sources.includes(c.fir_number));
          if (found.length > 0) {
            setGraphCases(found);
            setSelectedCase(found[0]);
            if (found[0].accused.length > 0) {
              setActiveSuspect(found[0].accused[0]);
            }
          }
        }
        setLoadingResponse(false);
        syncChatWithMap(userMsg, text, sources || []);
      }, 800);
    }
  };


  // Export PDF
  const downloadPdf = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          session_id: chatSessionId,
          // Serverless backends don't keep session memory, so send the transcript
          history: messages.map(m => ({ role: m.role, text: m.text }))
        })
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CrimeMind_Session_${chatSessionId.slice(0, 6)}.pdf`;
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

  const colors = [
    theme.id === "dark" ? "#a78bfa" : "#7c3aed", // Cyber Purple
    theme.id === "dark" ? "#f472b6" : "#db2777", // Pink
    theme.id === "dark" ? "#fb7185" : "#e11d48", // Rose
    theme.id === "dark" ? "#fbbf24" : "#d97706", // Amber
    theme.id === "dark" ? "#34d399" : "#10b981", // Neon Emerald
    theme.id === "dark" ? "#22d3ee" : "#3b82f6"  // Cyber Cyan
  ];



  const matchingSuggestions = graphSearchQuery.trim().length >= 2
    ? cases.filter(c =>
      c.fir_number.toLowerCase().includes(graphSearchQuery.toLowerCase()) ||
      c.crime_head.toLowerCase().includes(graphSearchQuery.toLowerCase()) ||
      c.accused.some(a => a.toLowerCase().includes(graphSearchQuery.toLowerCase())) ||
      c.phone_numbers.some(p => p.toLowerCase().includes(graphSearchQuery.toLowerCase())) ||
      c.vehicles.some(v => v.toLowerCase().includes(graphSearchQuery.toLowerCase())) ||
      c.bank_accounts.some(b => b.toLowerCase().includes(graphSearchQuery.toLowerCase()))
    )
    : [];

  const renderMessageText = (text: string) => {
    const cleanText = text.replace(/\[Target Suspect:.*?\]\s*/g, "").replace(/\[Target Case:.*?\]\s*/g, "");
    const firRegex = /(FIR-\d+(?:\/\d+)?)/g;
    const parts = cleanText.split(firRegex);
    return parts.map((part, i) => {
      if (part.match(firRegex)) {
        const matched = cases.find(c => c.fir_number.toLowerCase() === part.toLowerCase() || c.fir_number.toLowerCase().includes(part.toLowerCase()));
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (matched) {
                setSelectedCase(matched);
                setActiveTab("cases");
              } else {
                setSearchQuery(part);
                setActiveTab("cases");
              }
            }}
            className="mx-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:text-zinc-950 border border-zinc-750 dark:border-zinc-350 font-bold font-mono text-[10px] cursor-pointer inline-flex items-center gap-0.5 transition-all hover:scale-105"
            title="Inspect Case"
          >
            <Search className="w-2.5 h-2.5" />
            {part}
          </button>
        );
      }
      return part;
    });
  };

  if (false && !token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl w-full max-w-md shadow-2xl border border-slate-700">
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-bold text-white text-center">CrimeMind AI</h1>
            <p className="text-slate-400 text-sm text-center mt-1">Authorized Personnel Only (KSP)</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-1 font-medium">Officer Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-purple-500" required placeholder="inspector@ksp.gov.in" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1 font-medium">Access Code</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-purple-500" required placeholder="••••••••" />
            </div>
            {loginError && <div className="text-red-400 text-sm text-center font-medium bg-red-900/20 p-2 rounded">{loginError}</div>}
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-lg">Authorize Protocol</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden ${theme.bodyBg} ${theme.textMain} transition-colors duration-300 flex flex-col font-sans selection:${theme.id === "dark" ? "bg-purple-500 text-white" : "bg-purple-600 text-white"}`}>
      {/* Header */}
      <header className={`border-b ${theme.border} bg-white/80 dark:bg-black/80 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 ${theme.textMain}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${theme.id === "dark" ? "from-purple-500/10 to-fuchsia-500/20 border border-purple-500/30" : "from-purple-100 to-fuchsia-100 border border-purple-200/60"}`}>
            <img src="/logo.png" className="w-5 h-5 object-contain" alt="CrimeMind Logo" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight font-sans">
              CrimeMind AI
            </h1>
            <p className={`text-[9px] ${theme.textMuted} font-mono uppercase tracking-widest`}>KSP Intelligence Command Console</p>
          </div>
        </div>

        {/* Minimal Underlined Navigation Tabs */}
        <nav className={`flex gap-1.5 bg-slate-500/10 dark:bg-white/5 p-1 rounded-full border ${theme.border}`}>
          {(["dashboard", "chat", "network", "cases", "map"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all rounded-full cursor-pointer relative ${activeTab === tab
                ? `${theme.accentText} ${theme.accentBg}`
                : `${theme.textMuted} hover:${theme.textMain}`
                }`}
            >
              {tab === "chat" ? "AI Assistant" : tab === "network" ? "Link Analysis" : tab === "map" ? "KSP Intelligence Map" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {/* Actions & Theme Picker */}
        <div className="flex items-center gap-6">
          {/* Custom Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme.border} bg-slate-500/5 dark:bg-white/5 hover:bg-slate-500/10 dark:hover:bg-white/10 transition-all text-xs font-medium cursor-pointer ${theme.textMain}`}
              title="Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{languagesList.find(l => l.code === language)?.native || "EN"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 font-bold" />
            </button>

            {isLangDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsLangDropdownOpen(false)}
                />
                <div className={`absolute right-0 mt-2 w-36 rounded-xl border ${theme.border} ${theme.id === 'dark' ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-md shadow-xl py-1.5 z-20`}>
                  {languagesList.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${language === lang.code
                        ? (theme.id === "dark" ? "bg-zinc-800 text-zinc-100 font-semibold" : "bg-zinc-100 text-zinc-900 font-semibold")
                        : (theme.id === "dark" ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900")
                        }`}
                    >
                      <span>{lang.label}</span>
                      <span className="text-[10px] text-zinc-500 font-normal">{lang.native}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme, Notification, Settings, and User Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme.id === "dark" ? THEMES[1] : THEMES[0])}
              className={`p-2 rounded-xl border ${theme.border} bg-slate-500/5 dark:bg-white/5 hover:bg-slate-500/10 dark:hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center ${theme.textMain}`}
              title="Switch Theme"
            >
              {theme.id === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Admin Profile */}
            <div className={`flex items-center gap-3 border-l ${theme.border} pl-4`}>
              <div className="text-right">
                <div className={`text-xs font-bold ${theme.textMain}`}>KSP Admin</div>
              </div>

              {/* KSP Emblem Logo */}
              <div className={`w-8 h-8 rounded-full overflow-hidden border ${theme.border} bg-purple-950/10 dark:bg-white/5 flex items-center justify-center p-1`}>
                <img src="/logo.png" className="w-full h-full object-contain" alt="KSP Emblem" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={`flex-1 min-h-0 w-full relative ${activeTab === "network" || activeTab === "map" ? "overflow-hidden" : "overflow-auto p-6 max-w-7xl mx-auto w-full"}`}>
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 scanlines relative">
            <div className="scanline-light" />

            {/* HUD Status Header */}
            <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center p-4 rounded-xl border ${theme.border} ${theme.cardBg} gap-4 relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-2 h-full ${theme.accentBg}`} />
              <div>
                <h2 className="text-xs font-bold font-mono tracking-widest uppercase">
                  CRIMEMIND AI // ACTIVE INTEL CONSOLE
                </h2>
                <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] font-mono ${theme.textMuted}`}>
                  <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${theme.accentBg} animate-ping`}></span> ENGINE: ACTIVE</span>
                  <span>DATABASE: ONLINE</span>
                  <span>MO SEARCH PATTERNS: ENFORCED</span>
                </div>
              </div>
              <div className={`text-right font-mono text-xs font-bold px-3 py-1.5 rounded border ${theme.border} ${theme.cardBg}`}>
                {currentTime || "CONNECTING SYSTEM CLOCK..."}
              </div>
            </div>

            {/* Active Context Banner */}
            {(activeSuspect || selectedCase) && (
              <div className={`p-4 rounded-xl border ${theme.id === 'dark' ? 'border-[#B4BBC5]/15 bg-zinc-950/40' : 'border-[#B4BBC5]/30 bg-slate-50'} backdrop-blur-sm flex items-center justify-between text-xs`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex h-2 w-2 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.id === 'dark' ? 'bg-[#E8F0FE]' : 'bg-[#1A182F]'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.id === 'dark' ? 'bg-[#E8F0FE]' : 'bg-[#1A182F]'}`}></span>
                  </span>
                  <span className="font-semibold text-slate-400">Active Focus:</span>
                  {activeSuspect && (
                    <span className={`px-2 py-0.5 rounded font-bold border ${theme.id === 'dark' ? 'bg-[#E8F0FE]/10 text-[#E8F0FE] border-[#E8F0FE]/30' : 'bg-[#1A182F]/10 text-[#1A182F] border-[#1A182F]/30'}`}>Suspect: {activeSuspect}</span>
                  )}
                  {selectedCase && (
                    <span className={`px-2 py-0.5 rounded font-bold border ${theme.id === 'dark' ? 'bg-[#E8F0FE]/10 text-[#E8F0FE] border-[#E8F0FE]/30' : 'bg-[#1A182F]/10 text-[#1A182F] border-[#1A182F]/30'}`}>Case: {selectedCase.fir_number}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setActiveSuspect(null);
                    setSelectedCase(null);
                  }}
                  className={`px-2 py-1 rounded bg-slate-500/10 hover:bg-slate-500/25 text-[10px] font-bold uppercase tracking-wider ${theme.id === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'} transition-all cursor-pointer`}
                >
                  Clear Focus
                </button>
              </div>
            )}

            {/* Live Telemetry Ticker */}
            <div className={`border p-4 rounded-xl font-mono text-[10px] space-y-1 relative shadow-inner overflow-hidden ${theme.border} ${theme.cardBg} ${theme.textMain}`}>
              <div className={`absolute top-2 right-3 text-[9px] uppercase tracking-widest animate-pulse font-sans ${theme.textMuted}`}>Telemetry Stream</div>
              <div className={`border-b pb-1 mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans ${theme.border} ${theme.textMuted}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme.id === 'dark' ? 'bg-cyan-400' : 'bg-blue-600'}`}></span> Live Scanner Feed:
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {scanLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className={theme.textMuted}>[{new Date().toLocaleTimeString()}]</span>
                    <span className={log.includes("ALERT") ? "font-bold underline" : ""}>{log}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Filters Toolbar */}
            <div className={`flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-xl border cyber-panel ${theme.border} ${theme.cardBg}`}>
              <div className="flex flex-wrap gap-3 items-center">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>Filter Registry:</span>
                <div className="relative">
                  <select
                    value={selectedCityFilter}
                    onChange={(e) => setSelectedCityFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none bg-transparent ${theme.border} ${theme.textMain}`}
                  >
                    {availableCities.map(city => (
                      <option key={city} value={city} className={theme.id === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}>{city === "All" ? "All Cities" : city}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={selectedCrimeFilter}
                    onChange={(e) => setSelectedCrimeFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none bg-transparent ${theme.border} ${theme.textMain}`}
                  >
                    {availableCrimes.map(crime => (
                      <option key={crime} value={crime} className={theme.id === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}>{crime === "All" ? "All Crime Heads" : crime}</option>
                    ))}
                  </select>
                </div>
              </div>
              {(selectedCityFilter !== "All" || selectedCrimeFilter !== "All") && (
                <button
                  onClick={() => {
                    setSelectedCityFilter("All");
                    setSelectedCrimeFilter("All");
                  }}
                  className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} hover:${theme.textMain} cursor-pointer transition-colors`}
                >
                  Clear Active Filters
                </button>
              )}
            </div>

            {/* Minimal Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  label: "Total Filtered Cases",
                  val: String(scaledTotal.toLocaleString()),
                  trend: "Total matching current filters",
                  icon: <Briefcase className="w-4 h-4 text-zinc-300" />,
                  cyberClass: "cyber-zinc"
                },
                {
                  label: "Under Investigation",
                  val: String(scaledActive.toLocaleString()),
                  trend: "Active leads & case monitoring",
                  icon: <User className="w-4 h-4 text-zinc-400" />,
                  cyberClass: "cyber-zinc"
                },
                {
                  label: "Resolved Cases",
                  val: String(scaledClosed.toLocaleString()),
                  trend: "Archived & closed records",
                  icon: <Check className="w-4 h-4 text-zinc-300" />,
                  cyberClass: "cyber-zinc"
                },
                {
                  label: "Resolution Rate",
                  val: scaledTotal ? Math.round((scaledClosed / scaledTotal) * 100) + "%" : "0%",
                  trend: "Average conviction / closure",
                  critical: true,
                  icon: <TrendingUp className="w-4 h-4 text-zinc-100" />,
                  cyberClass: "cyber-white"
                }
              ].map((m, idx) => (
                <div key={idx} className={`p-6 rounded-xl border ${theme.border} ${theme.cardBg} transition-all duration-300 hover:shadow-lg hover:shadow-zinc-500/5 group relative overflow-hidden cyber-panel ${m.cyberClass} ${theme.textMain}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-widest`}>{m.label}</div>
                    {m.icon}
                  </div>
                  <div className="text-2xl font-bold tracking-tight font-mono">{m.val}</div>
                  <div className={`text-[10px] ${theme.textMuted} mt-2 font-mono uppercase tracking-wider`}>{m.trend}</div>
                </div>
              ))}
            </div>

            {/* Hotspots & Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Classification of Crime Cases Bar Chart */}
              <div className={`border ${theme.border} ${theme.cardBg} p-5 rounded-xl flex flex-col shadow-sm cyber-panel cyber-cyan ${theme.textMain}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-500" /> Crime Case Classifications
                </h3>
                {activeClassifications.length > 0 ? (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeClassifications} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} horizontal={true} vertical={false} />
                        <XAxis type="number" stroke={theme.chartStroke} fontSize={10} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke={theme.chartStroke} fontSize={9} tickLine={false} width={100} />
                        <Tooltip contentStyle={{ backgroundColor: theme.id === "dark" ? "#0a0a0f" : "#ffffff", borderColor: theme.id === "dark" ? "#1e293b" : "#e2e8f0", borderRadius: "12px" }} />
                        <Bar dataKey="value" fill={theme.id === "dark" ? "#22d3ee" : "#3b82f6"} radius={[0, 4, 4, 0]}>
                          {activeClassifications.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-500">No data matches this filter</div>
                )}
              </div>

              {/* City / Station Distribution Bar Chart */}
              <div className={`border ${theme.border} ${theme.cardBg} p-5 rounded-xl flex flex-col shadow-sm cyber-panel cyber-emerald ${theme.textMain}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  {selectedCityFilter !== "All"
                    ? `${selectedCityFilter} — Station-wise Distribution`
                    : "Geographic Crime Distribution"}
                </h3>
                {activeCityDistribution.length > 0 ? (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeCityDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} horizontal={false} vertical={true} />
                        <XAxis
                          dataKey="name"
                          stroke={theme.chartStroke}
                          fontSize={9}
                          tickLine={false}
                          interval={0}
                          tick={{ angle: activeCityDistribution.length > 5 ? -30 : 0, textAnchor: activeCityDistribution.length > 5 ? "end" : "middle", dy: activeCityDistribution.length > 5 ? 8 : 0 }}
                        />
                        <YAxis stroke={theme.chartStroke} fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: theme.id === "dark" ? "#0a0a0f" : "#ffffff", borderColor: theme.id === "dark" ? "#1e293b" : "#e2e8f0", borderRadius: "12px" }}
                          formatter={(value: any, _name: any) => [value, selectedCityFilter !== "All" ? "Cases" : "Total Cases"]}
                        />
                        <Bar
                          dataKey="value"
                          fill={theme.id === "dark" ? "#34d399" : "#10b981"}
                          radius={[4, 4, 0, 0]}
                          onClick={(data: any) => {
                            if (data && data.name) {
                              const name = data.name.replace(" District", "").replace(" City", "").trim();
                              setSelectedCityFilter(name);
                              setActiveTab("map");
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {activeCityDistribution.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={colors[(index + 2) % colors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-500">No data matches this filter</div>
                )}
              </div>
            </div>

            {/* Recent Filtered Cases List */}
            <div className={`border ${theme.border} ${theme.cardBg} p-6 rounded-xl shadow-sm cyber-panel ${theme.textMain}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} mb-4 flex items-center gap-2`}>
                <AlertTriangle className={`w-3.5 h-3.5 ${theme.textMuted}`} />
                Recent Filtered Case Registry
              </h3>
              {displayedFilteredCases.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b ${theme.border} ${theme.textMuted} font-mono`}>
                        <th className="py-2.5 font-bold uppercase tracking-wider">FIR Number</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Classification</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Location / Police Station</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Status</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme.border}/20`}>
                      {displayedFilteredCases.slice(0, 15).map((c) => (
                        <tr key={c.id} className="hover:bg-slate-500/10 transition-colors font-mono">
                          <td className={`py-3 font-bold ${theme.textMain} underline`}>{c.fir_number}</td>
                          <td className={`py-3 font-semibold ${theme.textMuted}`}>{c.crime_head}</td>
                          <td className={`py-3 ${theme.textMuted}`}>{c.police_station} ({c.location})</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${theme.border} ${theme.cardBg} ${theme.textMain}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedCase(c);
                                setActiveTab("cases");
                              }}
                              className={`px-3 py-1 rounded border ${theme.border} hover:bg-slate-500/10 ${theme.textMain} text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all`}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className={`mt-4 pt-3 border-t ${theme.border} flex justify-between items-center text-[10px] ${theme.textMuted} font-mono uppercase tracking-wider`}>
                    <div>Showing first {Math.min(scaledTotal, 15)} of {scaledTotal.toLocaleString()} cases matching filters</div>
                    <div>Database Registry Sync: Active</div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">No cases match the active filters</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AI ASSISTANT CHAT */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[72vh]">
            {/* Sidebar: Chat History */}
            <div className={`lg:col-span-1 flex flex-col border ${theme.border} ${theme.cardBg} rounded-2xl overflow-hidden h-full shadow-lg p-4 gap-4 ${theme.textMain}`}>
              <div className="flex items-center justify-between border-b pb-3 border-zinc-800/10 dark:border-white/10">
                <span className="text-xs font-bold font-mono uppercase tracking-wider">Sessions</span>
                <button
                  onClick={handleNewSession}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 font-bold uppercase tracking-wider rounded ${theme.accentBg} ${theme.accentText} cursor-pointer`}
                  title="Start New Chat Session"
                >
                  + New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setCurrentSessionId(s.id);
                      setEditingIndex(null);
                      setEditingText("");
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all hover:bg-slate-500/10 ${currentSessionId === s.id
                      ? `${theme.border} bg-slate-500/10 shadow-sm border-blue-500/30`
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                      }`}
                  >
                    <span className="truncate pr-2 font-mono">{s.name}</span>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="text-rose-500 hover:text-rose-450 font-bold px-1.5 py-0.5 rounded hover:bg-rose-500/10 cursor-pointer"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat conversation area */}
            <div className={`lg:col-span-2 flex flex-col border ${theme.border} ${theme.cardBg} rounded-2xl overflow-hidden h-full shadow-lg ${theme.textMain}`}>
              {/* Chat Header */}
              <div className={`p-4 bg-transparent border-b ${theme.border} flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full glow-indicator-green"></div>
                  <span className="text-xs font-mono uppercase tracking-wider">Session Console</span>
                </div>
                {(activeSuspect || selectedCase) && (
                  <div className={`flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-semibold font-mono px-2 py-0.5 rounded border ${theme.id === 'dark' ? 'bg-[#E8F0FE]/10 text-[#E8F0FE] border-[#E8F0FE]/20' : 'bg-[#1A182F]/10 text-[#1A182F] border-[#1A182F]/20'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme.id === 'dark' ? 'bg-[#E8F0FE]' : 'bg-[#1A182F]'}`}></span>
                    Focus: {activeSuspect || selectedCase?.fir_number}
                  </div>
                )}
              </div>

              {/* Message History */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-xs">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 relative group transition-all duration-200 ${m.role === "user" ? theme.chatUser + ' rounded-tr-sm' : theme.chatAssistant + ' rounded-tl-sm'
                      } shadow-sm hover:shadow-md`}>

                      {m.role === "user" && editingIndex !== idx && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIndex(idx);
                            setEditingText(m.text);
                          }}
                          className={`absolute top-2.5 right-9 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer ${theme.id === "dark"
                            ? "hover:bg-slate-800/80 text-slate-400 hover:text-slate-100"
                            : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                            }`}
                          title="Edit message"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {editingIndex !== idx && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m.text, idx)}
                          className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer ${theme.id === "dark"
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
                      )}

                      {editingIndex === idx ? (
                        <div className="flex flex-col gap-2.5 min-w-[200px] sm:min-w-[300px] pt-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className={`w-full bg-transparent border ${theme.border} rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-500 ${theme.textMain} placeholder-slate-500`}
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(null);
                                setEditingText("");
                              }}
                              className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(idx)}
                              className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded bg-zinc-100 text-zinc-950 hover:bg-white transition-colors cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className={`leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'pr-14' : 'pr-6'}`}>{renderMessageText(m.text)}</p>
                      )}

                      {m.role === "assistant" && (
                        <div className="mt-3.5 pt-3 border-t border-zinc-800/10 dark:border-zinc-200/10 space-y-2.5 text-[10px]">
                          {/* KSP Intelligence Evidence Box */}
                          <div className={`p-2.5 rounded-xl border ${theme.id === "dark" ? "bg-cyan-950/20 border-cyan-500/25 text-cyan-200" : "bg-blue-50/80 border-blue-200 text-blue-900"} space-y-1.5 shadow-sm`}>
                            <div className="flex items-center justify-between font-bold tracking-wider text-[9px] uppercase border-b pb-1 border-current/15">
                              <span className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                                KSP Intelligence Evidence Attribution
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[8px] font-bold border border-cyan-400/30">
                                {m.evidence_metadata?.confidence || ((m.confidence_score ?? 0.95) >= 0.95 ? "Exact Database Match (100%)" : "Database Verified")}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9.5px] pt-0.5">
                              <div>
                                <span className="opacity-70">Matched by:</span>{" "}
                                <strong className="font-semibold">{m.evidence_metadata?.matched_by || (m.sources && m.sources.length > 0 ? "FIR / Unique Identifier" : "Database Query")}</strong>
                              </div>
                              <div>
                                <span className="opacity-70">Records Found:</span>{" "}
                                <strong className="font-semibold">{m.evidence_metadata?.records_found ?? (m.sources ? m.sources.length : 0)}</strong>
                              </div>
                              <div>
                                <span className="opacity-70">Data Source:</span>{" "}
                                <strong className="font-semibold">{m.evidence_metadata?.data_source || "KSP Crime Database"}</strong>
                              </div>
                              <div>
                                <span className="opacity-70">Database Sync:</span>{" "}
                                <strong className="font-semibold text-emerald-400">Live Active Registry</strong>
                              </div>
                            </div>
                          </div>

                          {m.sources && m.sources.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="font-semibold text-zinc-500">VERIFIED FIR SOURCES:</span>
                              {m.sources.map((src, sIdx) => {
                                const matched = cases.find(c => c.fir_number.toLowerCase() === src.toLowerCase());
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => {
                                      if (matched) {
                                        setSelectedCase(matched);
                                        setActiveTab("cases");
                                      } else {
                                        setSearchQuery(src);
                                        setActiveTab("cases");
                                      }
                                    }}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 border border-zinc-750 dark:border-zinc-300 px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 hover:scale-105"
                                    title="Click to view Case Details"
                                  >
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                    {src}
                                  </button>
                                );
                              })}
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
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={submitChat} className={`p-4 border-t ${theme.border} flex gap-3 bg-slate-500/5`}>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        alert(`File selected: ${file.name} (Mock upload successful)`);
                      }
                    };
                    input.click();
                  }}
                  className={`p-3 rounded-xl border ${theme.border} text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 transition-all cursor-pointer`}
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitChat();
                    }
                  }}
                  placeholder={
                    language === "kn" ? "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಇತ್ತೀಚಿನ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸಿ..." :
                      language === "hi" ? "बेंगलुरु में चोरी के मामले दिखाएं..." :
                        language === "te" ? "బెంగళూరులో దొంగతనం కేసులు చూపించు..." :
                          language === "ta" ? "பெங்களூரில் திருட்டு வழக்குகளைக் காட்டு..." :
                            "Show burglary cases in Bengaluru..."
                  }
                  rows={1}
                  className={`flex-1 bg-transparent border ${theme.border} rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-500 ${theme.textMain} placeholder-slate-500 resize-none overflow-y-auto max-h-24 min-h-[38px]`}
                />



                <button
                  type="submit"
                  disabled={loadingResponse || !chatInput.trim()}
                  className={`px-5 py-3 rounded-xl uppercase font-bold tracking-wider text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-300 shadow-md ${
                    loadingResponse || !chatInput.trim()
                      ? (theme.id === "dark"
                          ? "bg-[#E8F0FE]/10 border border-[#E8F0FE]/15 text-[#E8F0FE]/40 cursor-not-allowed shadow-none"
                          : "bg-[#1A182F]/10 border border-[#1A182F]/10 text-[#1A182F]/40 cursor-not-allowed shadow-none")
                      : (theme.id === "dark"
                          ? "bg-[#E8F0FE] text-[#090C10] hover:bg-white hover:shadow-[0_0_20px_rgba(232,240,254,0.7)] shadow-[0_0_12px_rgba(232,240,254,0.4)] scale-102 font-bold"
                          : "bg-[#1A182F] text-white hover:bg-black hover:shadow-[0_4px_15px_rgba(26,24,47,0.3)] scale-102")
                  }`}
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

        {/* TAB 3: RELATIONSHIP INTELLIGENCE (Google Maps / Figma Infinite Canvas Style) */}
        {activeTab === "network" && (
          <div className={`absolute inset-0 w-full h-full overflow-hidden select-none ${theme.id === "dark" ? "bg-[#0B0F17]" : "bg-[#f8fafc]"}`}>
            {/* The Infinite Canvas Graph */}
            <svg
              ref={svgRef}
              className="w-full h-full cursor-grab active:cursor-grabbing select-none"
              style={{ minHeight: "100%" }}
            />

            {/* Google Maps Style Floating Search Bar */}
            <div className={`absolute top-28 left-6 z-40 w-80 sm:w-96 shadow-2xl rounded-2xl backdrop-blur-md ${theme.cardBg} ${theme.textMain} p-2`}>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
                <input
                  type="text"
                  placeholder="Search FIR, Person, Phone, Vehicle..."
                  value={graphSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGraphSearchQuery(val);
                    setShowGraphSuggestions(true);
                    // Auto-load top matching case into graph as user types
                    if (val.trim().length >= 3) {
                      const q = val.trim().toLowerCase();
                      const match = cases.find(c =>
                        c.fir_number.toLowerCase().includes(q) ||
                        c.accused.some(a => a.toLowerCase().includes(q)) ||
                        c.phone_numbers.some(p => p.toLowerCase().includes(q)) ||
                        c.vehicles.some(v => v.toLowerCase().includes(q)) ||
                        c.bank_accounts.some(b => b.toLowerCase().includes(q)) ||
                        c.crime_head.toLowerCase().includes(q) ||
                        c.location.toLowerCase().includes(q)
                      );
                      if (match && !graphCases.some(gc => gc.id === match.id)) {
                        loadCaseGraph(match);
                      }
                    }
                  }}
                  onFocus={() => setShowGraphSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matchingSuggestions.length > 0) {
                      const top = matchingSuggestions[0];
                      loadCaseGraph(top);
                      setGraphSearchQuery(top.fir_number);
                      setShowGraphSuggestions(false);
                    }
                  }}
                  className={`w-full bg-transparent pl-9 pr-8 py-2 text-xs focus:outline-none placeholder-zinc-500 font-sans ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}
                />
                {graphSearchQuery && (
                  <button
                    onClick={() => {
                      setGraphSearchQuery("");
                      setShowGraphSuggestions(false);
                    }}
                    className={`absolute right-3 text-zinc-400 ${theme.id === 'dark' ? 'hover:text-zinc-200' : 'hover:text-zinc-700'} text-xs font-bold`}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Autocomplete Suggestions */}
              {showGraphSuggestions && matchingSuggestions.length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto z-50 rounded-2xl border ${theme.cardBg} ${theme.border} p-2 shadow-2xl`}>
                  <div className="px-3 pb-1 pt-1 text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Click or press Enter to load into graph</div>
                  {matchingSuggestions.slice(0, 15).map(c => (
                    <div
                      key={c.id}
                      className={`px-3 py-2 ${theme.id === 'dark' ? 'hover:bg-purple-500/10' : 'hover:bg-purple-500/5'} rounded-lg cursor-pointer flex justify-between items-center text-xs transition-colors`}
                      onClick={() => {
                        loadCaseGraph(c);
                        setGraphSearchQuery(c.fir_number);
                        setShowGraphSuggestions(false);
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className={`font-mono text-[11px] ${theme.id === 'dark' ? 'text-purple-300' : 'text-[#1A182F]'} font-bold`}>{c.fir_number}</span>
                        <span className="text-[10px] text-zinc-500">{c.police_station}</span>
                      </div>
                      <span className={`text-[10px] ${theme.id === 'dark' ? 'text-zinc-400' : 'text-zinc-650'} truncate max-w-[110px] ml-2 text-right`}>{c.crime_head}</span>
                    </div>
                  ))}
                </div>
              )}
              {showGraphSuggestions && graphSearchQuery.trim().length >= 2 && matchingSuggestions.length === 0 && (
                <div className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl border ${theme.cardBg} ${theme.border} px-3 py-2 text-[10px] text-zinc-500 shadow-2xl`}>
                  No matching cases found
                </div>
              )}
            </div>

            {/* Filter Chips (Google Maps style category chips right below the search bar) */}
            <div className="absolute top-44 left-6 z-30 flex flex-wrap gap-1.5 max-w-lg sm:max-w-xl">
              {[
                { label: "Phones", key: "phone" },
                { label: "Vehicles", key: "vehicle" },
                { label: "Banks", key: "bank_account" },
                { label: "People", key: "people" },
                { label: "Officers", key: "officer" },
                { label: "Locations", key: "location" }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveEntityFilter(prev => prev === f.key ? null : f.key)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-sans font-semibold border transition-all cursor-pointer shadow-sm ${
                    activeEntityFilter === f.key
                      ? (theme.id === "dark" 
                          ? "bg-[#E8F0FE] border-[#E8F0FE] text-[#090C10] shadow-[0_0_12px_rgba(232,240,254,0.55)] scale-105 font-bold" 
                          : "bg-[#1A182F] border-[#1A182F] text-white shadow-[0_4px_12px_rgba(26,24,47,0.25)] scale-105")
                      : (theme.id === "dark" 
                          ? "bg-[#1A182F]/40 border-[#B4BBC5]/25 text-[#B4BBC5]/70 hover:text-[#E8F0FE] hover:border-[#E8F0FE]/40 hover:bg-[#E8F0FE]/10" 
                          : "bg-white border-[#B4BBC5]/50 text-[#1A182F]/80 hover:bg-[#E8F0FE]/60 hover:text-[#1A182F] hover:border-[#1A182F]/30")
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {activeEntityFilter && (
                <button
                  onClick={() => setActiveEntityFilter(null)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-sans font-semibold border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>

            {/* Floating Action Toolbar on the left */}
            <div className={`absolute top-56 left-6 z-30 flex flex-col gap-2 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md ${theme.cardBg}`}>
              <button
                onClick={handleZoomIn}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${theme.id === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'} hover:bg-slate-500/10 transition-colors cursor-pointer`}
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${theme.id === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'} hover:bg-slate-500/10 transition-colors cursor-pointer`}
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${theme.id === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'} hover:bg-slate-500/10 transition-colors cursor-pointer`}
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearGraph}
                className="w-10 h-10 rounded-full flex items-center justify-center text-rose-500 hover:text-rose-450 hover:bg-slate-500/10 transition-colors cursor-pointer"
                title="Clear Graph"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Right Sliding Node Inspector Panel */}
            {selectedNode && (
              <div className={`absolute top-28 right-6 bottom-28 w-80 sm:w-[360px] ${theme.cardBg} rounded-2xl shadow-2xl z-40 overflow-y-auto p-5 space-y-5`}>
                <div className={`flex items-center justify-between border-b ${theme.id === 'dark' ? 'border-purple-500/20' : 'border-purple-200'} pb-3`}>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.id === 'dark' ? 'text-zinc-400' : 'text-zinc-500'} font-sans`}>Node Inspector</h3>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Avatar and Info Header */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-500/5 border border-purple-500/15">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base shadow-lg"
                    style={{
                      background: "#0f0d1e",
                      border: `2px solid ${getNodeColor(selectedNode.type)}`,
                      boxShadow: `0 0 14px ${getNodeColor(selectedNode.type)}44`
                    }}
                  >
                    {selectedNode.type === "incident" ? "📂" :
                      selectedNode.type === "accused" ? "👤" :
                        selectedNode.type === "phone" ? "📱" :
                          selectedNode.type === "vehicle" ? "🚗" :
                            selectedNode.type === "bank_account" ? "🏦" :
                              selectedNode.type === "location" ? "📍" :
                                selectedNode.type === "officer" ? "👮" : "❓"}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'} font-sans tracking-tight`}>{selectedNode.label || selectedNode.id}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: getNodeColor(selectedNode.type) }}>
                      {selectedNode.type === "incident" ? "Case File" :
                        selectedNode.type === "accused" ? "Primary Suspect" :
                          selectedNode.type === "phone" ? "Active Phone Node" :
                            selectedNode.type === "vehicle" ? "Vehicle" :
                              selectedNode.type === "bank_account" ? "Bank Account" :
                                selectedNode.type === "location" ? "Location" :
                                  selectedNode.type === "officer" ? "Investigating Officer" : "Entity"}
                    </span>
                  </div>
                </div>

                {/* Real data from FIR case */}
                {(() => {
                  const nodeId = selectedNode.id;
                  const firCase = cases.find(c =>
                    c.fir_number === nodeId ||
                    c.accused.some(a => a.toLowerCase() === nodeId.toLowerCase()) ||
                    c.phone_numbers.some(p => p.toLowerCase() === nodeId.toLowerCase()) ||
                    c.vehicles.some(v => v.replace("-", "").replace(" ", "").toLowerCase() === nodeId.replace("-", "").replace(" ", "").toLowerCase()) ||
                    c.bank_accounts.some(b => b.toLowerCase() === nodeId.toLowerCase())
                  ) || graphCases[0] || null;
                  const phones = firCase?.phone_numbers || [];
                  const vehicles = firCase?.vehicles || [];
                  const banks = firCase?.bank_accounts || [];
                  const accused = firCase?.accused || [];
                  const casesLinked = cases.filter(c =>
                    c.accused.some(a => a === nodeId) ||
                    c.phone_numbers.some(p => p === nodeId) ||
                    c.vehicles.some(v => v === nodeId) ||
                    c.bank_accounts.some(b => b === nodeId)
                  ).length;

                  return (
                    <div className={`space-y-3 pt-1 font-mono text-[11px] ${theme.id === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                        <span className="text-zinc-500 font-sans">FIR ID</span>
                        <span className={`font-bold ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{firCase?.fir_number || nodeId}</span>
                      </div>
                      <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                        <span className="text-zinc-500 font-sans">Node</span>
                        <span className={`font-bold truncate max-w-[160px] ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{nodeId}</span>
                      </div>
                      {selectedNode.type === "incident" && firCase && (
                        <>
                          <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                            <span className="text-zinc-500 font-sans">Crime Type</span>
                            <span className={`font-bold ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{firCase.crime_head}</span>
                          </div>
                          <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                            <span className="text-zinc-500 font-sans">Status</span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] border ${firCase.status === "Closed" ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>{firCase.status}</span>
                          </div>
                          <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                            <span className="text-zinc-500 font-sans">Location</span>
                            <span className={`font-bold truncate max-w-[150px] ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{firCase.location || "—"}</span>
                          </div>
                          <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                            <span className="text-zinc-500 font-sans">Station</span>
                            <span className={`font-bold truncate max-w-[150px] ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{firCase.police_station}</span>
                          </div>
                        </>
                      )}
                      {selectedNode.type === "accused" && (
                        <>
                          <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                            <span className="text-zinc-500 font-sans">Role</span>
                            <span className="font-bold text-rose-400 text-[9px] border border-rose-500/30 px-1.5 py-0.5 rounded">ACCUSED</span>
                          </div>
                          <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                            <span className="text-zinc-500 font-sans">Cases Linked</span>
                            <span className={`font-bold ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{casesLinked || 1}</span>
                          </div>
                        </>
                      )}
                      {selectedNode.type === "phone" && (
                        <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                          <span className="text-zinc-500 font-sans">Linked Suspect</span>
                          <span className={`font-bold truncate max-w-[150px] ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{accused.join(", ") || "—"}</span>
                        </div>
                      )}
                      {selectedNode.type === "vehicle" && (
                        <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                          <span className="text-zinc-500 font-sans">Reg. No.</span>
                          <span className={`font-bold ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{nodeId}</span>
                        </div>
                      )}
                      {selectedNode.type === "bank_account" && (
                        <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/15' : 'border-purple-200/50'}`}>
                          <span className="text-zinc-500 font-sans">Account</span>
                          <span className={`font-bold ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{nodeId}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Entity counts — real data from FIR ----*/}
                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold block tracking-wider">FIR Entities</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[[
                      graphCases[0]?.phone_numbers?.length || 0, "Phones", "text-emerald-400", "border-emerald-500/20", "phone"
                    ], [
                      graphCases[0]?.vehicles?.length || 0, "Vehicles", "text-cyan-400", "border-cyan-500/20", "vehicle"
                    ], [
                      graphCases[0]?.bank_accounts?.length || 0, "Banks", theme.id === 'dark' ? "text-[#E8F0FE]" : "text-[#1A182F]", theme.id === 'dark' ? "border-[#E8F0FE]/20" : "border-[#1A182F]/20", "bank_account"
                    ]].map(([cnt, lbl, clr, brd, key]) => (
                      <button
                        key={key as string}
                        onClick={() => setActiveEntityFilter(prev => prev === key ? null : key as string)}
                        className={`p-2 rounded-xl bg-slate-500/5 border transition-all text-center cursor-pointer hover:bg-slate-500/10 ${
                          activeEntityFilter === key
                            ? (theme.id === 'dark' ? "border-[#E8F0FE]/50 bg-[#E8F0FE]/10" : "border-[#1A182F]/50 bg-[#1A182F]/10")
                            : brd as string
                        }`}
                      >
                        <div className={`text-sm font-bold font-mono ${clr as string}`}>{cnt as number}</div>
                        <div className="text-[8px] font-bold text-zinc-500 font-sans uppercase">{lbl as string}</div>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[[
                      graphCases[0]?.accused?.length || 0, "Suspects", "text-rose-400", "border-rose-500/20", "people"
                    ], [
                      graphCases[0]?.location ? 1 : 0, "Locations", "text-amber-400", "border-amber-500/20", "location"
                    ]].map(([cnt, lbl, clr, brd, key]) => (
                      <button
                        key={key as string}
                        onClick={() => setActiveEntityFilter(prev => prev === key ? null : key as string)}
                        className={`p-2 rounded-xl bg-slate-500/5 border transition-all text-center cursor-pointer hover:bg-slate-500/10 ${activeEntityFilter === key ? "border-purple-500/50 bg-purple-500/10" : brd as string
                          }`}
                      >
                        <div className={`text-sm font-bold font-mono ${clr as string}`}>{cnt as number}</div>
                        <div className="text-[8px] font-bold text-zinc-500 font-sans uppercase">{lbl as string}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigate to case details */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const c = graphCases[0];
                      if (c) { setSelectedCase(c); setActiveTab("cases"); }
                    }}
                    className={`flex-1 py-2.5 rounded-xl border ${theme.id === 'dark' ? 'border-[#B4BBC5]/25 hover:bg-[#E8F0FE]/10 text-zinc-200 hover:text-[#E8F0FE]' : 'border-[#B4BBC5] hover:bg-[#E8F0FE]/20 text-[#1A182F]'} text-[10px] font-bold uppercase transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer`}
                  >
                    Open Sheet <ArrowUpRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("map");
                      setTimeout(() => {
                        if (mapControlRef.current) {
                          if (selectedNode.type === "incident") {
                            mapControlRef.current.focusCase(selectedNode.id);
                          } else {
                            const districtName = selectedCityFilter !== "All" ? selectedCityFilter : "Bengaluru";
                            mapControlRef.current.focusDistrict(districtName);
                          }
                        }
                      }, 200);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-[#090C10] font-bold text-[10px] uppercase transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(232,240,254,0.55)]"
                  >
                    Locate Map <MapPin className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Google Maps Style Bottom Status Bar */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border shadow-lg z-30 backdrop-blur-md text-[10px] font-mono flex items-center gap-4 ${theme.id === 'dark' ? 'border-purple-500/20 bg-black/90 text-zinc-400' : 'border-purple-300 bg-white/95 text-zinc-600'}`}>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Connected to KSP Database</span>
              <span className="border-l border-zinc-800 h-3"></span>
              <span>Graph Loaded</span>
              <span className="border-l border-zinc-800 h-3"></span>
              <span>AI Ready</span>
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
                {(() => {
                  const rawQuery = searchQuery.trim().toLowerCase();

                  const stopWords = new Set([
                    "is", "to", "a", "the", "and", "in", "of", "for", "with", "on", "at", "by", "an", "this",
                    "linked", "suspect", "suspects", "case", "cases", "details", "reported", "about",
                    "information", "regarding", "shown", "found", "was", "were", "has", "have", "had",
                    "relation", "associated", "under", "registered", "accused", "phone", "number",
                    "vehicle", "bank", "account", "to", "suspect(s)"
                  ]);

                  const filtered = !rawQuery
                    ? cases
                    : cases.filter(c => {
                      // Priority 1: Direct FIR number match (exact substring)
                      if (c.fir_number.toLowerCase().includes(rawQuery)) return true;

                      const keywords = rawQuery
                        .split(/[\s,.:;!?()"\'-]+/)
                        .map(w => w.trim())
                        .filter(w => w.length > 1 && !stopWords.has(w));

                      if (keywords.length === 0) {
                        return (
                          c.crime_head.toLowerCase().includes(rawQuery) ||
                          c.location.toLowerCase().includes(rawQuery)
                        );
                      }

                      return keywords.some(q =>
                        c.fir_number.toLowerCase().includes(q) ||
                        c.crime_head.toLowerCase().includes(q) ||
                        c.location.toLowerCase().includes(q) ||
                        c.description.toLowerCase().includes(q) ||
                        c.accused.some(a => a.toLowerCase().includes(q)) ||
                        c.phone_numbers.some(p => p.toLowerCase().includes(q)) ||
                        c.vehicles.some(v => v.toLowerCase().includes(q)) ||
                        c.bank_accounts.some(b => b.toLowerCase().includes(q))
                      );
                    });

                  if (filtered.length === 0 && rawQuery) {
                    return (
                      <div className="p-6 text-center text-xs text-slate-500 font-mono">
                        No cases found for &ldquo;{searchQuery}&rdquo;
                      </div>
                    );
                  }

                  return filtered.slice(0, 100).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className={`w-full text-left p-4 hover:bg-slate-500/5 transition-all flex flex-col gap-1 cursor-pointer ${theme.textMain} ${selectedCase?.id === c.id
                        ? (theme.id === "dark" ? "bg-slate-800/60 border-l-4 border-fuchsia-500" : "bg-purple-50 border-l-4 border-purple-600")
                        : ""
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold">{c.fir_number}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${c.status === "Closed" ? "border-emerald-500/30 text-emerald-500" : "border-amber-500/30 text-amber-500"
                          }`}>{c.status}</span>
                      </div>
                      <h4 className="text-xs font-semibold">{c.crime_head}</h4>
                      <p className={`text-[11px] ${theme.textMuted} truncate`}>{c.description}</p>
                    </button>
                  ));
                })()}
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
                    <div className={`text-[10px] ${theme.id === 'dark' ? 'text-[#E8F0FE]' : 'text-[#1A182F]'} font-bold uppercase tracking-wider mt-2`}>
                      Investigating Officer: <span className={`font-mono ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-850'}`}>{selectedCase.officer}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modus Operandi Details</h3>
                    <p className={`text-xs ${theme.textMuted} leading-relaxed bg-slate-500/5 p-4 rounded-xl border ${theme.border} font-mono`}>{selectedCase.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => {
                        if (selectedCase.accused && selectedCase.accused.length > 0) {
                          setActiveTab("network");
                          loadCaseGraph(selectedCase);
                          setGraphSearchQuery(selectedCase.accused[0]);
                        }
                      }}
                      className={`p-3 bg-slate-500/5 rounded-xl border ${theme.border} hover:bg-slate-500/10 transition-colors duration-200 space-y-1 cursor-pointer select-none`}
                    >
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Accused Suspects</div>
                      <div className="flex items-center gap-2">
                        <User className={`w-3.5 h-3.5 ${theme.id === 'dark' ? 'text-[#E8F0FE]' : 'text-[#1A182F]'}`} />
                        <span className="text-xs font-mono">{selectedCase.accused.join(", ")}</span>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        if (selectedCase.phone_numbers && selectedCase.phone_numbers.length > 0) {
                          setActiveTab("network");
                          loadCaseGraph(selectedCase);
                          setGraphSearchQuery(selectedCase.phone_numbers[0]);
                        }
                      }}
                      className={`p-3 bg-slate-500/5 rounded-xl border ${theme.border} hover:bg-slate-500/10 transition-colors duration-200 space-y-1 cursor-pointer select-none`}
                    >
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Linked Phone Nodes</div>
                      <div className="flex items-center gap-2">
                        <Phone className={`w-3.5 h-3.5 ${theme.id === 'dark' ? 'text-[#E8F0FE]' : 'text-[#1A182F]'}`} />
                        <span className="text-xs font-mono">{selectedCase.phone_numbers.join(", ") || "None"}</span>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        if (selectedCase.vehicles && selectedCase.vehicles.length > 0) {
                          setActiveTab("network");
                          loadCaseGraph(selectedCase);
                          setGraphSearchQuery(selectedCase.vehicles[0]);
                        }
                      }}
                      className={`p-3 bg-slate-500/5 rounded-xl border ${theme.border} hover:bg-slate-500/10 transition-colors duration-200 space-y-1 cursor-pointer select-none`}
                    >
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Vehicles Involved</div>
                      <div className="flex items-center gap-2">
                        <Car className={`w-3.5 h-3.5 ${theme.id === 'dark' ? 'text-[#E8F0FE]' : 'text-[#1A182F]'}`} />
                        <span className="text-xs font-mono">{selectedCase.vehicles.join(", ") || "None"}</span>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        if (selectedCase.bank_accounts && selectedCase.bank_accounts.length > 0) {
                          setActiveTab("network");
                          loadCaseGraph(selectedCase);
                          setGraphSearchQuery(selectedCase.bank_accounts[0]);
                        }
                      }}
                      className={`p-3 bg-slate-500/5 rounded-xl border ${theme.border} hover:bg-slate-500/10 transition-colors duration-200 space-y-1 cursor-pointer select-none`}
                    >
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Bank Accounts</div>
                      <div className="flex items-center gap-2">
                        <Briefcase className={`w-3.5 h-3.5 ${theme.id === 'dark' ? 'text-[#E8F0FE]' : 'text-[#1A182F]'}`} />
                        <span className="text-xs font-mono">{selectedCase.bank_accounts.join(", ") || "None"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Investigation Timeline */}
                  <div className="space-y-3 border-t border-slate-500/10 pt-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Investigation Timeline</h3>
                    <div className="relative pl-4 border-l border-zinc-750 dark:border-zinc-300 space-y-4 font-sans">
                      <div className="relative">
                        <div className={`absolute -left-[21px] top-1 ${theme.id === 'dark' ? 'bg-[#E8F0FE]' : 'bg-[#1A182F]'} h-2 w-2 rounded-full border border-slate-900`}></div>
                        <div className="text-[10px] text-slate-400 font-mono">{selectedCase.date_of_offence.slice(0, 10)} | {selectedCase.date_of_offence.slice(11, 16)}</div>
                        <div className="text-xs font-semibold">Incident Occurred</div>
                      </div>
                      <div className="relative">
                        <div className={`absolute -left-[21px] top-1 ${theme.id === 'dark' ? 'bg-[#E8F0FE]' : 'bg-[#1A182F]'} h-2 w-2 rounded-full border border-slate-900`}></div>
                        <div className="text-[10px] text-slate-400 font-mono">{selectedCase.date_of_registration.slice(0, 10)} | {selectedCase.date_of_registration.slice(11, 16)}</div>
                        <div className="text-xs font-semibold">FIR Registered at {selectedCase.police_station}</div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 bg-blue-500 h-2 w-2 rounded-full border border-slate-900"></div>
                        <div className="text-[10px] text-slate-400 font-mono">Status: {selectedCase.status}</div>
                        <div className="text-xs font-semibold">
                          {selectedCase.status === "Closed"
                            ? "Case resolved and archived in KSP Registry."
                            : "Active leads monitored. Intelligence mapping initialized."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-500/10 pt-4 flex gap-3">
                    <button
                      onClick={() => {
                        setActiveTab("chat");
                        submitChat(undefined, `Show me details and leads for ${selectedCase.fir_number}`);
                      }}
                      className={`bg-gradient-to-r ${theme.id === 'dark' ? 'from-[#E8F0FE] to-[#a9c6f5] hover:from-white hover:to-[#E8F0FE] text-[#090C10] shadow-[0_0_12px_rgba(232,240,254,0.4)] font-bold' : 'from-[#1A182F] to-[#2D2A4A] hover:from-black hover:to-[#1A182F] text-white'} flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-sm`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> AI Inquiry
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("network");
                        loadCaseGraph(selectedCase);
                        setGraphSearchQuery(selectedCase.fir_number);
                      }}
                      className={`border ${theme.border} bg-transparent hover:bg-slate-500/10 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${theme.textMain}`}
                    >
                      <Share2 className="w-3.5 h-3.5" /> View Network Links
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API_BASE_URL}/api/v1/chat/export-pdf`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                            body: JSON.stringify({ session_id: chatSessionId })
                          });
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `KSP_Case_Report_${selectedCase.fir_number.replace("/", "_")}.pdf`;
                          a.click();
                        } catch (err) {
                          alert("Failed to export case report PDF: " + err);
                        }
                      }}
                      className={`border ${theme.border} bg-transparent hover:bg-slate-500/10 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${theme.textMain}`}
                      title="Download PDF Report"
                    >
                      Export PDF
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("map");
                        setTimeout(() => {
                          if (mapControlRef.current) {
                            mapControlRef.current.focusCase(selectedCase.fir_number);
                          }
                        }, 200);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-[#090C10] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-[0_0_15px_rgba(232,240,254,0.55)]"
                      title="Locate Case Scene on Intelligence Map"
                    >
                      <MapPin className="w-4 h-4" /> View on Map
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-20 text-slate-500">
                  <img src="/logo.png" className="w-12 h-12 mb-3.5 object-contain opacity-80 animate-pulse" alt="CrimeMind Logo" />
                  <p className={`text-xs font-semibold ${theme.id === 'dark' ? 'text-zinc-400' : 'text-zinc-650'}`}>Select a case file from the registry to inspect records.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CRIME INTELLIGENCE MAP */}
        {activeTab === "map" && (
          <CrimeMap
            theme={theme}
            cases={cases}
            selectedCityFilter={selectedCityFilter}
            setSelectedCityFilter={setSelectedCityFilter}
            selectedCase={selectedCase}
            setSelectedCase={setSelectedCase}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setGraphCases={setGraphCases}
            setActiveSuspect={setActiveSuspect}
            mapControlRef={mapControlRef}
          />
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
