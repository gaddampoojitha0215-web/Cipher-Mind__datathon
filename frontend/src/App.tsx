import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  MessageSquare, Share2,
  Phone, User, Car, Briefcase,
  Mic, MicOff, Volume2, Volume1, VolumeX, Search, TrendingUp, AlertTriangle, HelpCircle, Sun, Moon,
  Copy, Check, Globe, ChevronDown, Paperclip, ZoomIn, ZoomOut, Maximize2, Trash2, Info, ArrowUpRight
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis,
  Tooltip, Cell, CartesianGrid, BarChart, Bar
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
    bodyBg: "bg-[#020202] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#141416] via-[#020202] to-[#020202]",
    cardBg: "glass-panel-dark border border-zinc-900",
    border: "border-zinc-800",
    textMain: "text-zinc-100",
    textMuted: "text-zinc-400",
    accentBg: "bg-zinc-100 hover:bg-white text-zinc-950 shadow-sm transition-all duration-300",
    accentText: "text-zinc-950",
    chatUser: "bg-zinc-900 border border-zinc-800 text-zinc-100",
    chatAssistant: "bg-black border border-zinc-900 text-zinc-100",
    chartGrid: "#1f1f23",
    chartStroke: "#52525b",
    chartBar: "#d4d4d8",
    chartLine: "#ffffff",
    nodeIncident: "#ffffff",
    nodeAccused: "#a3a3a3",
    nodePhone: "#71717a",
    nodeVehicle: "#52525b",
    nodeBankAccount: "#3f3f46"
  },
  {
    id: "light",
    name: "Light Mode",
    bodyBg: "bg-[#fafafa] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#ffffff] via-[#f4f4f5] to-[#e4e4e7]",
    cardBg: "glass-panel-light border border-zinc-200",
    border: "border-zinc-300",
    textMain: "text-zinc-900",
    textMuted: "text-zinc-500",
    accentBg: "bg-zinc-900 hover:bg-zinc-950 text-zinc-50 shadow-sm transition-all duration-300",
    accentText: "text-zinc-50",
    chatUser: "bg-zinc-100 border border-zinc-200 text-zinc-900",
    chatAssistant: "bg-white border border-zinc-300/80 text-zinc-900",
    chartGrid: "#e4e4e7",
    chartStroke: "#71717a",
    chartBar: "#27272a",
    chartLine: "#000000",
    nodeIncident: "#000000",
    nodeAccused: "#52525b",
    nodePhone: "#71717a",
    nodeVehicle: "#a1a1aa",
    nodeBankAccount: "#d4d4d8"
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
      const officer = c.police_station.includes("Jayanagar") ? "Officer Gowda" : (c.police_station.includes("Indiranagar") ? "Officer Patil" : "Officer Rao");
      addNode(officer, officer, "officer");
      addLink(fir, officer, "INVESTIGATED_BY");
    }
  });

  return { nodes: Array.from(nodesMap.values()), links };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const languagesList = [
    { code: "en" as const, label: "English", native: "EN" },
    { code: "kn" as const, label: "Kannada", native: "ಕನ್ನಡ" },
    { code: "hi" as const, label: "Hindi", native: "हिन्दी" },
    { code: "te" as const, label: "Telugu", native: "తెలుగు" },
    { code: "ta" as const, label: "Tamil", native: "தமிழ்" }
  ];
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "network" | "cases">("dashboard");
  const [language, setLanguage] = useState<"en" | "kn" | "hi" | "te" | "ta">("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);


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
      return matchesCity && matchesCrime;
    });
  }, [cases, selectedCityFilter, selectedCrimeFilter]);

  const availableCities = React.useMemo(() => {
    const citiesSet = new Set<string>();
    cases.forEach(c => {
      const city = c.district.replace(" District", "").replace(" City", "").trim();
      if (city) citiesSet.add(city);
    });
    return ["All", ...Array.from(citiesSet)];
  }, [cases]);

  const availableCrimes = React.useMemo(() => {
    const crimesSet = new Set<string>();
    cases.forEach(c => {
      if (c.crime_head) crimesSet.add(c.crime_head.trim());
    });
    return ["All", ...Array.from(crimesSet)];
  }, [cases]);

  // Compute classifications based on active filters (dynamic)
  const activeClassifications = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCases.forEach(c => {
      counts[c.crime_head] = (counts[c.crime_head] || 0) + 1;
    });
    if (Object.keys(counts).length === 0) {
      return classifications;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCases, classifications]);

  // Compute city distribution dynamically
  const activeCityDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCases.forEach(c => {
      const city = c.district.replace(" District", "").replace(" City", "").trim();
      if (city) counts[city] = (counts[city] || 0) + 1;
    });
    if (Object.keys(counts).length === 0) {
      return cityDistribution;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCases, cityDistribution]);

  // Theme state
  const [theme, setTheme] = useState<Theme>(THEMES[0]);

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatSessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "CrimeMind AI Online. Authorized access granted to admin. System operates under security protocol KSP-A9.",
      confidence_score: 1.0,
      evidence_trail: ["System startup initialized with active database links."]
    }
  ]);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechVolume, setSpeechVolume] = useState(0.8);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

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
  const [graphSearchQuery, setGraphSearchQuery] = useState("");
  const [showGraphSuggestions, setShowGraphSuggestions] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<any>(null);

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

  const addCaseToGraph = (caseObj: Case) => {
    if (!graphCases.some(c => c.id === caseObj.id)) {
      setGraphCases(prev => [...prev, caseObj]);
    }
  };

  const handleClearGraph = () => {
    setGraphCases([]);
    setSelectedNode(null);
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
      const matchVeh = c.vehicles.some(v => v.replace("-","").replace(" ","").toLowerCase() === entityVal.replace("-","").replace(" ",""));
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

  // Re-run D3 simulation whenever graph cases, theme, or filter toggles change
  useEffect(() => {
    if (!svgRef.current || activeTab !== "network") return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous layouts

    const width = 800;
    const height = 550;

    const container = svg.append("g").attr("class", "graph-container");

    const zoom = d3.zoom()
      .scaleExtent([0.15, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    
    svg.call(zoom as any);
    zoomBehaviorRef.current = zoom;

    container.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", theme.id === "dark" ? "#3f3f46" : "#a1a1aa");

    const { nodes, links } = rebuildGraphFromLoadedCases(graphCases, {
      filterPhones,
      filterVehicles,
      filterBanks,
      filterPeople,
      filterOfficers,
      filterLocations
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(130))
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(28));

    const link = container.append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d: any) => {
        const status = getLinkHighlightStatus(d);
        if (status === "highlighted") return theme.id === "dark" ? "#ffffff" : "#000000";
        if (status === "faded") return theme.id === "dark" ? "#141416" : "#f5f5f7";
        return theme.id === "dark" ? "#27272a" : "#e4e4e7";
      })
      .attr("stroke-width", (d: any) => {
        const status = getLinkHighlightStatus(d);
        return status === "highlighted" ? 2.2 : 1.0;
      })
      .attr("marker-end", "url(#arrowhead)");

    const linkText = container.append("g")
      .selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .attr("font-size", "7px")
      .attr("fill", (d: any) => {
        const status = getLinkHighlightStatus(d);
        if (status === "highlighted") return theme.id === "dark" ? "#ffffff" : "#000000";
        return theme.id === "dark" ? "#52525b" : "#71717a";
      })
      .attr("text-anchor", "middle")
      .attr("font-family", "monospace")
      .text((d: any) => d.relationship);

    const node = container.append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any
      )
      .on("click", (event, d: any) => {
        event.stopPropagation();
        setSelectedNode(d);
      })
      .on("dblclick", (event, d: any) => {
        event.stopPropagation();
        handleExpandNode(d);
      });

    node.append("circle")
      .attr("r", (d: any) => {
        const isMatched = activeFilter && matchesQuery(d.id, d.label, d.type);
        return isMatched ? 15 : 13;
      })
      .attr("fill", () => theme.id === "dark" ? "#020202" : "#ffffff")
      .attr("stroke", (d: any) => {
        const isMatched = activeFilter && matchesQuery(d.id, d.label, d.type);
        if (isMatched) return theme.id === "dark" ? "#ffffff" : "#000000";
        return getNodeColor(d.type);
      })
      .attr("stroke-width", (d: any) => {
        const isSelected = selectedNode?.id === d.id;
        const isMatched = activeFilter && matchesQuery(d.id, d.label, d.type);
        return (isSelected || isMatched) ? 3.0 : 1.5;
      })
      .style("filter", (d: any) => {
        const isSelected = selectedNode?.id === d.id;
        const isMatched = activeFilter && matchesQuery(d.id, d.label, d.type);
        if (isSelected || isMatched) {
          return theme.id === "dark" ? "drop-shadow(0 0 6px rgba(255,255,255,0.45))" : "drop-shadow(0 0 4px rgba(0,0,0,0.15))";
        }
        return "none";
      });

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", (d: any) => getNodeColor(d.type))
      .attr("font-family", "monospace")
      .text((d: any) => {
        switch (d.type) {
          case "incident": return "F";
          case "accused": return "S";
          case "phone": return "P";
          case "vehicle": return "V";
          case "bank_account": return "B";
          case "location": return "L";
          case "victim": return "K";
          case "witness": return "W";
          case "officer": return "O";
          default: return "?";
        }
      });

    node.append("text")
      .attr("dy", 24)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("fill", (d: any) => {
        const isSelected = selectedNode?.id === d.id;
        const isMatched = activeFilter && matchesQuery(d.id, d.label, d.type);
        if (isMatched || isSelected) return theme.id === "dark" ? "#ffffff" : "#000000";
        return theme.id === "dark" ? "#a1a1aa" : "#3f3f46";
      })
      .attr("font-weight", (d: any) => {
        const isSelected = selectedNode?.id === d.id;
        const isMatched = activeFilter && matchesQuery(d.id, d.label, d.type);
        return (isMatched || isSelected) ? "bold" : "normal";
      })
      .text((d: any) => {
        const lbl = d.label || d.id;
        return lbl.length > 20 ? lbl.slice(0, 18) + "..." : lbl;
      });

    node.append("title").text((d: any) => `${d.type.toUpperCase()}: ${d.label}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkText
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 3);

      node.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = event.x;
      d.fy = event.y;
    }

    return () => {
      simulation.stop();
    };
  }, [graphCases, activeTab, theme, graphSearchQuery, filterPhones, filterVehicles, filterBanks, filterPeople, filterOfficers, filterLocations, selectedNode]);

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
          phone_numbers: [`98765432${i % 10}${i % 10}`],
          vehicles: i % 3 === 1 ? [`KA-05-MJ-${1000 + i}`] : [],
          bank_accounts: i % 3 === 2 ? [`SBIN0001${2345 + i}`] : []
        }));
        setCases(mock);
      });

    fetch(`${API_BASE_URL}/api/v1/analytics/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.classifications) setClassifications(data.classifications);
        if (data.city_distribution) setCityDistribution(data.city_distribution);
      })
      .catch(err => console.log("Failed to fetch analytics stats:", err));
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

  // Submit chat queries
  const submitChat = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = customMsg !== undefined ? customMsg : chatInput;
    if (!userMsg.trim()) return;

    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    if (customMsg === undefined) {
      setChatInput("");
    }
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
      if (data.sources && data.sources.length > 0) {
        const found = cases.filter(c => data.sources.includes(c.fir_number));
        if (found.length > 0) {
          setGraphCases(found);
        }
      }

      speakText(data.message);
    } catch (err) {
      // Local fallback simulator for offline/standalone execution
      setTimeout(() => {
        let text = `Simulated response: Analyzed databases for search term "${userMsg}". No backend connections detected.`;
        if (userMsg.toLowerCase().includes("burglary")) {
          text = "Found 2 matching Burglaries in South Bengaluru. Accessing cases FIR-10234, FIR-10237, showing similarity patterns.";
        }
        setMessages(prev => [...prev, {
          role: "assistant",
          text: text,
          confidence_score: 0.88,
          sources: ["FIR-10234", "FIR-10237"],
          evidence_trail: ["Pattern detected via Jayanagar police precinct reports."]
        }]);
        const found = cases.filter(c => ["FIR-10234", "FIR-10237"].includes(c.fir_number));
        if (found.length > 0) {
          setGraphCases(found);
        }
        speakText(text);
      }, 800);
    } finally {
      setLoadingResponse(false);
    }
  };



  // Helper to generate UUID
  function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  const colors = [
    theme.id === "dark" ? "#22d3ee" : "#3b82f6", // Cyber Cyan / Neon Blue
    theme.id === "dark" ? "#a78bfa" : "#7c3aed", // Cyber Purple
    theme.id === "dark" ? "#34d399" : "#10b981", // Neon Emerald
    theme.id === "dark" ? "#fb7185" : "#e11d48", // Rose
    theme.id === "dark" ? "#fbbf24" : "#d97706", // Amber
    theme.id === "dark" ? "#f472b6" : "#db2777"  // Pink
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
    const firRegex = /(FIR-\d+(?:\/\d+)?)/g;
    const parts = text.split(firRegex);
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
              className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all rounded-full cursor-pointer relative ${activeTab === tab
                ? `${theme.accentText} ${theme.accentBg}`
                : `${theme.textMuted} hover:${theme.textMain}`
                }`}
            >
              {tab === "chat" ? "AI Assistant" : tab === "network" ? "Link Analysis" : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                <div className={`absolute right-0 mt-2 w-36 rounded-xl border ${theme.border} ${theme.id === 'dark' ? 'bg-[#0f0f15]/95' : 'bg-white/95'} backdrop-blur-md shadow-xl py-1.5 z-20`}>
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
              admin
            </div>
            <div className={`text-[9px] ${theme.textMuted} font-mono uppercase tracking-wider`}>KSP-8932</div>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 scanlines relative">
            <div className="scanline-light" />

            {/* HUD Status Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-zinc-100 dark:bg-zinc-100 bg-zinc-900" />
              <div>
                <h2 className="text-xs font-bold font-mono tracking-widest text-zinc-100 dark:text-zinc-100 glow-text-white uppercase">
                  CRIMEMIND AI // ACTIVE INTEL CONSOLE
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-100 bg-zinc-900 animate-ping"></span> ENGINE: ACTIVE</span>
                  <span>DATABASE: ONLINE</span>
                  <span>MO SEARCH PATTERNS: ENFORCED</span>
                </div>
              </div>
              <div className="text-right font-mono text-xs text-zinc-100 dark:text-zinc-100 glow-text-white font-bold bg-zinc-900/60 px-3 py-1.5 rounded border border-zinc-800">
                {currentTime || "CONNECTING SYSTEM CLOCK..."}
              </div>
            </div>

            {/* Live Telemetry Ticker */}
            <div className="border border-zinc-900 bg-[#020202] p-4 rounded-xl font-mono text-[10px] text-zinc-400 space-y-1 relative shadow-inner overflow-hidden">
              <div className="absolute top-2 right-3 text-[9px] text-zinc-600 uppercase tracking-widest animate-pulse font-sans">Telemetry Stream</div>
              <div className="text-zinc-500 border-b border-zinc-900 pb-1 mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse"></span> Live Scanner Feed:
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {scanLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-zinc-650">[{new Date().toLocaleTimeString()}]</span>
                    <span className={log.includes("ALERT") ? "text-zinc-100 dark:text-zinc-100 font-bold underline" : ""}>{log}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Filters Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-xl border bg-zinc-950/20 border-zinc-800 cyber-panel cyber-zinc">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Filter Registry:</span>
                <div className="relative">
                  <select
                    value={selectedCityFilter}
                    onChange={(e) => setSelectedCityFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none bg-zinc-900 border-zinc-800 ${theme.textMain}`}
                  >
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city === "All" ? "All Cities" : city}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={selectedCrimeFilter}
                    onChange={(e) => setSelectedCrimeFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none bg-zinc-900 border-zinc-800 ${theme.textMain}`}
                  >
                    {availableCrimes.map(crime => (
                      <option key={crime} value={crime}>{crime === "All" ? "All Crime Heads" : crime}</option>
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
                  className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-100 cursor-pointer transition-colors"
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
                  val: String(filteredCases.length),
                  trend: "Total matching current filters",
                  icon: <Briefcase className="w-4 h-4 text-zinc-300" />,
                  cyberClass: "cyber-zinc"
                },
                {
                  label: "Under Investigation",
                  val: String(filteredCases.filter(c => c.status !== "Closed").length),
                  trend: "Active leads & case monitoring",
                  icon: <User className="w-4 h-4 text-zinc-400" />,
                  cyberClass: "cyber-zinc"
                },
                {
                  label: "Resolved Cases",
                  val: String(filteredCases.filter(c => c.status === "Closed").length),
                  trend: "Archived & closed records",
                  icon: <Check className="w-4 h-4 text-zinc-300" />,
                  cyberClass: "cyber-zinc"
                },
                {
                  label: "Resolution Rate",
                  val: filteredCases.length ? Math.round((filteredCases.filter(c => c.status === "Closed").length / filteredCases.length) * 100) + "%" : "0%",
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

              {/* City Distribution Bar Chart */}
              <div className={`border ${theme.border} ${theme.cardBg} p-5 rounded-xl flex flex-col shadow-sm cyber-panel cyber-emerald ${theme.textMain}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" /> Geographic Crime Distribution
                </h3>
                {activeCityDistribution.length > 0 ? (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeCityDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} horizontal={false} vertical={true} />
                        <XAxis dataKey="name" stroke={theme.chartStroke} fontSize={10} tickLine={false} />
                        <YAxis stroke={theme.chartStroke} fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: theme.id === "dark" ? "#0a0a0f" : "#ffffff", borderColor: theme.id === "dark" ? "#1e293b" : "#e2e8f0", borderRadius: "12px" }} />
                        <Bar dataKey="value" fill={theme.id === "dark" ? "#34d399" : "#10b981"} radius={[4, 4, 0, 0]}>
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
            <div className={`border ${theme.border} ${theme.cardBg} p-6 rounded-xl shadow-sm cyber-panel cyber-zinc ${theme.textMain}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                Recent Filtered Case Registry
              </h3>
              {filteredCases.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-850 text-zinc-450 font-mono">
                        <th className="py-2.5 font-bold uppercase tracking-wider">FIR Number</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Classification</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Location / Police Station</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Status</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/10 dark:divide-zinc-200/10">
                      {filteredCases.slice(0, 5).map((c) => (
                        <tr key={c.id} className="hover:bg-zinc-800/10 dark:hover:bg-zinc-100/10 transition-colors font-mono">
                          <td className="py-3 font-bold text-zinc-100 dark:text-zinc-900 underline">{c.fir_number}</td>
                          <td className="py-3 font-semibold text-zinc-400 dark:text-zinc-650">{c.crime_head}</td>
                          <td className="py-3 text-zinc-500">{c.police_station} ({c.location})</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.status === "Closed" ? "border-zinc-850 text-zinc-400 bg-zinc-950/20" : "border-zinc-300 dark:border-zinc-700 text-zinc-100 dark:text-zinc-900 bg-zinc-800 dark:bg-zinc-100"
                              }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedCase(c);
                                setActiveTab("cases");
                              }}
                              className={`px-3 py-1 rounded border ${theme.border} hover:bg-zinc-800 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-950 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all`}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">No cases match the active filters</div>
              )}
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
                  <div className="relative flex items-center gap-2 bg-slate-500/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
                    <button
                      onClick={() => {
                        if (speechVolume === 0) {
                          setSpeechVolume(prevVolume > 0 ? prevVolume : 0.8);
                        } else {
                          setPrevVolume(speechVolume);
                          setSpeechVolume(0);
                        }
                      }}
                      className={`p-1 rounded-lg hover:bg-slate-500/10 transition-all cursor-pointer ${speechVolume > 0 ? theme.textMain : 'text-zinc-500'}`}
                      title={speechVolume === 0 ? "Unmute speech" : "Mute speech"}
                    >
                      {speechVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-500" />
                      ) : speechVolume < 0.4 ? (
                        <Volume1 className="w-4 h-4" />
                      ) : (
                        <Volume2 className={`w-4 h-4 ${theme.id === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`} />
                      )}
                    </button>
                    {/* Volume Slider - permanently visible next to icon */}
                    <div className="w-16 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={speechVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const bounded = Math.max(0, Math.min(1, isNaN(val) ? 0.8 : val));
                          setSpeechVolume(bounded);
                          if (bounded > 0) {
                            setPrevVolume(bounded);
                          }
                        }}
                        className={`w-full ${theme.id === 'dark' ? 'accent-zinc-100' : 'accent-zinc-900'} h-1 rounded-lg cursor-pointer bg-slate-300 dark:bg-slate-700`}
                        title={`Volume: ${Math.round(speechVolume * 100)}%`}
                      />
                    </div>
                    {/* Percentage Indicator */}
                    <span className="text-[10px] font-mono text-zinc-400 w-8 text-right select-none">
                      {Math.round(speechVolume * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-xs">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 relative group transition-all duration-200 ${m.role === "user" ? theme.chatUser + ' rounded-tr-sm' : theme.chatAssistant + ' rounded-tl-sm'
                      } shadow-sm hover:shadow-md`}>

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

                      <p className="leading-relaxed pr-6 whitespace-pre-wrap">{renderMessageText(m.text)}</p>

                      {m.role === "assistant" && (m.confidence_score !== undefined || m.sources || m.evidence_trail) && (
                        <div className="mt-3.5 pt-3 border-t border-zinc-800/10 dark:border-zinc-200/10 space-y-2 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-500">CONFIDENCE SCORE:</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold border ${
                              theme.id === "dark" ? "bg-zinc-900 text-zinc-100 border-zinc-800" : "bg-zinc-100 text-zinc-900 border-zinc-200"
                            }`}>{((m.confidence_score ?? 0) * 100).toFixed(0)}%</span>
                          </div>

                          {m.sources && m.sources.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-zinc-500">SOURCES:</span>
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

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    language === "kn" ? "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಇತ್ತೀಚಿನ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸಿ..." :
                      language === "hi" ? "बेंगलुरु में चोरी के मामले दिखाएं..." :
                        language === "te" ? "బెంగళూరులో దొంగతనం కేసులు చూపించు..." :
                          language === "ta" ? "பெங்களூரில் திருட்டு வழக்குகளைக் காட்டு..." :
                            "Show burglary cases in Bengaluru..."
                  }
                  className={`flex-1 bg-transparent border ${theme.border} rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-500 ${theme.textMain} placeholder-slate-500`}
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
                  className={`${theme.accentBg} ${theme.accentText} px-5 py-3 rounded-xl uppercase font-bold tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1.5 cursor-pointer shadow-sm`}
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
              <div className={`p-4 bg-transparent border-b ${theme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-30`}>
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Criminal Network Matrix</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Dbl-Click to expand • Drag to position</span>
                </div>

                {/* Graph Search Box with Autocomplete and Actions */}
                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search FIR / Suspect / Plate..."
                    value={graphSearchQuery}
                    onChange={(e) => {
                      setGraphSearchQuery(e.target.value);
                      setShowGraphSuggestions(true);
                    }}
                    onFocus={() => setShowGraphSuggestions(true)}
                    className={`w-full bg-zinc-950/40 border ${theme.border} rounded-xl pl-8 pr-8 py-1.5 text-xs focus:outline-none focus:border-zinc-500 ${theme.textMain} placeholder-zinc-500`}
                  />
                  {graphSearchQuery ? (
                    <button
                      onClick={() => {
                        setGraphSearchQuery("");
                        setShowGraphSuggestions(false);
                      }}
                      className="absolute right-3 top-2 text-xs text-zinc-400 hover:text-zinc-200 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  ) : null}

                  {/* Dropdown Suggestions with Add/Load actions */}
                  {showGraphSuggestions && matchingSuggestions.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowGraphSuggestions(false)} />
                      <div className={`absolute left-0 right-0 mt-2 rounded-xl border ${theme.border} ${theme.id === 'dark' ? 'bg-[#060608]/95' : 'bg-white/95'} backdrop-blur-md shadow-2xl py-2 z-20 max-h-72 overflow-y-auto`}>
                        <div className="px-3 py-1 text-[9px] text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800/10 dark:border-zinc-200/10 mb-1 font-sans">
                          Database Matches (Action Required)
                        </div>
                        {matchingSuggestions.map((c) => (
                          <div
                            key={c.id}
                            className={`px-3 py-2 text-xs border-b border-zinc-900/10 dark:border-zinc-200/10 last:border-0 hover:bg-zinc-800/20 flex flex-col gap-1.5 text-left`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-zinc-100 dark:text-zinc-900">{c.fir_number}</span>
                              <span className="text-[9px] text-zinc-400 font-semibold">{c.crime_head}</span>
                            </div>
                            <div className={`text-[10px] ${theme.textMuted} truncate`}>
                              Suspects: {c.accused.join(", ")}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  loadCaseGraph(c);
                                  setGraphSearchQuery(c.fir_number);
                                  setShowGraphSuggestions(false);
                                }}
                                className="px-2 py-1 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-[9px] tracking-wide uppercase cursor-pointer transition-colors shadow-sm"
                              >
                                Load Single
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  addCaseToGraph(c);
                                  setGraphSearchQuery(c.fir_number);
                                  setShowGraphSuggestions(false);
                                }}
                                className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 text-zinc-300 dark:border-zinc-300 dark:hover:border-zinc-400 dark:text-zinc-800 font-bold text-[9px] tracking-wide uppercase cursor-pointer transition-colors"
                              >
                                Add Case Graph
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Node filters */}
              <div className={`flex flex-wrap gap-x-5 gap-y-1.5 px-4 py-2 border-b ${theme.border} bg-zinc-950/20 text-[10px] text-zinc-400 font-mono`}>
                <span className="text-zinc-500 font-bold uppercase">Toggle Nodes:</span>
                {[
                  { label: "Phones", state: filterPhones, setter: setFilterPhones },
                  { label: "Vehicles", state: filterVehicles, setter: setFilterVehicles },
                  { label: "Banks", state: filterBanks, setter: setFilterBanks },
                  { label: "People", state: filterPeople, setter: setFilterPeople },
                  { label: "Officers", state: filterOfficers, setter: setFilterOfficers },
                  { label: "Locations", state: filterLocations, setter: setFilterLocations }
                ].map((f, i) => (
                  <label key={i} className="flex items-center gap-1 cursor-pointer hover:text-zinc-200 select-none">
                    <input
                      type="checkbox"
                      checked={f.state}
                      onChange={(e) => f.setter(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-800 checked:bg-zinc-100 accent-zinc-100 w-3 h-3 cursor-pointer"
                    />
                    {f.label}
                  </label>
                ))}
              </div>

              <div className="flex-1 relative bg-transparent flex items-center justify-center overflow-hidden">
                <svg
                  ref={svgRef}
                  className="w-full h-full bg-zinc-950/5 select-none"
                  style={{ minHeight: "420px" }}
                />

                {/* Floating Graph Toolbar */}
                <div className={`absolute bottom-4 left-4 flex gap-1.5 bg-[#020202]/85 backdrop-blur border border-zinc-800 p-1.5 rounded-xl shadow-lg z-30`}>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-zinc-800/80 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-zinc-800/80 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 hover:bg-zinc-800/80 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Reset View"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearGraph}
                    className="p-1.5 hover:bg-zinc-800/80 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Clear Graph"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Network legend and Node Inspector */}
            <div className={`border ${theme.border} ${theme.cardBg} rounded-2xl p-5 shadow-lg flex flex-col justify-between overflow-hidden text-xs ${theme.textMain}`}>
              {/* Selected Node Details Side Panel */}
              <div className="flex flex-col justify-between h-full space-y-4 overflow-hidden">
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between border-b border-zinc-800/10 dark:border-zinc-200/10 pb-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Node Inspector</h3>
                    {selectedNode && (
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="text-zinc-500 hover:text-zinc-300 cursor-pointer text-xs"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {selectedNode ? (
                    <div className="space-y-4 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase block font-sans">Entity Type</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-block border ${
                          selectedNode.type === "incident" ? "border-zinc-300 text-zinc-100 bg-zinc-800/20" : "border-zinc-800 text-zinc-400"
                        }`}>
                          {selectedNode.type.toUpperCase()}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase block font-sans">Identifier</span>
                        <span className="text-zinc-100 dark:text-zinc-900 font-bold break-all">{selectedNode.id}</span>
                      </div>

                      {/* Dynamic rendering based on entity type */}
                      {selectedNode.type === "incident" ? (
                        (() => {
                          const matchedCase = cases.find(c => c.fir_number === selectedNode.id);
                          if (!matchedCase) return null;
                          return (
                            <div className="space-y-3 pt-2 border-t border-zinc-800/10 dark:border-zinc-200/10">
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block font-sans">Crime Head</span>
                                <span className="text-zinc-200 dark:text-zinc-800 font-semibold">{matchedCase.crime_head}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block font-sans">Police Precinct</span>
                                <span>{matchedCase.police_station} ({matchedCase.district})</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block font-sans">Registration Date</span>
                                <span>{new Date(matchedCase.date_of_registration).toLocaleDateString()}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block font-sans">Case Status</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                  matchedCase.status === "Closed" ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"
                                }`}>{matchedCase.status}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block font-sans">Modus Operandi</span>
                                <p className="text-[10px] text-zinc-400 leading-normal bg-zinc-950/40 p-2 rounded border border-zinc-900/60 mt-1 whitespace-pre-wrap">{matchedCase.description}</p>
                              </div>
                              <div className="flex gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCase(matchedCase);
                                    setActiveTab("cases");
                                  }}
                                  className="flex-1 px-2.5 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 text-[10px] uppercase font-bold tracking-wide cursor-pointer inline-flex items-center justify-center gap-1"
                                >
                                  Open Case <ArrowUpRight className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGraphCases(prev => prev.filter(c => c.fir_number !== matchedCase.fir_number));
                                    setSelectedNode(null);
                                  }}
                                  className="px-2.5 py-1.5 rounded border border-rose-950/40 text-rose-500 hover:bg-rose-950/15 text-[10px] uppercase font-bold cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        (() => {
                          const val = selectedNode.id.toLowerCase();
                          const matchingCasesInDb = cases.filter(c => 
                            c.accused.some(a => a.toLowerCase() === val) ||
                            c.phone_numbers.some(p => p.toLowerCase() === val) ||
                            c.vehicles.some(v => v.replace("-","").replace(" ","").toLowerCase() === val.replace("-","").replace(" ","")) ||
                            c.bank_accounts.some(b => b.toLowerCase() === val) ||
                            (c.location && c.location.toLowerCase() === val)
                          );
                          return (
                            <div className="space-y-3 pt-2 border-t border-zinc-800/10 dark:border-zinc-200/10">
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block font-sans">Database Links</span>
                                <span className="text-zinc-200 dark:text-zinc-800 font-semibold">{matchingCasesInDb.length} Case(s) Found</span>
                              </div>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {matchingCasesInDb.map(c => {
                                  const inGraph = graphCases.some(gc => gc.id === c.id);
                                  return (
                                    <div key={c.id} className="p-1.5 bg-zinc-900/40 dark:bg-zinc-100/50 rounded border border-zinc-800/60 flex justify-between items-center text-[10px]">
                                      <div>
                                        <div className="font-bold text-zinc-300 dark:text-zinc-700">{c.fir_number}</div>
                                        <div className="text-[9px] text-zinc-500 truncate w-32">{c.crime_head}</div>
                                      </div>
                                      {inGraph ? (
                                        <span className="text-[8px] px-1 py-0.5 rounded border border-zinc-800 text-zinc-600 font-bold uppercase">Active</span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => addCaseToGraph(c)}
                                          className="text-[8px] bg-zinc-100 hover:bg-white text-zinc-950 px-1 py-0.5 rounded font-bold uppercase cursor-pointer"
                                        >
                                          Add Graph
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => handleExpandNode(selectedNode)}
                                  className="w-full px-2 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:text-zinc-950 text-[10px] font-bold uppercase tracking-wider cursor-pointer text-center border border-zinc-800"
                                  title="Dbl-click node to auto-expand"
                                >
                                  Expand Connection
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-zinc-500 space-y-2 font-mono">
                      <Info className="w-5 h-5 mx-auto opacity-35" />
                      <p className="text-[10px] leading-relaxed">Click a node to inspect.<br/>Dbl-click to expand case links.<br/>Search autocomplete offers merging options.</p>
                    </div>
                  )}
                </div>

                {/* Legends */}
                <div className="border-t border-zinc-800/10 dark:border-zinc-200/10 pt-4 space-y-2">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Node Types</div>
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border bg-zinc-950 border-zinc-100" /> [F] Case
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border bg-zinc-600 border-zinc-400" /> [S] Suspect
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border bg-zinc-800 border-zinc-600" /> [P] Phone
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border bg-zinc-500 border-zinc-700" /> [V] Vehicle
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border bg-zinc-900 border-zinc-500" /> [B] Bank Acc
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border bg-zinc-700 border-zinc-500" /> [L] Location
                    </div>
                  </div>
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
                  .filter(c => {
                    const rawQuery = searchQuery.trim().toLowerCase();
                    if (!rawQuery) return true;

                    // Common prepositions, pronouns, verbs, and generic labels to ignore
                    const stopWords = new Set([
                      "is", "to", "a", "the", "and", "in", "of", "for", "with", "on", "at", "by", "an", "this",
                      "linked", "suspect", "suspects", "case", "cases", "details", "reported", "about",
                      "information", "regarding", "shown", "found", "was", "were", "has", "have", "had",
                      "relation", "associated", "with", "under", "registered", "accused", "phone", "number",
                      "vehicle", "bank", "account", "is", "linked", "to", "suspect(s)"
                    ]);

                    // Split query into words, filtering out punctuation and stop words
                    const keywords = rawQuery
                      .split(/[\s,.:;!?()"\'-]+/)
                      .map(w => w.trim())
                      .filter(w => w.length > 1 && !stopWords.has(w));

                    // If no specific keywords are left, match using raw search string
                    if (keywords.length === 0) {
                      return (
                        c.fir_number.toLowerCase().includes(rawQuery) ||
                        c.crime_head.toLowerCase().includes(rawQuery) ||
                        c.location.toLowerCase().includes(rawQuery)
                      );
                    }

                    // Match if any of the parsed keywords are present in any case field
                    return keywords.some(q => {
                      return (
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
                  })
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className={`w-full text-left p-4 hover:bg-slate-500/5 transition-all flex flex-col gap-1 cursor-pointer ${theme.textMain} ${selectedCase?.id === c.id
                        ? (theme.id === "dark" ? "bg-slate-800/60 border-l-4 border-cyan-500" : "bg-indigo-50 border-l-4 border-indigo-600")
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
                        <User className="w-3.5 h-3.5 text-blue-500" />
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
                        <Phone className="w-3.5 h-3.5 text-cyan-500" />
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
                        <Car className="w-3.5 h-3.5 text-emerald-500" />
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
                        <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-xs font-mono">{selectedCase.bank_accounts.join(", ") || "None"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-500/10 pt-4 flex gap-3">
                    <button
                      onClick={() => {
                        setActiveTab("chat");
                        submitChat(undefined, `Show me details and leads for ${selectedCase.fir_number}`);
                      }}
                      className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-sm`}
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
