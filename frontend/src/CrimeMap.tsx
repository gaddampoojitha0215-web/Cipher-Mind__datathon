import React, { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import {
  Search, ZoomIn, ZoomOut, Maximize2, Layers, MapPin, Eye, EyeOff, Info,
  CheckCircle, Video, Compass, Navigation, Shield, Database, BarChart3, Clock, User
} from "lucide-react";
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
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#09090d]">
      {/* Interactive Map SVG */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {/* SVG Defs for High-Tech HUD Styling */}
        <defs>
          {/* Grid backgrounds */}
          <pattern id="standard-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5"/>
          </pattern>
          <pattern id="satellite-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,242,254,0.03)" strokeWidth="0.5"/>
            <circle cx="20" cy="20" r="1" fill="rgba(0,242,254,0.15)"/>
          </pattern>
          <pattern id="terrain-contours" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 0 30 Q 15 15, 30 30 T 60 30" fill="none" stroke="rgba(245,158,11,0.03)" strokeWidth="0.8"/>
            <path d="M 0 10 Q 30 40, 60 10" fill="none" stroke="rgba(245,158,11,0.02)" strokeWidth="0.5"/>
          </pattern>

          {/* Glow Filters */}
          <filter id="map-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="heat-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="15" result="blur" />
          </filter>

          {/* Heat gradients */}
          <radialGradient id="heat-grad-high" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dynamic Map Layer Fills (Fallback background under image layers) */}
        {mapMode === "standard" && <rect width="100%" height="100%" fill="#eae8e4" />}
        {mapMode === "satellite" && <rect width="100%" height="100%" fill="#0c0d14" />}
        {mapMode === "terrain" && <rect width="100%" height="100%" fill="#e8e4db" />}
        {mapMode === "dark" && <rect width="100%" height="100%" fill="#242f3e" />}
        {mapMode === "heatmap" && <rect width="100%" height="100%" fill="#09090d" />}

        {/* Global Transform wrapper for Pan & Zoom */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          
          {/* Base Map Basemap Image Layers */}
          {mapMode === "satellite" && (
            <image
              href="https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=74.0,11.5,78.5,18.2&bboxSR=4326&size=500,800&format=jpg&f=image"
              x="0"
              y="0"
              width="500"
              height="800"
              preserveAspectRatio="none"
              opacity="0.9"
            />
          )}
          {mapMode === "standard" && (
            <image
              href="https://server.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/export?bbox=74.0,11.5,78.5,18.2&bboxSR=4326&size=500,800&format=png&f=image"
              x="0"
              y="0"
              width="500"
              height="800"
              preserveAspectRatio="none"
              opacity="0.85"
            />
          )}
          {mapMode === "terrain" && (
            <image
              href="https://server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/export?bbox=74.0,11.5,78.5,18.2&bboxSR=4326&size=500,800&format=png&f=image"
              x="0"
              y="0"
              width="500"
              height="800"
              preserveAspectRatio="none"
              opacity="0.85"
            />
          )}
          {mapMode === "dark" && (
            <image
              href="https://server.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/export?bbox=74.0,11.5,78.5,18.2&bboxSR=4326&size=500,800&format=png&f=image"
              x="0"
              y="0"
              width="500"
              height="800"
              preserveAspectRatio="none"
              opacity="0.8"
              style={{ filter: "invert(1) hue-rotate(180deg) brightness(0.55) contrast(1.15)" }}
            />
          )}
          
          {/* 1. Base District Boundaries - Voronoi Administrative Cells */}
          {layers.districtBoundaries && (
            <g className="district-boundary-group">
              {voronoiCells.map(({ district, path }) => {
                const isSelected = selectedDistrict?.id === district.id;
                const isHovered = hoveredDistrict?.id === district.id;
                
                // Color formatting depending on map modes
                let fill = "rgba(147, 51, 234, 0.01)";
                let stroke = "rgba(168, 85, 247, 0.12)";
                let strokeWidth = 1.0;
                
                if (mapMode === "standard") {
                  fill = "#f8f7f4";
                  stroke = "#d0cdc7";
                } else if (mapMode === "satellite") {
                  fill = "rgba(15, 23, 42, 0.5)";
                  stroke = "rgba(6, 182, 212, 0.2)";
                } else if (mapMode === "terrain") {
                  fill = "#f1ede4";
                  stroke = "#d5cfc4";
                } else if (mapMode === "dark") {
                  fill = "#2b3c51";
                  stroke = "#1f2d3d";
                } else if (mapMode === "heatmap") {
                  fill = "#0f172a";
                  stroke = "rgba(255, 255, 255, 0.05)";
                }
                
                if (isHovered) {
                  if (mapMode === "standard") {
                    fill = "#e8eaed";
                    stroke = "#bdc1c6";
                  } else if (mapMode === "terrain") {
                    fill = "#e5dfd3";
                    stroke = "#bca896";
                  } else if (mapMode === "dark") {
                    fill = "#35485f";
                    stroke = "#4b6c93";
                  } else {
                    fill = theme.id === "dark" ? "rgba(168, 85, 247, 0.06)" : "rgba(168, 85, 247, 0.04)";
                    stroke = "rgba(168, 85, 247, 0.4)";
                  }
                  strokeWidth = 1.5;
                }
                if (isSelected) {
                  if (mapMode === "standard") {
                    fill = "rgba(26, 115, 232, 0.08)";
                    stroke = "#1a73e8";
                  } else if (mapMode === "dark") {
                    fill = "rgba(168, 85, 247, 0.12)";
                    stroke = "#a855f7";
                  } else {
                    fill = "rgba(168, 85, 247, 0.12)";
                    stroke = "rgba(168, 85, 247, 0.85)";
                  }
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
                      
                      // Auto zoom on click
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

          {/* 2. Karnataka State Outline Boundary for masking/clipping visual aesthetics */}
          <polygon
            points="388,34 377,107 388,238 355,358 322,477 466,608 344,752 255,728 177,728 88,632 66,561 33,405 11,274 177,143 344,59"
            fill="none"
            stroke={theme.id === "dark" ? "rgba(168, 85, 247, 0.35)" : "rgba(168, 85, 247, 0.5)"}
            strokeWidth="3.5"
            strokeDasharray="6,4"
            className="pointer-events-none"
            style={{ filter: theme.id === "dark" ? "url(#map-glow)" : "none" }}
          />

          {/* 3. Highways Layer */}
          <g className="highways-group opacity-60">
            {KARNATAKA_HIGHWAYS.map((hw, idx) => {
              // Convert lat/lon line coordinates to points list
              const pointsStr = hw.path.map(p => {
                const { x, y } = latLonToSvg(p.lat, p.lon);
                return `${x},${y}`;
              }).join(" ");
              
              let baseStroke = "#4b5563";
              let accentStroke = "#a855f7";
              
              if (mapMode === "standard") {
                baseStroke = "#ffd066";
                accentStroke = "#ffb81c";
              } else if (mapMode === "satellite") {
                baseStroke = "rgba(6, 182, 212, 0.4)";
                accentStroke = "#22d3ee";
              } else if (mapMode === "terrain") {
                baseStroke = "#d5cfc4";
                accentStroke = "#8e7a68";
              } else if (mapMode === "dark") {
                baseStroke = "#38414e";
                accentStroke = "#ff9c00";
              }
              
              return (
                <g key={idx}>
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={baseStroke}
                    strokeWidth="1.8"
                    strokeOpacity="0.4"
                    className="pointer-events-none"
                  />
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={accentStroke}
                    strokeWidth="0.8"
                    strokeOpacity="0.8"
                    strokeDasharray="4,8"
                    className="pointer-events-none"
                  />
                </g>
              );
            })}
          </g>

          {/* 4. Patrol Routes (Dashed animated loops) */}
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
                    stroke="rgba(0,255,180,0.4)"
                    strokeWidth="1.2"
                    strokeDasharray="5,6"
                    className="flowing-link pointer-events-none"
                  />
                );
              })}
            </g>
          )}

          {/* 5. Heatmap Overlay circles for hotspots */}
          {(mapMode === "heatmap" || layers.crimeHeatmap) && (
            <g className="heatmap-group pointer-events-none">
              {KARNATAKA_DISTRICTS.map((d) => {
                const dStat = districtCrimeStats[d.id] || { total: 0 };
                if (dStat.total === 0) return null;
                const { x, y } = latLonToSvg(d.lat, d.lon);
                const radius = 25 + dStat.total * 6; // grow with crime counts
                
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

          {/* 6. CCTV Camera Icons (revealed at higher zoom levels) */}
          {layers.cctv && transform.k > 1.8 && (
            <g className="cctv-camera-group">
              {CCTV_CAMERAS.filter((cam) => {
                const width = svgRef.current ? svgRef.current.clientWidth : 800;
                const height = svgRef.current ? svgRef.current.clientHeight : 800;
                const left = -transform.x / transform.k;
                const right = (width - transform.x) / transform.k;
                const top = -transform.y / transform.k;
                const bottom = (height - transform.y) / transform.k;
                
                const { x, y } = latLonToSvg(cam.lat, cam.lon);
                return x >= left - 20 && x <= right + 20 && y >= top - 20 && y <= bottom + 20;
              }).map((cam) => {
                const { x, y } = latLonToSvg(cam.lat, cam.lon);
                return (
                  <g key={cam.id} className="cursor-pointer" transform={`translate(${x}, ${y})`}>
                    <circle cx="0" cy="0" r={3.5 / transform.k} fill={cam.status === "active" ? "#10b981" : "#ef4444"} stroke="#000" strokeWidth={0.5 / transform.k} />
                    <title>{cam.name} ({cam.status.toUpperCase()})</title>
                  </g>
                );
              })}
            </g>
          )}

          {/* 7. Detailed Locations (Airports, Railway, Bus Stations, Landmarks) */}
          {transform.k > 1.0 && (
            <g className="detailed-features-group pointer-events-none">
              {MAP_LOCATION_FEATURES.filter((feat) => {
                // Viewport culling check (bounding box in SVG space)
                const width = svgRef.current ? svgRef.current.clientWidth : 800;
                const height = svgRef.current ? svgRef.current.clientHeight : 800;
                const left = -transform.x / transform.k;
                const right = (width - transform.x) / transform.k;
                const top = -transform.y / transform.k;
                const bottom = (height - transform.y) / transform.k;
                
                const { x, y } = latLonToSvg(feat.lat, feat.lon);
                const isInside = x >= left - 50 && x <= right + 50 && y >= top - 50 && y <= bottom + 50;
                if (!isInside) return false;

                // Zoom level filter: show different feature types progressively
                if (feat.type === "city" || feat.type === "airport") {
                  return transform.k > 1.0;
                }
                if (feat.type === "railway" || feat.type === "bus_station") {
                  return transform.k > 2.2;
                }
                if (feat.type === "town" || feat.type === "police_station") {
                  return transform.k > 3.2;
                }
                if (feat.type === "landmark" || feat.type === "village") {
                  return transform.k > 4.5;
                }
                return false;
              }).map((feat) => {
                const { x, y } = latLonToSvg(feat.lat, feat.lon);
                
                // Set character icons or indicators
                let icon = "📍";
                if (feat.type === "airport") icon = "✈️";
                if (feat.type === "railway") icon = "🚆";
                if (feat.type === "bus_station") icon = "🚌";
                if (feat.type === "police_station") icon = "👮";
                if (feat.type === "landmark") icon = "🏛️";

                const isDarkMap = ["dark", "satellite", "heatmap"].includes(mapMode);
                const textFill = isDarkMap ? "rgba(255,255,255,0.7)" : "rgba(31,41,55,0.85)";

                return (
                  <g key={feat.id} transform={`translate(${x}, ${y})`}>
                    <text y={-10 / transform.k} textAnchor="middle" fontSize={`${7 / transform.k}px`} fill={textFill} fontWeight="semibold" className="font-sans">
                      {feat.name}
                    </text>
                    <text textAnchor="middle" fontSize={`${10 / transform.k}px`}>
                      {icon}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* 8. Case / FIR Markers */}
          {layers.firMarkers && (
            <g className="fir-markers-group">
              {mappedCases.filter(isCaseVisible).filter((c) => {
                const width = svgRef.current ? svgRef.current.clientWidth : 800;
                const height = svgRef.current ? svgRef.current.clientHeight : 800;
                const left = -transform.x / transform.k;
                const right = (width - transform.x) / transform.k;
                const top = -transform.y / transform.k;
                const bottom = (height - transform.y) / transform.k;
                
                return c.x >= left - 20 && c.x <= right + 20 && c.y >= top - 20 && c.y <= bottom + 20;
              }).map((c) => {
                const isSelected = selectedCase?.id === c.id;
                const isHighlighted = highlightedMarker === c.id;
                
                let markerColor = "#a855f7"; // purple
                if (c.crime_head.toLowerCase().includes("murder")) markerColor = "#ef4444"; // red
                else if (c.crime_head.toLowerCase().includes("theft")) markerColor = "#fbbf24"; // amber
                else if (c.crime_head.toLowerCase().includes("cyber") || c.crime_head.toLowerCase().includes("fraud")) markerColor = "#06b6d4"; // cyan
                
                return (
                  <g
                    key={c.id}
                    transform={`translate(${c.x}, ${c.y})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCase(c);
                      setHighlightedMarker(c.id);
                      
                      // Highlight related link analysis nodes
                      setSelectedNode({ id: c.fir_number, label: c.fir_number, type: "incident" });
                    }}
                  >
                    {/* Pulsing selection circle */}
                    {(isSelected || isHighlighted) && (
                      <circle
                        cx="0"
                        cy="0"
                        r={14 / transform.k}
                        fill="none"
                        stroke={markerColor}
                        strokeWidth={1.5 / transform.k}
                        className="animate-ping opacity-60"
                      />
                    )}
                    
                    {/* Inner pin point */}
                    <circle
                      cx="0"
                      cy="0"
                      r={(isSelected || isHighlighted ? 6 : 4.5) / transform.k}
                      fill={markerColor}
                      stroke="#fff"
                      strokeWidth={(isSelected || isHighlighted ? 2.0 : 1.2) / transform.k}
                      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* 9. Render Selected Case Route/Details (evidence, suspect, arrest locations) */}
          {selectedCase && (
            <g className="case-routes-group pointer-events-none">
              {(() => {
                const c = mappedCases.find(mc => mc.id === selectedCase.id);
                if (!c) return null;
                
                // Draw line between case marker and district HQ/police station coordinates
                const distName = c.district.replace(" District", "").replace(" City", "").trim().toLowerCase();
                const district = KARNATAKA_DISTRICTS.find(d => d.name.toLowerCase() === distName) || KARNATAKA_DISTRICTS[25];
                const hqCoords = latLonToSvg(district.lat, district.lon);
                
                return (
                  <>
                    {/* Line connecting Crime Scene to Police Station HQ */}
                    <line
                      x1={c.x}
                      y1={c.y}
                      x2={hqCoords.x}
                      y2={hqCoords.y}
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                      strokeOpacity="0.8"
                    />
                    
                    {/* Police Station marker flag */}
                    <g transform={`translate(${hqCoords.x}, ${hqCoords.y})`}>
                      <circle cx="0" cy="0" r={3 / transform.k} fill="#ef4444" />
                      <text x={6 / transform.k} y={2 / transform.k} fill="#ef4444" fontSize={`${7 / transform.k}px`} fontWeight="bold" className="font-mono">Precinct HQ</text>
                    </g>
                  </>
                );
              })()}
            </g>
          )}

          {/* 10. District Labels (HQ text labels) */}
          <g className="district-labels-group pointer-events-none">
            {districtPoints.map((p) => {
              const dStat = districtCrimeStats[p.district.id] || { total: 0 };
              
              // Only reveal district names at higher zooms, except major ones
              const isMajor = ["bengaluru-urban", "mysuru", "belagavi", "dharwad", "dakshina-kannada"].includes(p.district.id);
              if (transform.k < 0.7 && !isMajor) return null;

              const isDarkMap = ["dark", "satellite", "heatmap"].includes(mapMode);
              const textFill = isDarkMap ? "#f3f4f6" : "#2d3748";
              const strokeColor = isDarkMap ? "#000000" : "#ffffff";

              return (
                <g key={`lbl-${p.district.id}`} transform={`translate(${p.x}, ${p.y})`}>
                  {/* Subtle shadow backer for text readability */}
                  <text
                    y={-12 / transform.k}
                    textAnchor="middle"
                    fontSize={`${8 / transform.k}px`}
                    fontWeight="bold"
                    fill={strokeColor}
                    stroke={strokeColor}
                    strokeWidth={2.5 / transform.k}
                    strokeLinejoin="round"
                    className="font-sans tracking-wide uppercase opacity-90"
                  >
                    {p.district.name}
                  </text>
                  <text
                    y={-12 / transform.k}
                    textAnchor="middle"
                    fontSize={`${8 / transform.k}px`}
                    fontWeight="bold"
                    fill={textFill}
                    className="font-sans tracking-wide uppercase"
                  >
                    {p.district.name}
                  </text>
                  
                  {/* Display active crime count bubble */}
                  {dStat.total > 0 && (
                    <g transform={`translate(0, ${10 / transform.k})`}>
                      <circle cx="0" cy="0" r={5 / transform.k} fill="rgba(168, 85, 247, 0.85)" stroke={isDarkMap ? "#000" : "#fff"} strokeWidth={0.5 / transform.k} />
                      <text textAnchor="middle" y={2 / transform.k} fontSize={`${5.5 / transform.k}px`} fill="#fff" fontWeight="bold" className="font-mono">
                        {dStat.total}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

        </g>
      </svg>

      {/* Floating Google Maps Style UI Controls */}
      
      {/* 1. TOP LEFT SEARCH BAR */}
      <div className={`absolute top-4 left-4 z-50 w-80 sm:w-96 shadow-2xl rounded-2xl backdrop-blur-md border ${theme.id === 'dark' ? 'bg-zinc-950/95 border-zinc-800 text-zinc-100' : 'bg-white/95 border-zinc-200 text-zinc-800'} p-2`}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
          <input
            type="text"
            placeholder="Search District, City, Police Station, FIR..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchSuggestions(true);
            }}
            onFocus={() => setShowSearchSuggestions(true)}
            className="w-full bg-transparent pl-9 pr-8 py-2 text-xs focus:outline-none placeholder-zinc-500 font-sans text-inherit"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearchSuggestions(false);
              }}
              className="absolute right-3 text-zinc-400 hover:text-zinc-200 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Suggestions list */}
        {showSearchSuggestions && matchingSuggestions.length > 0 && (
          <div className={`absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto z-50 rounded-2xl border p-2 shadow-2xl ${theme.id === 'dark' ? 'bg-zinc-950/95 border-zinc-800 text-zinc-100' : 'bg-white/95 border-zinc-200 text-zinc-800'}`}>
            <div className="px-3 pb-1 pt-1 text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Select location to zoom</div>
            {matchingSuggestions.map((item, idx) => (
              <div
                key={idx}
                className="px-3 py-2 hover:bg-purple-500/10 rounded-lg cursor-pointer flex justify-between items-center text-xs transition-colors"
                onClick={() => handleSearchSelect(item)}
              >
                <span className={`font-medium ${theme.id === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>{item.name}</span>
                <span className="text-[9px] text-purple-400 uppercase font-mono">{item.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. TOP RIGHT MAP MODE SWITCHER */}
      <div className={`absolute top-4 right-4 z-40 flex items-center gap-1.5 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md border ${theme.id === 'dark' ? 'bg-zinc-950/95 border-zinc-800 text-zinc-300' : 'bg-white/95 border-zinc-200 text-zinc-700'}`}>
        {(["dark", "standard", "satellite", "terrain", "heatmap"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setMapMode(mode)}
            className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-sans font-bold transition-all cursor-pointer ${
              mapMode === mode
                ? "bg-purple-600 border border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.45)]"
                : "border border-transparent hover:text-white"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* 3. RIGHT VIEWPORT UTILITIES (BOTTOM RIGHT) */}
      <div className={`absolute bottom-4 right-4 z-40 flex flex-col gap-2 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md border ${theme.id === 'dark' ? 'bg-zinc-950/95 border-zinc-800 text-zinc-400' : 'bg-white/95 border-zinc-200 text-zinc-500'}`}>
        <button
          onClick={() => setTransform({ ...transform, k: Math.min(5, transform.k * 1.25) })}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:text-zinc-200 hover:bg-slate-500/10 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTransform({ ...transform, k: Math.max(0.35, transform.k / 1.25) })}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:text-zinc-200 hover:bg-slate-500/10 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:text-zinc-200 hover:bg-slate-500/10 transition-colors cursor-pointer"
          title="Reset Fit"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 4. LAYERS SELECTION FLOATER (LEFT BOTTOM - COLLAPSIBLE) */}
      <div className="absolute bottom-4 left-4 z-40 flex flex-col items-start gap-2">
        {isLayersOpen && (
          <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-md border w-60 mb-2 ${theme.id === 'dark' ? 'bg-zinc-950/95 border-zinc-800 text-zinc-300' : 'bg-white/95 border-zinc-200 text-zinc-700'}`}>
            <div className="flex items-center justify-between border-b border-zinc-850/10 dark:border-zinc-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider font-sans">Map Layers</h4>
              </div>
              <button 
                onClick={() => setIsLayersOpen(false)}
                className="text-xs font-bold hover:text-zinc-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {Object.entries(layers).map(([key, val]) => {
                const label = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, str => str.toUpperCase());
                  
                return (
                  <button
                    key={key}
                    onClick={() => setLayers(prev => ({ ...prev, [key]: !val }))}
                    className={`w-full flex items-center justify-between py-1 px-2 rounded-lg transition-all text-left text-[10px] font-sans font-medium cursor-pointer ${theme.id === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                  >
                    <span className={val ? (theme.id === 'dark' ? "text-zinc-200" : "text-zinc-900") : "text-zinc-500"}>{label}</span>
                    {val ? (
                      <Eye className="w-3 h-3 text-purple-400" />
                    ) : (
                      <EyeOff className={`w-3 h-3 ${theme.id === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <button
          onClick={() => setIsLayersOpen(!isLayersOpen)}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md border transition-all cursor-pointer ${
            isLayersOpen 
              ? "bg-purple-600 border-purple-400 text-white" 
              : theme.id === 'dark'
                ? "bg-zinc-950/95 border-zinc-800 text-zinc-300 hover:text-zinc-100"
                : "bg-white/95 border-zinc-200 text-zinc-700 hover:text-zinc-900"
          }`}
          title="Toggle Map Layers"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* 5. DISTRICT DETAILS CARD OVERLAY (RIGHT INTERACTIVE BAR) */}
      {selectedDistrict && (
        <div className={`absolute top-20 right-4 bottom-4 w-80 sm:w-96 backdrop-blur-md border rounded-2xl shadow-2xl z-45 overflow-y-auto p-5 space-y-4 ${theme.id === 'dark' ? 'bg-zinc-950/95 border-zinc-800 text-zinc-300' : 'bg-white/95 border-zinc-200 text-zinc-700'}`}>
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
            <div>
              <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest block">GIS District Hub</span>
              <h3 className="text-sm font-bold font-sans tracking-wide text-zinc-100 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: "12s" }} /> {selectedDistrict.name}
              </h3>
            </div>
            <button
              onClick={() => {
                setSelectedDistrict(null);
                setSelectedCityFilter("All");
              }}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* District Metrics Info */}
          {(() => {
            const stats = districtCrimeStats[selectedDistrict.id] || { total: 0, active: 0, closed: 0 };
            return (
              <>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-zinc-900/60 border border-purple-500/10 rounded-xl">
                    <div className="text-lg font-bold font-mono text-purple-300">{stats.total}</div>
                    <div className="text-[8px] font-sans text-zinc-500 uppercase font-bold">Total FIRs</div>
                  </div>
                  <div className="p-3 bg-zinc-900/60 border border-purple-500/10 rounded-xl">
                    <div className="text-lg font-bold font-mono text-amber-400">{stats.active}</div>
                    <div className="text-[8px] font-sans text-zinc-500 uppercase font-bold">Active Cases</div>
                  </div>
                </div>

                <div className="p-4 bg-purple-950/10 border border-purple-500/10 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center py-0.5 border-b border-purple-500/5">
                    <span className="text-zinc-500 font-sans">Crime Rate Index</span>
                    <span className="font-bold text-zinc-100">{selectedDistrict.crimeRateIndex}/100</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-purple-500/5">
                    <span className="text-zinc-500 font-sans">Most Common Crime</span>
                    <span className="font-bold text-zinc-100">{selectedDistrict.commonCrime}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-purple-500/5">
                    <span className="text-zinc-500 font-sans">Precincts & Stations</span>
                    <span className="font-bold text-zinc-100">{selectedDistrict.policeStations.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-purple-500/5">
                    <span className="text-zinc-500 font-sans">Hotspot Flag</span>
                    <span className={`font-bold ${selectedDistrict.crimeRateIndex > 60 ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
                      {selectedDistrict.crimeRateIndex > 60 ? "HIGH RISK" : "NORMAL"}
                    </span>
                  </div>
                </div>

                {/* Sub-locations list */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase font-sans tracking-wide">Precinct Stations & Landmarks</h4>
                  <div className="space-y-1 text-xs">
                    {selectedDistrict.policeStations.map((ps, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-zinc-900/40 border border-zinc-900">
                        <Shield className="w-3 h-3 text-purple-400" />
                        <span className="font-mono text-[10px] text-zinc-300">{ps}</span>
                      </div>
                    ))}
                    {selectedDistrict.landmarks.map((lm, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-zinc-900/40 border border-zinc-900">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        <span className="font-mono text-[10px] text-zinc-300">{lm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCityFilter(selectedDistrict.name);
                    setActiveTab("dashboard");
                  }}
                  className="w-full py-2.5 mt-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] uppercase shadow-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> View Dashboard Analytics
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* 6. CASE INFORMATION CARD OVERLAY (ON CASE PIN CLICK) */}
      {selectedCase && !selectedDistrict && (
        <div className={`absolute top-20 right-4 bottom-4 w-80 sm:w-96 backdrop-blur-md border rounded-2xl shadow-2xl z-45 overflow-y-auto p-5 space-y-4 ${theme.id === 'dark' ? 'bg-zinc-950/95 border-zinc-800 text-zinc-300' : 'bg-white/95 border-zinc-200 text-zinc-700'}`}>
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
            <div>
              <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest block">Geographical Incident file</span>
              <h3 className="text-xs font-bold font-mono tracking-wide text-zinc-100 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-purple-400" /> {selectedCase.fir_number}
              </h3>
            </div>
            <button
              onClick={() => setSelectedCase(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-purple-500/5">
              <span className="text-zinc-500 font-sans">Crime Type</span>
              <span className="font-bold text-zinc-100">{selectedCase.crime_head}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-purple-500/5">
              <span className="text-zinc-500 font-sans">Precinct Station</span>
              <span className="font-bold text-zinc-100">{selectedCase.police_station}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-purple-500/5">
              <span className="text-zinc-500 font-sans">Case Officer</span>
              <span className="font-bold text-zinc-100 flex items-center gap-1"><User className="w-3 h-3 text-zinc-500" /> {selectedCase.officer}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-purple-500/5">
              <span className="text-zinc-500 font-sans">Status</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] border ${selectedCase.status === "Closed" ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>{selectedCase.status}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-purple-500/5">
              <span className="text-zinc-500 font-sans">Suspect(s)</span>
              <span className="font-bold text-zinc-100 text-right truncate max-w-[160px]">{selectedCase.accused.join(", ") || "None"}</span>
            </div>
          </div>

          <div className="p-3 bg-zinc-900/60 border border-purple-500/10 rounded-xl space-y-1.5">
            <div className="text-[8px] font-sans text-zinc-500 uppercase font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Incident Context</div>
            <p className="text-[10px] text-zinc-300 font-mono leading-relaxed">{selectedCase.description}</p>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setGraphCases([selectedCase]);
                setActiveSuspect(selectedCase.accused[0] || null);
                setActiveTab("network");
              }}
              className="flex-1 py-2 rounded-xl border border-purple-500/25 hover:bg-purple-500/10 text-zinc-200 font-bold text-[10px] uppercase transition-all text-center"
            >
              Analyze Relations
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("cases");
              }}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] uppercase shadow-lg transition-colors flex items-center justify-center gap-1"
            >
              Open Full Case <CheckCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 7. RADAR SWEEP SCANNING HUD DISPLAY */}
      <div className="absolute bottom-6 right-6 z-40 p-3 rounded-full border border-purple-500/20 bg-black/90 shadow-lg backdrop-blur-md text-[10px] font-mono flex items-center gap-3 text-zinc-400 pointer-events-none">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping"></span> GIS SCAN ENGINE: STANDBY</span>
        <span className="border-l border-zinc-800 h-3"></span>
        <span>LAYERS ACTIVE</span>
      </div>

    </div>
  );
}
