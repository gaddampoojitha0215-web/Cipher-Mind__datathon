import React, { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import {
  Search, ZoomIn, ZoomOut, Maximize2, Layers, MapPin, Eye, EyeOff, Info,
  CheckCircle, Video, Compass, Navigation, Shield, Database, BarChart3, Clock, User
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  KARNATAKA_DISTRICTS,
  MAP_LOCATION_FEATURES,
  KARNATAKA_HIGHWAYS,
  PATROL_ROUTES,
  CCTV_CAMERAS,
  latLonToSvg
} from "./mapData";

export interface LocationFeature {
  id: string;
  name: string;
  type: "city" | "town" | "village" | "police_station" | "landmark" | "airport" | "railway" | "bus_station";
  lat: number;
  lon: number;
}

export interface Highway {
  name: string;
  path: { lat: number; lon: number }[];
}

export interface DistrictData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  capital: string;
  policeStations: string[];
  landmarks: string[];
  crimeRateIndex: number;
  commonCrime: string;
}

// Re-define Case locally to avoid circular import issues
export interface Case {
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

interface CrimeMapProps {
  theme: any;
  cases: Case[];
  selectedCityFilter: string;
  setSelectedCityFilter: (city: string) => void;
  selectedCase: Case | null;
  setSelectedCase: (c: Case | null) => void;
  selectedNode: any;
  setSelectedNode: (n: any) => void;
  activeTab: string;
  setActiveTab: (t: any) => void;
  setGraphCases: (cases: Case[]) => void;
  setActiveSuspect: (s: string | null) => void;
  // A ref so that the parent can trigger animations or zoom focus on coordinates
  mapControlRef?: React.MutableRefObject<any>;
}

export default function CrimeMap({
  theme,
  cases,
  selectedCityFilter,
  setSelectedCityFilter,
  selectedCase,
  setSelectedCase,
  selectedNode,
  setSelectedNode,
  activeTab,
  setActiveTab,
  setGraphCases,
  setActiveSuspect,
  mapControlRef
}: CrimeMapProps) {
  // Map control states
  const [mapMode, setMapMode] = useState<"standard" | "satellite" | "terrain" | "dark" | "heatmap">("dark");
  const [transform, setTransform] = useState({ x: 100, y: 50, k: 0.75 });
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictData | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [highlightedMarker, setHighlightedMarker] = useState<string | null>(null);
  const [isLayersOpen, setIsLayersOpen] = useState(false);

  // Automatically center and scale the map to full screen on mount and resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const W = rect.width || 800;
        const H = rect.height || 600;
        const k = Math.min(W / 500, H / 800) * 0.95;
        const x = (W - 500 * k) / 2;
        const y = (H - 800 * k) / 2;
        setTransform({ x, y, k });
      }
    };
    setTimeout(handleResize, 100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Layer Toggles
  const [layers, setLayers] = useState({
    districtBoundaries: true,
    policeBoundaries: true,
    crimeHeatmap: true,
    firMarkers: true,
    murder: true,
    theft: true,
    cyber: true,
    drugs: true,
    patrolRoutes: true,
    cctv: true
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Map district coordinates (SVG space)
  const districtPoints = useMemo(() => {
    return KARNATAKA_DISTRICTS.map((d, idx) => {
      const { x, y } = latLonToSvg(d.lat, d.lon);
      return {
        district: d,
        index: idx,
        x,
        y
      };
    });
  }, []);

  // Compute Voronoi cells using D3 for district outlines
  const voronoiCells = useMemo(() => {
    const pointsData = districtPoints.map(p => [p.x, p.y] as [number, number]);
    const delaunay = d3.Delaunay.from(pointsData);
    const voronoi = delaunay.voronoi([0, 0, 500, 800]);
    return districtPoints.map((p, i) => {
      const path = voronoi.renderCell(i);
      return {
        district: p.district,
        path
      };
    });
  }, [districtPoints]);

  // Map cases to their estimated coordinates dynamically
  const mappedCases = useMemo(() => {
    return cases.map((c, idx) => {
      const distName = c.district.replace(" District", "").replace(" City", "").trim().toLowerCase();
      const district = KARNATAKA_DISTRICTS.find(d => d.name.toLowerCase() === distName) || KARNATAKA_DISTRICTS[25]; // Default to Bangalore

      // Compute deterministic scattered coordinates based on case ID
      const angle = (idx * 22.4) % (2 * Math.PI);
      const radius = 0.04 + (idx % 4) * 0.035; // degrees offset
      const lat = district.lat + Math.sin(angle) * radius;
      const lon = district.lon + Math.cos(angle) * radius;

      const { x, y } = latLonToSvg(lat, lon);
      return {
        ...c,
        x,
        y,
        lat,
        lon
      };
    });
  }, [cases]);

  // Aggregate crimes by district for statistics/heatmap calculations
  const districtCrimeStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number; closed: number; typeCounts: Record<string, number> }> = {};

    KARNATAKA_DISTRICTS.forEach(d => {
      stats[d.id] = { total: 0, active: 0, closed: 0, typeCounts: {} };
    });

    mappedCases.forEach(c => {
      const distName = c.district.replace(" District", "").replace(" City", "").trim().toLowerCase();
      const district = KARNATAKA_DISTRICTS.find(d => d.name.toLowerCase() === distName);
      if (district) {
        const dStat = stats[district.id];
        dStat.total += 1;
        if (c.status === "Closed") dStat.closed += 1;
        else dStat.active += 1;

        const type = c.crime_head.split(" ")[0] || "Other";
        dStat.typeCounts[type] = (dStat.typeCounts[type] || 0) + 1;
      }
    });

    return stats;
  }, [mappedCases]);

  // Focus/zoom animation trigger helper
  const animateZoom = (targetX: number, targetY: number, targetScale: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // Smooth transition simulation using requestAnimationFrame
    const startX = transform.x;
    const startY = transform.y;
    const startK = transform.k;

    // We want the target location (targetX, targetY) to end up at the viewport center (cx, cy)
    const endX = cx - targetX * targetScale;
    const endY = cy - targetY * targetScale;
    const endK = targetScale;

    const duration = 600;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      setTransform({
        x: startX + (endX - startX) * ease,
        y: startY + (endY - startY) * ease,
        k: startK + (endK - startK) * ease
      });

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  // Expose control ref to parent
  useEffect(() => {
    if (mapControlRef) {
      mapControlRef.current = {
        focusDistrict: (distName: string) => {
          const name = distName.replace(" District", "").replace(" City", "").trim().toLowerCase();
          const district = KARNATAKA_DISTRICTS.find(d => d.name.toLowerCase() === name);
          if (district) {
            setSelectedDistrict(district);
            const { x, y } = latLonToSvg(district.lat, district.lon);
            animateZoom(x, y, 1.8);
          }
        },
        focusCase: (firNum: string) => {
          const c = mappedCases.find(mc => mc.fir_number.toLowerCase().includes(firNum.toLowerCase()));
          if (c) {
            setSelectedCase(c);
            setHighlightedMarker(c.id);
            animateZoom(c.x, c.y, 2.5);
          }
        },
        focusCoords: (lat: number, lon: number, zoomLevel = 2.2) => {
          const { x, y } = latLonToSvg(lat, lon);
          animateZoom(x, y, zoomLevel);
        }
      };
    }
  }, [mapControlRef, mappedCases, animateZoom, setSelectedCase]);

  // Sync state from parent node selection
  useEffect(() => {
    if (selectedNode) {
      if (selectedNode.type === "incident") {
        const c = mappedCases.find(mc => mc.fir_number === selectedNode.id);
        if (c) {
          setHighlightedMarker(c.id);
          animateZoom(c.x, c.y, 2.2);
        }
      } else if (selectedNode.type === "location") {
        const feat = MAP_LOCATION_FEATURES.find(f => f.name.toLowerCase() === selectedNode.id.toLowerCase());
        if (feat) {
          const { x, y } = latLonToSvg(feat.lat, feat.lon);
          animateZoom(x, y, 2.4);
        }
      }
    }
  }, [selectedNode, mappedCases]);

  // Sync state from dashboard city selection
  useEffect(() => {
    if (selectedCityFilter !== "All") {
      const district = KARNATAKA_DISTRICTS.find(d => d.name.toLowerCase() === selectedCityFilter.toLowerCase());
      if (district) {
        setSelectedDistrict(district);
        const { x, y } = latLonToSvg(district.lat, district.lon);
        animateZoom(x, y, 1.5);
      }
    } else {
      setSelectedDistrict(null);
    }
  }, [selectedCityFilter]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    const nextK = e.deltaY < 0 ? transform.k * zoomFactor : transform.k / zoomFactor;
    const boundedK = Math.max(0.35, Math.min(5, nextK));

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const nextX = mouseX - (mouseX - transform.x) * (boundedK / transform.k);
    const nextY = mouseY - (mouseY - transform.y) * (boundedK / transform.k);

    setTransform({ x: nextX, y: nextY, k: boundedK });
  };

  // Drag panning
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // only left click panning
    setIsPanning(true);
    setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    setTransform({
      ...transform,
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const W = rect.width || 800;
      const H = rect.height || 600;
      const k = Math.min(W / 500, H / 800) * 0.95;
      const x = (W - 500 * k) / 2;
      const y = (H - 800 * k) / 2;
      animateZoom(250, 400, k);
    } else {
      animateZoom(250, 400, 0.75);
    }
    setSelectedDistrict(null);
    setSelectedCityFilter("All");
  };

  // Search autocomplete matching suggestions
  const matchingSuggestions = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();

    const matchedDistricts = KARNATAKA_DISTRICTS.filter(d => d.name.toLowerCase().includes(q))
      .map(d => ({ type: "district", name: `${d.name} District`, target: d }));

    const matchedCities = MAP_LOCATION_FEATURES.filter(f => f.name.toLowerCase().includes(q))
      .map(f => ({ type: "location", name: `${f.name} (${f.type.toUpperCase()})`, target: f }));

    const matchedCases = mappedCases.filter(c => c.fir_number.toLowerCase().includes(q) || c.accused.some(a => a.toLowerCase().includes(q)))
      .map(c => ({ type: "case", name: `${c.fir_number} - ${c.crime_head}`, target: c }));

    return [...matchedDistricts, ...matchedCities, ...matchedCases].slice(0, 10);
  }, [searchQuery, mappedCases]);

  const handleSearchSelect = (item: any) => {
    setSearchQuery("");
    setShowSearchSuggestions(false);

    if (item.type === "district") {
      const d = item.target;
      setSelectedDistrict(d);
      setSelectedCityFilter(d.name);
      const { x, y } = latLonToSvg(d.lat, d.lon);
      animateZoom(x, y, 1.8);
    } else if (item.type === "location") {
      const f = item.target;
      const { x, y } = latLonToSvg(f.lat, f.lon);
      animateZoom(x, y, 2.5);
    } else if (item.type === "case") {
      const c = item.target;
      setSelectedCase(c);
      setHighlightedMarker(c.id);
      animateZoom(c.x, c.y, 2.5);
    }
  };

  // Check if a case marker should be visible based on layers
  const isCaseVisible = (c: Case) => {
    if (!layers.firMarkers) return false;
    const type = c.crime_head.toLowerCase();
    if (!layers.murder && type.includes("murder")) return false;
    if (!layers.theft && type.includes("theft")) return false;
    if (!layers.cyber && (type.includes("cyber") || type.includes("fraud"))) return false;
    if (!layers.drugs && type.includes("drug")) return false;
    return true;
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-68px)] w-full ${theme.id === 'dark' ? 'bg-[#050409]' : 'bg-slate-50'} ${theme.textMain} p-4 font-sans select-none overflow-hidden relative`}>
      
      {/* 3-Column main content */}
      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        
        {/* Left Column: Karnataka Overview & Legend */}
        <div className="w-[22%] min-w-[270px] max-w-[320px] flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Card: Karnataka Overview */}
          <div className={`rounded-2xl p-4 flex flex-col gap-3 ${theme.cardBg} ${theme.textMain}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider border-b pb-2 ${theme.id === 'dark' ? 'text-purple-400 border-purple-500/10' : 'text-purple-700 border-purple-200/50'}`}>
              Karnataka Overview
            </h3>
            
            {/* Metric 1 */}
            <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
              theme.id === 'dark' 
                ? 'bg-purple-950/10 border border-purple-500/5 hover:border-purple-500/20' 
                : 'bg-purple-50/50 border border-purple-100 hover:border-purple-200'
            }`}>
              <div className={`p-2.5 rounded-xl ${theme.id === 'dark' ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] uppercase font-mono block ${theme.id === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>Total Districts</span>
                <span className="text-base font-bold font-mono">31</span>
                <span className={`text-[9px] block ${theme.id === 'dark' ? 'text-purple-400/70' : 'text-purple-600/70'}`}>All Districts Monitoring</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
              theme.id === 'dark' 
                ? 'bg-cyan-950/10 border border-cyan-500/5 hover:border-cyan-500/20' 
                : 'bg-cyan-50/50 border border-cyan-100 hover:border-cyan-200'
            }`}>
              <div className={`p-2.5 rounded-xl ${theme.id === 'dark' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] uppercase font-mono block ${theme.id === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>Police Stations</span>
                <span className="text-base font-bold font-mono">1,244</span>
                <span className={`text-[9px] block ${theme.id === 'dark' ? 'text-cyan-400/70' : 'text-cyan-600/70'}`}>Active Stations</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
              theme.id === 'dark' 
                ? 'bg-red-950/10 border border-red-500/5 hover:border-red-500/20' 
                : 'bg-red-50/50 border border-red-100 hover:border-red-200'
            }`}>
              <div className={`p-2.5 rounded-xl ${theme.id === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-700'}`}>
                <Database className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] uppercase font-mono block ${theme.id === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>Active Cases</span>
                <span className="text-base font-bold font-mono">2,317</span>
                <span className={`text-[9px] block ${theme.id === 'dark' ? 'text-red-400/80' : 'text-red-600/80'}`}>+12.6% from last week</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
              theme.id === 'dark' 
                ? 'bg-amber-950/10 border border-amber-500/5 hover:border-amber-500/20' 
                : 'bg-amber-50/50 border border-amber-100 hover:border-amber-200'
            }`}>
              <div className={`p-2.5 rounded-xl ${theme.id === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] uppercase font-mono block ${theme.id === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>Incidents Today</span>
                <span className="text-base font-bold font-mono">152</span>
                <span className={`text-[9px] block ${theme.id === 'dark' ? 'text-amber-400/70' : 'text-amber-600/70'}`}>Across Karnataka</span>
              </div>
            </div>

            {/* Metric 5 */}
            <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
              theme.id === 'dark' 
                ? 'bg-emerald-950/10 border border-emerald-500/5 hover:border-emerald-500/20' 
                : 'bg-emerald-50/50 border border-emerald-100 hover:border-emerald-200'
            }`}>
              <div className={`p-2.5 rounded-xl ${theme.id === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] uppercase font-mono block ${theme.id === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>Arrests Today</span>
                <span className="text-base font-bold font-mono">78</span>
                <span className={`text-[9px] block ${theme.id === 'dark' ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>Across Karnataka</span>
              </div>
            </div>
          </div>

          {/* Card: Legend */}
          <div className={`rounded-2xl p-4 flex flex-col gap-2 ${theme.cardBg} ${theme.textMain}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider border-b pb-2 mb-1 ${theme.id === 'dark' ? 'text-purple-400 border-purple-500/10' : 'text-purple-700 border-purple-200/50'}`}>
              Legend
            </h3>
            <div className={`space-y-2 text-[10px] font-mono ${theme.id === 'dark' ? 'text-zinc-400' : 'text-slate-600'}`}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse shadow-[0_0_8px_#ef4444]"></span>
                <span>High Crime Area</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-[0_0_8px_#f59e0b]"></span>
                <span>Medium Crime Area</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]"></span>
                <span>Low Crime Area</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-[0_0_8px_#3b82f6]"></span>
                <span>Police Station</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-[0_0_8px_#a855f7]"></span>
                <span>District HQ</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✈️</span>
                <span>Airport</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-0.5 border-t border-dashed inline-block ${theme.id === 'dark' ? 'border-purple-400/60' : 'border-purple-500/40'}`}></span>
                <span>National Highway</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-0.5 inline-block ${theme.id === 'dark' ? 'bg-purple-500/40' : 'bg-purple-500/25'}`}></span>
                <span>Major Road</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Interactive Map */}
        <div className={`flex-1 flex flex-col gap-3 rounded-2xl p-4 overflow-hidden relative ${theme.cardBg} ${theme.textMain}`}>
          <div className={`flex justify-between items-center border-b pb-2 ${theme.id === 'dark' ? 'border-purple-500/10' : 'border-purple-200/50'}`}>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                KSP Intelligence Map
              </h3>
              <p className={`text-[9px] font-mono ${theme.id === 'dark' ? 'text-purple-400/70' : 'text-purple-700/80'}`}>Real-time Crime Intelligence Overview</p>
            </div>
            
            {/* Search, layers floating components inside the map tab */}
            <div className="flex items-center gap-2">
              {/* Layer toggles */}
              <button
                onClick={() => setIsLayersOpen(!isLayersOpen)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                  isLayersOpen
                    ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                    : theme.id === 'dark'
                      ? "border-purple-500/20 text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                      : "border-purple-200/60 text-slate-600 hover:text-slate-800 hover:bg-black/5"
                }`}
              >
                <Layers className="w-3 h-3" /> Layers
              </button>
              
              {/* Map modes toggler */}
              <div className={`flex items-center p-0.5 rounded-xl border ${theme.id === 'dark' ? 'border-purple-500/10 bg-black/40' : 'border-purple-200/60 bg-slate-100'}`}>
                {(["dark", "standard", "satellite", "heatmap"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setMapMode(mode)}
                    className={`px-2 py-1 rounded-lg text-[9px] uppercase font-mono transition-all cursor-pointer ${
                      mapMode === mode
                        ? "bg-purple-600 text-white font-bold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Map SVG Wrapper */}
          <div className={`flex-1 min-h-0 w-full relative rounded-xl overflow-hidden ${theme.id === 'dark' ? 'bg-[#09090d]' : 'bg-[#f4f2f0] border border-purple-200/40'}`}>
            {/* Floating Autocomplete Search box */}
            <div className={`absolute top-4 left-4 z-20 w-72 shadow-2xl rounded-xl backdrop-blur-md border p-1.5 ${
              theme.id === 'dark' 
                ? 'border-purple-500/20 bg-zinc-950/95 text-zinc-100' 
                : 'border-purple-200/80 bg-white/95 text-zinc-800'
            }`}>
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5" />
                <input
                  type="text"
                  placeholder="Search District, HQ, FIR..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  onFocus={() => setShowSearchSuggestions(true)}
                  className="w-full bg-transparent pl-8 pr-6 py-1.5 text-[11px] focus:outline-none placeholder-zinc-500 font-sans text-inherit"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setShowSearchSuggestions(false);
                    }}
                    className="absolute right-2.5 text-zinc-400 hover:text-zinc-200 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {showSearchSuggestions && matchingSuggestions.length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto z-50 rounded-xl border p-1 shadow-2xl ${
                  theme.id === 'dark' ? 'bg-zinc-950 border-purple-500/20 text-zinc-300' : 'bg-white border-purple-200/80 text-zinc-800'
                }`}>
                  {matchingSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 hover:bg-purple-500/10 rounded-lg cursor-pointer flex justify-between items-center text-[10px] transition-colors"
                      onClick={() => handleSearchSelect(item)}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-[8px] text-purple-400 uppercase font-mono">{item.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <svg
              ref={svgRef}
              className="w-full h-full cursor-grab active:cursor-grabbing select-none"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
            >
              <defs>
                <pattern id="standard-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5"/>
                </pattern>
                <pattern id="satellite-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme.id === 'dark' ? 'rgba(0,242,254,0.03)' : 'rgba(0,0,0,0.02)'} strokeWidth="0.5"/>
                  <circle cx="20" cy="20" r="1" fill={theme.id === 'dark' ? 'rgba(0,242,254,0.15)' : 'rgba(0,0,0,0.08)'}/>
                </pattern>
                <pattern id="terrain-contours" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 0 30 Q 15 15, 30 30 T 60 30" fill="none" stroke="rgba(245,158,11,0.03)" strokeWidth="0.8"/>
                  <path d="M 0 10 Q 30 40, 60 10" fill="none" stroke="rgba(245,158,11,0.02)" strokeWidth="0.5"/>
                </pattern>
                <filter id="map-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="heat-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="15" result="blur" />
                </filter>
                <radialGradient id="heat-grad-high" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={theme.id === 'dark' ? 0.45 : 0.22} />
                  <stop offset="50%" stopColor="#f97316" stopOpacity={theme.id === 'dark' ? 0.20 : 0.08} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </radialGradient>
              </defs>

              {mapMode === "standard" && <rect width="100%" height="100%" fill="#eae8e4" />}
              {mapMode === "satellite" && <rect width="100%" height="100%" fill="#0c0d14" />}
              {mapMode === "standard" && <rect width="100%" height="100%" fill="url(#standard-grid)" />}
              {mapMode === "satellite" && <rect width="100%" height="100%" fill="url(#satellite-grid)" />}
              {mapMode === "heatmap" && <rect width="100%" height="100%" fill={theme.id === 'dark' ? '#09090d' : '#f0edf5'} />}
              {mapMode === "dark" && <rect width="100%" height="100%" fill="#030206" />}

              <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                {mapMode === "satellite" && (
                  <image
                    href="https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=74.0,11.5,78.5,18.2&bboxSR=4326&size=500,800&format=jpg&f=image"
                    x="0" y="0" width="500" height="800"
                    preserveAspectRatio="none" opacity="0.4"
                  />
                )}
                
                {layers.districtBoundaries && (
                  <g className="district-boundary-group">
                    {voronoiCells.map(({ district, path }) => {
                      const isSelected = selectedDistrict?.id === district.id;
                      const isHovered = hoveredDistrict?.id === district.id;
                      
                      let fill = theme.id === 'dark' ? "rgba(147, 51, 234, 0.02)" : "rgba(147, 51, 234, 0.04)";
                      let stroke = theme.id === 'dark' ? "rgba(168, 85, 247, 0.2)" : "rgba(168, 85, 247, 0.25)";
                      let strokeWidth = 1.0;
                      
                      if (mapMode === "standard") {
                        fill = "#f8f7f4";
                        stroke = "#d0cdc7";
                      } else if (mapMode === "satellite") {
                        fill = "rgba(15, 23, 42, 0.4)";
                        stroke = "rgba(6, 182, 212, 0.2)";
                      } else if (mapMode === "heatmap") {
                        fill = theme.id === 'dark' ? "#0f172a" : "#eae4f2";
                        stroke = theme.id === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
                      }
                      
                      if (isHovered) {
                        fill = theme.id === 'dark' ? "rgba(168, 85, 247, 0.08)" : "rgba(168, 85, 247, 0.12)";
                        stroke = "rgba(168, 85, 247, 0.6)";
                        strokeWidth = 1.5;
                      }
                      if (isSelected) {
                        fill = "rgba(168, 85, 247, 0.18)";
                        stroke = "rgba(168, 85, 247, 0.9)";
                        strokeWidth = 2.0;
                      }

                      return (
                        <path
                          key={district.id}
                          d={path || ""}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          className="transition-all duration-200 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDistrict(district);
                            setSelectedCityFilter(district.name);
                            const { x, y } = latLonToSvg(district.lat, district.lon);
                            animateZoom(x, y, 1.8);
                          }}
                          onMouseEnter={() => setHoveredDistrict(district)}
                          onMouseLeave={() => setHoveredDistrict(null)}
                        />
                      );
                    })}
                  </g>
                )}

                <polygon
                  points="410,20 390,107 395,238 355,358 322,477 466,608 344,765 255,765 177,728 88,632 66,561 33,405 11,274 177,143 344,59"
                  fill="none"
                  stroke={theme.id === 'dark' ? "rgba(168, 85, 247, 0.7)" : "rgba(168, 85, 247, 0.8)"}
                  strokeWidth="3"
                  strokeDasharray="5,4"
                  className="pointer-events-none"
                  style={{ filter: "url(#map-glow)" }}
                />

                <g className="highways-group opacity-40">
                  {KARNATAKA_HIGHWAYS.map((hw, idx) => {
                    const pointsStr = hw.path.map(p => {
                      const { x, y } = latLonToSvg(p.lat, p.lon);
                      return `${x},${y}`;
                    }).join(" ");
                    
                    return (
                      <g key={idx}>
                        <polyline
                          points={pointsStr}
                          fill="none"
                          stroke={theme.id === 'dark' ? '#4b5563' : '#a1a8b5'}
                          strokeWidth="1.2"
                          strokeOpacity="0.3"
                          className="pointer-events-none"
                        />
                        <polyline
                          points={pointsStr}
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="0.6"
                          strokeOpacity="0.6"
                          strokeDasharray="3,6"
                          className="pointer-events-none"
                        />
                      </g>
                    );
                  })}
                </g>

                {layers.patrolRoutes && (
                  <g className="patrol-routes-group">
                    {PATROL_ROUTES.map((route) => {
                      const pointsStr = route.coords.map(p => {
                        const { x, y } = latLonToSvg(p.lat, p.lon);
                        return `${x},${y}`;
                      }).join(" ");
                      return (
                        <polyline
                          key={route.id}
                          points={pointsStr}
                          fill="none"
                          stroke={theme.id === 'dark' ? "rgba(0,255,180,0.35)" : "rgba(0,180,120,0.45)"}
                          strokeWidth="1.0"
                          strokeDasharray="4,5"
                          className="flowing-link pointer-events-none"
                        />
                      );
                    })}
                  </g>
                )}

                {(mapMode === "heatmap" || layers.crimeHeatmap) && (
                  <g className="heatmap-group pointer-events-none">
                    {KARNATAKA_DISTRICTS.map((d) => {
                      const dStat = districtCrimeStats[d.id] || { total: 0 };
                      if (dStat.total === 0) return null;
                      const { x, y } = latLonToSvg(d.lat, d.lon);
                      const radius = 15 + Math.sqrt(dStat.total) * 10;
                      return (
                        <circle
                          key={`heat-${d.id}`}
                          cx={x}
                          cy={y}
                          r={radius}
                          fill="url(#heat-grad-high)"
                          style={{ filter: "url(#heat-glow)" }}
                        />
                      );
                    })}
                  </g>
                )}

                {layers.cctv && transform.k > 1.8 && (
                  <g className="cctv-camera-group">
                    {CCTV_CAMERAS.map((cam) => {
                      const { x, y } = latLonToSvg(cam.lat, cam.lon);
                      return (
                        <g key={cam.id} className="cursor-pointer" transform={`translate(${x}, ${y})`}>
                          <circle cx="0" cy="0" r={3 / transform.k} fill={cam.status === "active" ? "#10b981" : "#ef4444"} stroke="#000" strokeWidth={0.5 / transform.k} />
                          <title>{cam.name}</title>
                        </g>
                      );
                    })}
                  </g>
                )}

                {transform.k > 1.0 && (
                  <g className="detailed-features-group pointer-events-none">
                    {MAP_LOCATION_FEATURES.filter((feat) => {
                      if (feat.type === "city" || feat.type === "airport") return transform.k > 1.0;
                      if (feat.type === "police_station") return transform.k > 2.5;
                      return false;
                    }).map((feat) => {
                      const { x, y } = latLonToSvg(feat.lat, feat.lon);
                      let icon = "📍";
                      if (feat.type === "airport") icon = "✈️";
                      if (feat.type === "police_station") icon = "👮";
                      return (
                        <g key={feat.id} transform={`translate(${x}, ${y})`}>
                          <text y={-8 / transform.k} textAnchor="middle" fontSize={`${6 / transform.k}px`} fill={theme.id === 'dark' ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.85)"} fontWeight="semibold" className="font-sans">
                            {feat.name}
                          </text>
                          <text textAnchor="middle" fontSize={`${8 / transform.k}px`}>
                            {icon}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {layers.firMarkers && transform.k >= 1.3 && (
                  <g className="fir-markers-group">
                    {mappedCases.filter(isCaseVisible).map((c) => {
                      const isSelected = selectedCase?.id === c.id;
                      const isHighlighted = highlightedMarker === c.id;
                      let markerColor = "#a855f7";
                      if (c.crime_head.toLowerCase().includes("murder")) markerColor = "#ef4444";
                      else if (c.crime_head.toLowerCase().includes("theft")) markerColor = "#fbbf24";
                      else if (c.crime_head.toLowerCase().includes("cyber") || c.crime_head.toLowerCase().includes("fraud")) markerColor = "#06b6d4";
                      return (
                        <g
                          key={c.id}
                          transform={`translate(${c.x}, ${c.y})`}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCase(c);
                            setHighlightedMarker(c.id);
                            setSelectedNode({ id: c.fir_number, label: c.fir_number, type: "incident" });
                          }}
                        >
                          {(isSelected || isHighlighted) && (
                            <circle cx="0" cy="0" r={12 / transform.k} fill="none" stroke={markerColor} strokeWidth={1.5 / transform.k} className="animate-ping opacity-60" />
                          )}
                          <circle
                            cx="0" cy="0"
                            r={(isSelected || isHighlighted ? 6 : 4) / transform.k}
                            fill={markerColor}
                            stroke="#fff"
                            strokeWidth={(isSelected || isHighlighted ? 1.8 : 1.0) / transform.k}
                          />
                        </g>
                      );
                    })}
                  </g>
                )}

                {selectedCase && (
                  <g className="case-routes-group pointer-events-none">
                    {(() => {
                      const c = mappedCases.find(mc => mc.id === selectedCase.id);
                      if (!c) return null;
                      const distName = c.district.replace(" District", "").replace(" City", "").trim().toLowerCase();
                      const district = KARNATAKA_DISTRICTS.find(d => d.name.toLowerCase() === distName) || KARNATAKA_DISTRICTS[25];
                      const hqCoords = latLonToSvg(district.lat, district.lon);
                      return (
                        <>
                          <line
                            x1={c.x} y1={c.y} x2={hqCoords.x} y2={hqCoords.y}
                            stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,3" strokeOpacity="0.8"
                          />
                          <g transform={`translate(${hqCoords.x}, ${hqCoords.y})`}>
                            <circle cx="0" cy="0" r={3 / transform.k} fill="#ef4444" />
                          </g>
                        </>
                      );
                    })()}
                  </g>
                )}

                <g className="district-labels-group pointer-events-none">
                  {districtPoints.map((p) => {
                    const dStat = districtCrimeStats[p.district.id] || { total: 0 };
                    const isMajor = ["bengaluru-urban", "mysuru", "belagavi", "dharwad", "dakshina-kannada"].includes(p.district.id);
                    if (transform.k < 0.7 && !isMajor) return null;

                    const labelText = dStat.total > 0 
                      ? `${p.district.name} • ${dStat.total}` 
                      : p.district.name;
                    
                    // Estimate size dynamically to keep it crisp at all zoom levels
                    const fontSize = (isMajor ? 8.5 : 7.5) / transform.k;
                    // ~0.58 width multiplier per character for uppercase bold sans font
                    const textWidth = labelText.length * (fontSize * 0.58);
                    const paddingX = 10 / transform.k;
                    const paddingY = 6 / transform.k;
                    const pillWidth = textWidth + paddingX;
                    const pillHeight = fontSize + paddingY;

                    return (
                      <g key={`lbl-${p.district.id}`} transform={`translate(${p.x}, ${p.y})`}>
                        {/* Pill Background */}
                        <rect
                          x={-pillWidth / 2}
                          y={-pillHeight / 2}
                          width={pillWidth}
                          height={pillHeight}
                          rx={pillHeight / 2}
                          fill={theme.id === 'dark' ? 'rgba(15, 10, 25, 0.85)' : 'rgba(255, 255, 255, 0.95)'}
                          stroke={
                            dStat.total > 0
                              ? (theme.id === 'dark' ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.6)')
                              : (theme.id === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)')
                          }
                          strokeWidth={1 / transform.k}
                          className="transition-all duration-300"
                        />
                        {/* Pill Text */}
                        <text
                          textAnchor="middle"
                          y={fontSize * 0.3}
                          fontSize={`${fontSize}px`}
                          fontWeight="bold"
                          fill={
                            dStat.total > 0
                              ? (theme.id === 'dark' ? '#f3f4f6' : '#6b21a8')
                              : (theme.id === 'dark' ? '#94a3b8' : '#475569')
                          }
                          className="font-sans tracking-wide uppercase"
                        >
                          {labelText}
                        </text>
                      </g>
                    );
                  })}
                </g>

                <text x="450" y="320" fill={theme.id === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} fontSize="10px" fontWeight="bold" letterSpacing="2px" textAnchor="middle" className="pointer-events-none uppercase font-mono">Telangana</text>
                <text x="460" y="520" fill={theme.id === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} fontSize="10px" fontWeight="bold" letterSpacing="2px" textAnchor="middle" className="pointer-events-none uppercase font-mono">Andhra Pradesh</text>
                <text x="430" y="700" fill={theme.id === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} fontSize="10px" fontWeight="bold" letterSpacing="2px" textAnchor="middle" className="pointer-events-none uppercase font-mono">Tamil Nadu</text>
                <text x="210" y="770" fill={theme.id === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} fontSize="10px" fontWeight="bold" letterSpacing="2px" textAnchor="middle" className="pointer-events-none uppercase font-mono">Kerala</text>
                <text x="30" y="550" fill={theme.id === 'dark' ? 'rgba(0,180,255,0.15)' : 'rgba(0,100,200,0.12)'} fontSize="10px" fontWeight="bold" letterSpacing="2px" textAnchor="middle" className="pointer-events-none uppercase font-mono">Arabian Sea</text>
                <text x="230" y="30" fill={theme.id === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} fontSize="10px" fontWeight="bold" letterSpacing="2px" textAnchor="middle" className="pointer-events-none uppercase font-mono">Maharashtra</text>
              </g>
            </svg>
            
            <div className={`absolute bottom-4 left-4 pointer-events-none flex flex-col gap-1 text-[9px] font-mono ${theme.id === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>
              <div className={`flex justify-between items-end w-32 border-b pb-0.5 ${theme.id === 'dark' ? 'border-zinc-700' : 'border-slate-300'}`}>
                <span>0</span>
                <span>50</span>
                <span>100</span>
                <span>150 km</span>
              </div>
            </div>

            <div className={`absolute bottom-4 right-4 flex flex-col gap-1.5 border p-1 rounded-xl shadow-2xl ${
              theme.id === 'dark' ? 'bg-black/85 border-purple-500/25' : 'bg-white/95 border-purple-200/80'
            }`}>
              <button
                onClick={() => setTransform({ ...transform, k: Math.min(5, transform.k * 1.25) })}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-purple-400 hover:bg-slate-500/10 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTransform({ ...transform, k: Math.max(0.35, transform.k / 1.25) })}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-purple-400 hover:bg-slate-500/10 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetView}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-purple-400 hover:bg-slate-500/10 transition-colors cursor-pointer"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="w-[25%] min-w-[320px] max-w-[380px] flex flex-col gap-4 overflow-y-auto pr-1">
          <div className={`rounded-2xl p-4 flex flex-col gap-3 ${theme.cardBg} ${theme.textMain}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider border-b pb-1.5 ${theme.id === 'dark' ? 'text-purple-400 border-purple-500/10' : 'text-purple-700 border-purple-200/50'}`}>
              Crime Intensity Heatmap
            </h3>
            <div className="flex gap-4 items-center">
              <div className={`w-[50%] h-32 border rounded-xl flex items-center justify-center p-1 relative overflow-hidden ${
                theme.id === 'dark' ? 'bg-black/40 border-purple-500/5' : 'bg-slate-100/50 border-purple-200/40'
              }`}>
                <svg viewBox="0 0 500 800" className="w-full h-full opacity-70">
                  <polygon
                    points="410,20 390,107 395,238 355,358 322,477 466,608 344,765 255,765 177,728 88,632 66,561 33,405 11,274 177,143 344,59"
                    fill={theme.id === 'dark' ? '#180e29' : '#f1edf7'}
                    stroke={theme.id === 'dark' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.2)'}
                    strokeWidth="8"
                  />
                  {KARNATAKA_DISTRICTS.map((d) => {
                    const { x, y } = latLonToSvg(d.lat, d.lon);
                    const intensityColor = d.crimeRateIndex > 65 ? "#ef4444" : d.crimeRateIndex > 45 ? "#fbbf24" : "#10b981";
                    return (
                      <g key={`mini-${d.id}`}>
                        <circle cx={x} cy={y} r={25 + (d.crimeRateIndex / 3)} fill={intensityColor} opacity="0.16" style={{ filter: "blur(5px)" }} />
                        <circle cx={x} cy={y} r="6" fill={intensityColor} opacity="0.7" />
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="flex-1 flex flex-col gap-2.5">
                <div className={`h-20 w-3 rounded-full bg-gradient-to-t from-emerald-500 via-yellow-500 to-red-500 border ${
                  theme.id === 'dark' ? 'border-zinc-800' : 'border-slate-200'
                }`} />
                <div className={`flex flex-col gap-1 text-[9px] font-mono ${theme.id === 'dark' ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Very High</div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> High</div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Medium</div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Low</div>
                </div>
              </div>
            </div>
          </div>
          <div className={`rounded-2xl p-4 flex flex-col gap-2 ${theme.cardBg} ${theme.textMain}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider border-b pb-1.5 ${theme.id === 'dark' ? 'text-purple-400 border-purple-500/10' : 'text-purple-700 border-purple-200/50'}`}>
              Top 5 Crime Categories
            </h3>
            <div className="h-28 flex items-center">
              <div className="w-[45%] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Theft", value: 28.4, color: "#3b82f6" },
                        { name: "Assault", value: 21.7, color: "#fbbf24" },
                        { name: "Cyber Crime", value: 16.3, color: "#ec4899" },
                        { name: "Fraud", value: 14.8, color: "#ef4444" },
                        { name: "Others", value: 18.8, color: "#10b981" }
                      ]}
                      cx="50%" cy="50%"
                      innerRadius={22}
                      outerRadius={38}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {[
                        { color: "#3b82f6" },
                        { color: "#fbbf24" },
                        { color: "#ec4899" },
                        { color: "#ef4444" },
                        { color: "#10b981" }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col gap-1 text-[9px] font-mono pr-2">
                {[
                  { name: "Theft", value: "28.4%", color: "bg-blue-500" },
                  { name: "Assault", value: "21.7%", color: "bg-amber-400" },
                  { name: "Cyber Crime", value: "16.3%", color: "bg-pink-500" },
                  { name: "Fraud", value: "14.8%", color: "bg-red-500" },
                  { name: "Others", value: "18.8%", color: "bg-emerald-500" }
                ].map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.color}`} />
                      <span className={theme.id === 'dark' ? 'text-zinc-400' : 'text-slate-600'}>{cat.name}</span>
                    </div>
                    <span className="font-bold">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`rounded-2xl p-4 flex flex-col gap-3 ${theme.cardBg} ${theme.textMain}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider border-b pb-1.5 ${theme.id === 'dark' ? 'text-purple-400 border-purple-500/10' : 'text-purple-700 border-purple-200/50'}`}>
              Top 5 Districts (By Active Cases)
            </h3>
            <div className="space-y-2 text-[10px] font-mono">
              {[
                { name: "Bengaluru Urban", val: 542, max: 600, color: "bg-red-500" },
                { name: "Bengaluru Rural", val: 321, max: 600, color: "bg-orange-500" },
                { name: "Mysuru", val: 198, max: 600, color: "bg-yellow-500" },
                { name: "Dharwad", val: 176, max: 600, color: "bg-emerald-500" },
                { name: "Belagavi", val: 154, max: 600, color: "bg-blue-500" }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className={theme.id === 'dark' ? 'text-zinc-400' : 'text-slate-600'}>{item.name}</span>
                    <span className="font-bold">{item.val}</span>
                  </div>
                  <div className={`w-full rounded-full h-1.5 overflow-hidden ${theme.id === 'dark' ? 'bg-zinc-900' : 'bg-slate-200'}`}>
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(item.val / item.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-2xl p-4 flex flex-col gap-2 flex-1 min-h-0 ${theme.cardBg} ${theme.textMain}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider border-b pb-1.5 ${theme.id === 'dark' ? 'text-purple-400 border-purple-500/10' : 'text-purple-700 border-purple-200/50'}`}>
              Real-time Incident Feed
            </h3>
            <div className="space-y-2 overflow-y-auto flex-1 min-h-0 text-[10px] font-mono pr-1">
              <div className={`p-2 rounded-xl border flex items-start gap-2.5 ${
                theme.id === 'dark' ? 'bg-red-950/10 border-red-500/10' : 'bg-red-50/55 border-red-100'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 inline-block shrink-0 animate-pulse" />
                <div className="flex-1">
                  <div className="text-red-500 font-bold">Theft Reported</div>
                  <div className={`text-[9px] mt-0.5 ${theme.id === 'dark' ? 'text-zinc-400' : 'text-slate-500'}`}>Vijayapura District</div>
                </div>
                <div className="text-zinc-500 text-[9px]">10:32 AM</div>
              </div>
              <div className={`p-2 rounded-xl border flex items-start gap-2.5 ${
                theme.id === 'dark' ? 'bg-amber-950/10 border-amber-500/10' : 'bg-amber-50/55 border-amber-100'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 inline-block shrink-0" />
                <div className="flex-1">
                  <div className="text-amber-500 font-bold">Assault Case</div>
                  <div className={`text-[9px] mt-0.5 ${theme.id === 'dark' ? 'text-zinc-400' : 'text-slate-500'}`}>Davanagere District</div>
                </div>
                <div className="text-zinc-500 text-[9px]">10:21 AM</div>
              </div>
              <div className={`p-2 rounded-xl border flex items-start gap-2.5 ${
                theme.id === 'dark' ? 'bg-purple-950/10 border-purple-500/10' : 'bg-purple-50/55 border-purple-100'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 inline-block shrink-0" />
                <div className="flex-1">
                  <div className="text-purple-500 font-bold">Cyber Fraud</div>
                  <div className={`text-[9px] mt-0.5 ${theme.id === 'dark' ? 'text-zinc-455' : 'text-slate-500'}`}>Bengaluru Urban</div>
                </div>
                <div className="text-zinc-500 text-[9px]">10:15 AM</div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("cases")}
              className={`text-right text-[9px] font-bold font-mono mt-1 flex items-center justify-end gap-1 cursor-pointer ${
                theme.id === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-700 hover:text-purple-800'
              }`}
            >
              View All Incidents →
            </button>
          </div>
        </div>
      </div>

      {selectedDistrict && (
        <div className={`absolute top-16 right-1/4 w-80 backdrop-blur-md border rounded-2xl shadow-2xl z-45 p-4 space-y-3 ${
          theme.id === 'dark' ? 'border-purple-500/20 bg-zinc-950/95 text-zinc-300' : 'border-purple-200/80 bg-white/95 text-zinc-700'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${theme.id === 'dark' ? 'border-purple-500/20' : 'border-purple-200/50'}`}>
            <div>
              <span className={`text-[9px] font-mono uppercase tracking-widest block ${theme.id === 'dark' ? 'text-purple-400' : 'text-purple-650'}`}>GIS District Hub</span>
              <h3 className="text-xs font-bold font-sans tracking-wide flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-purple-500" /> {selectedDistrict.name}
              </h3>
            </div>
            <button
              onClick={() => {
                setSelectedDistrict(null);
                setSelectedCityFilter("All");
              }}
              className="text-zinc-550 hover:text-zinc-300 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
          {(() => {
            const stats = districtCrimeStats[selectedDistrict.id] || { total: 0, active: 0, closed: 0 };
            return (
              <>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className={`p-2 border rounded-xl ${
                    theme.id === 'dark' ? 'bg-zinc-900/40 border-purple-500/10' : 'bg-slate-50 border-purple-200/30'
                  }`}>
                    <div className={`text-sm font-bold font-mono ${theme.id === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>{stats.total}</div>
                    <div className="text-[8px] text-zinc-500 uppercase font-bold">Total FIRs</div>
                  </div>
                  <div className={`p-2 border rounded-xl ${
                    theme.id === 'dark' ? 'bg-zinc-900/40 border-purple-500/10' : 'bg-slate-50 border-purple-200/30'
                  }`}>
                    <div className="text-sm font-bold font-mono text-amber-500">{stats.active}</div>
                    <div className="text-[8px] text-zinc-500 uppercase font-bold">Active Cases</div>
                  </div>
                </div>
                <div className={`p-3 border rounded-xl space-y-1.5 text-[10px] font-mono ${
                  theme.id === 'dark' ? 'bg-purple-950/10 border-purple-500/10' : 'bg-purple-50/45 border-purple-200/40'
                }`}>
                  <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/5' : 'border-purple-200/20'}`}>
                    <span className="text-zinc-500">Crime Index</span>
                    <span className="font-bold">{selectedDistrict.crimeRateIndex}/100</span>
                  </div>
                  <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/5' : 'border-purple-200/20'}`}>
                    <span className="text-zinc-500">Common Crime</span>
                    <span className="font-bold">{selectedDistrict.commonCrime}</span>
                  </div>
                  <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/5' : 'border-purple-200/20'}`}>
                    <span className="text-zinc-500">Risk Assessment</span>
                    <span className={`font-bold ${selectedDistrict.crimeRateIndex > 60 ? "text-red-500" : "text-emerald-500"}`}>
                      {selectedDistrict.crimeRateIndex > 60 ? "HIGH RISK" : "NORMAL"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCityFilter(selectedDistrict.name);
                    setActiveTab("dashboard");
                  }}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[9px] uppercase shadow-lg transition-colors flex items-center justify-center gap-1"
                >
                  <BarChart3 className="w-3 h-3" /> View Analytics
                </button>
              </>
            );
          })()}
        </div>
      )}

      {selectedCase && !selectedDistrict && (
        <div className={`absolute top-16 right-1/4 w-80 backdrop-blur-md border rounded-2xl shadow-2xl z-45 p-4 space-y-3 ${
          theme.id === 'dark' ? 'border-purple-500/20 bg-zinc-950/95 text-zinc-300' : 'border-purple-200/80 bg-white/95 text-zinc-700'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${theme.id === 'dark' ? 'border-purple-500/20' : 'border-purple-200/50'}`}>
            <div>
              <span className={`text-[9px] font-mono uppercase tracking-widest block ${theme.id === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>Geographical Incident file</span>
              <h3 className="text-xs font-bold font-mono tracking-wide flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-purple-500" /> {selectedCase.fir_number}
              </h3>
            </div>
            <button
              onClick={() => setSelectedCase(null)}
              className="text-zinc-550 hover:text-zinc-350 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/5' : 'border-purple-200/20'}`}>
              <span className="text-zinc-500">Crime Type</span>
              <span className="font-bold">{selectedCase.crime_head}</span>
            </div>
            <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/5' : 'border-purple-200/20'}`}>
              <span className="text-zinc-500">Precinct Station</span>
              <span className="font-bold">{selectedCase.police_station}</span>
            </div>
            <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/5' : 'border-purple-200/20'}`}>
              <span className="text-zinc-500">Officer</span>
              <span className="font-bold">{selectedCase.officer}</span>
            </div>
            <div className={`flex justify-between items-center py-0.5 border-b ${theme.id === 'dark' ? 'border-purple-500/5' : 'border-purple-200/20'}`}>
              <span className="text-zinc-500">Status</span>
              <span className={`font-bold px-1 py-0.2 rounded text-[8px] border ${selectedCase.status === "Closed" ? "border-emerald-500/30 text-emerald-500" : "border-amber-500/30 text-amber-500"}`}>{selectedCase.status}</span>
            </div>
          </div>
          <div className={`p-2.5 border rounded-xl ${theme.id === 'dark' ? 'bg-zinc-900/60 border-purple-500/10' : 'bg-slate-50 border-purple-200/40'}`}>
            <p className="text-[9px] font-mono leading-relaxed truncate">{selectedCase.description}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setGraphCases([selectedCase]);
                setActiveSuspect(selectedCase.accused[0] || null);
                setActiveTab("network");
              }}
              className="flex-1 py-2 rounded-lg border border-purple-500/25 hover:bg-purple-500/10 font-bold text-[9px] uppercase transition-all text-center"
            >
              Analyze Relations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cases")}
              className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[9px] uppercase shadow-lg transition-colors flex items-center justify-center gap-1"
            >
              Open Case
            </button>
          </div>
        </div>
      )}

      {isLayersOpen && (
        <div className={`absolute bottom-16 left-80 p-3 rounded-xl shadow-2xl border w-56 z-50 ${
          theme.id === 'dark' ? 'border-purple-500/25 bg-zinc-950 text-zinc-300' : 'border-purple-200/80 bg-white text-zinc-700'
        }`}>
          <div className={`flex items-center justify-between border-b pb-1.5 mb-2 ${theme.id === 'dark' ? 'border-purple-500/10' : 'border-purple-200/30'}`}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider font-mono">Map Layers</h4>
            <button onClick={() => setIsLayersOpen(false)} className="text-[10px] font-bold hover:text-white">✕</button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {Object.entries(layers).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setLayers(prev => ({ ...prev, [key]: !val }))}
                className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-500/10 text-left text-[9px] font-mono cursor-pointer"
              >
                <span className={val ? "text-inherit font-semibold" : "text-zinc-550"}>
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                </span>
                {val ? <Eye className="w-2.5 h-2.5 text-purple-500" /> : <EyeOff className="w-2.5 h-2.5 text-zinc-500" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`h-12 border-t flex items-center justify-between px-4 text-[9px] font-mono rounded-xl mt-4 ${
        theme.id === 'dark' 
          ? 'border-purple-500/10 bg-zinc-950/80 text-zinc-400' 
          : 'border-purple-200/50 bg-white/85 text-zinc-600 shadow-md'
      }`}>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block shadow-[0_0_8px_#10b981]" />
            SYSTEM STATUS: <span className="text-emerald-500 font-bold">ALL SYSTEMS OPERATIONAL</span>
          </span>
          <span className="border-l border-zinc-800 h-3 inline-block opacity-20" />
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span>LAST UPDATED:</span>
            <span className="font-bold">10:35:24 AM, 15 May 2025</span>
          </span>
          <span className="border-l border-zinc-800 h-3 inline-block opacity-20" />
          <span className={`flex items-center gap-1 ${theme.id === 'dark' ? 'text-purple-400' : 'text-purple-650'}`}>
            <Shield className="w-3 h-3" />
            <span>AI ANALYSIS STATUS:</span>
            <span className="font-bold">ACTIVE</span>
            <span className="text-zinc-500 opacity-60">(Real-time Processing)</span>
          </span>
          <span className="border-l border-zinc-800 h-3 inline-block opacity-20" />
          <span className={`flex items-center gap-1 ${theme.id === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
            <Database className="w-3 h-3" />
            <span>DATA SOURCES:</span>
            <span className="font-bold">128+ SOURCES INTEGRATED</span>
          </span>
        </div>
        <div className="flex items-center gap-2 border-l border-zinc-800 pl-4 h-full opacity-90">
          <img src="/logo.png" className="w-4 h-4 object-contain" alt="KSP Logo" />
          <span className="text-[8px] font-bold tracking-wider">KARNATAKA STATE POLICE // SEVA - SURAKSHA - SAMARPANE</span>
        </div>
      </div>
    </div>
  );
}
