import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, Link, FileText, MapPin, Network, Shield, AlertTriangle
} from "lucide-react";
import type { Theme, Case } from "../types";
import * as d3 from "d3";

interface CriminalConnectionsProps {
  cases: Case[];
  currentTheme: Theme;
  onSelectCase: (c: Case) => void;
  onNavigateToNetwork: (entity: string) => void;
  onNavigateToMap: (location: string) => void;
}

export const CriminalConnections: React.FC<CriminalConnectionsProps> = ({ 
  cases, 
  currentTheme, 
  onSelectCase, 
  onNavigateToNetwork, 
  onNavigateToMap 
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute people with multiple cases
  const multiCasePersons = useMemo(() => {
    const personMap = new Map<string, Case[]>();
    cases.forEach(c => {
      (c.accused || []).forEach(a => {
        if (!personMap.has(a)) personMap.set(a, []);
        personMap.get(a)!.push(c);
      });
    });
    
    return Array.from(personMap.entries())
      .filter(([name, personCases]) => personCases.length > 1)
      .map(([name, personCases]) => ({
        id: name,
        name,
        cases: personCases
      }))
      .sort((a, b) => b.cases.length - a.cases.length);
  }, [cases]);

  const rawQuery = searchQuery.trim().toLowerCase();
  
  const filteredPersons = !rawQuery
    ? multiCasePersons
    : multiCasePersons.filter(p => p.name.toLowerCase().includes(rawQuery));

  // D3 Network Graph
  useEffect(() => {
    if (!selectedPerson || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 400; // Fixed height for visualization

    const nodes: any[] = [{ id: selectedPerson.name, group: "person", label: selectedPerson.name }];
    const links: any[] = [];

    // Add unique cases and locations
    const caseNodes = new Set<string>();
    const locationNodes = new Set<string>();

    selectedPerson.cases.forEach((c: Case) => {
      if (!caseNodes.has(c.fir_number)) {
        caseNodes.add(c.fir_number);
        nodes.push({ id: c.fir_number, group: "case", label: c.fir_number });
        links.push({ source: selectedPerson.name, target: c.fir_number, type: "involved_in" });
      }

      if (c.location && !locationNodes.has(c.location)) {
        locationNodes.add(c.location);
        nodes.push({ id: c.location, group: "location", label: c.location });
        links.push({ source: c.fir_number, target: c.location, type: "occurred_at" });
      }
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(50));

    // Links
    const link = svg.append("g")
      .attr("stroke", currentTheme.id === 'dark' ? "#334155" : "#e2e8f0")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2);

    // Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "graph-node")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Helper for colors
    const getNodeColor = (group: string) => {
      if (group === "person") return "#ef4444"; // red
      if (group === "case") return "#3b82f6"; // blue
      return "#10b981"; // green
    };

    // Card background
    node.append("rect")
      .attr("class", "node-bg")
      .attr("x", -50).attr("y", -18)
      .attr("width", 100).attr("height", 36)
      .attr("rx", 6).attr("ry", 6)
      .attr("fill", currentTheme.id === "dark" ? "#0f172a" : "#ffffff")
      .attr("stroke", (d: any) => getNodeColor(d.group))
      .attr("stroke-width", 1.2)
      .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.25))");

    // Sidebar accent bar
    node.append("rect")
      .attr("x", -50).attr("y", -18)
      .attr("width", 4).attr("height", 36)
      .attr("rx", 1)
      .attr("fill", (d: any) => getNodeColor(d.group));

    // Risk dot
    node.append("circle")
      .attr("cx", 42).attr("cy", -10).attr("r", 3.5)
      .attr("fill", (d: any) => getNodeColor(d.group));

    // Category icon
    node.append("text")
      .attr("x", -34).attr("y", 4)
      .attr("text-anchor", "middle").attr("font-size", "12px")
      .text((d: any) => {
        if (d.group === "person") return "👤";
        if (d.group === "case") return "📂";
        return "📍";
      });

    // Node label
    node.append("text")
      .attr("x", -22).attr("y", -2)
      .attr("text-anchor", "start")
      .attr("font-size", "8.5px").attr("font-weight", "bold")
      .attr("fill", currentTheme.id === "dark" ? "#f1f5f9" : "#1e293b")
      .text((d: any) => {
        const lbl = d.label;
        return lbl.length > 12 ? lbl.slice(0, 10) + ".." : lbl;
      });

    // Node type label
    node.append("text")
      .attr("x", -22).attr("y", 9)
      .attr("text-anchor", "start")
      .attr("font-size", "7px").attr("font-weight", "500")
      .attr("fill", currentTheme.id === "dark" ? "#94a3b8" : "#475569")
      .text((d: any) => {
        if (d.group === "person") return "Suspect";
        if (d.group === "case") return "Case File";
        return "Location";
      });

    node.append("title").text((d: any) => `${d.group.toUpperCase()}: ${d.label}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => Math.max(50, Math.min(width - 50, d.source.x)))
        .attr("y1", (d: any) => Math.max(20, Math.min(height - 20, d.source.y)))
        .attr("x2", (d: any) => Math.max(50, Math.min(width - 50, d.target.x)))
        .attr("y2", (d: any) => Math.max(20, Math.min(height - 20, d.target.y)));

      node.attr("transform", (d: any) => {
        d.x = Math.max(50, Math.min(width - 50, d.x));
        d.y = Math.max(20, Math.min(height - 20, d.y));
        return `translate(${d.x},${d.y})`;
      });
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [selectedPerson, currentTheme]);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 w-full">
      {/* Search Panel */}
      <div className={`lg:w-1/3 flex flex-col h-full border ${currentTheme.border} ${currentTheme.cardBg} rounded-2xl overflow-hidden shadow-lg`}>
        <div className="p-6 border-b border-slate-500/10">
          <div className="flex items-center gap-2 mb-4">
            <Link className={`w-6 h-6 ${currentTheme.textMain}`} />
            <h2 className={`text-xl font-bold ${currentTheme.textMain}`}>Criminal Connections</h2>
          </div>
          <p className={`text-xs ${currentTheme.textMuted} mb-4`}>
            Showing suspects involved in multiple distinct FIRs across the network.
          </p>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${currentTheme.textMuted}`} />
            <input
              type="text"
              placeholder="Search connected criminals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-transparent border ${currentTheme.border} rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 ${currentTheme.textMain} placeholder-slate-500 transition-colors`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-500/15 custom-scrollbar p-2">
          {filteredPersons.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              No multi-case individuals found
            </div>
          ) : (
            filteredPersons.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPerson(p)}
                className={`w-full text-left p-4 rounded-xl mb-1 hover:bg-slate-500/5 transition-all flex flex-col gap-1.5 cursor-pointer ${currentTheme.textMain} ${
                  selectedPerson?.id === p.id
                    ? (currentTheme.id === "dark" ? "bg-slate-800/60 border border-blue-500/50" : "bg-blue-50 border border-blue-600/50")
                    : "border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {p.name}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 text-blue-500 bg-blue-500/10`}>
                    {p.cases.length} CASES
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <span className="truncate">Active in: {p.cases.map((c: any) => c.police_station).filter((v: any, i: any, a: any) => a.indexOf(v) === i).join(", ")}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Details Panel */}
      <div className={`lg:flex-1 border ${currentTheme.border} ${currentTheme.cardBg} rounded-2xl p-6 flex flex-col overflow-y-auto shadow-lg ${currentTheme.textMain} custom-scrollbar`}>
        {selectedPerson ? (
          <div className="space-y-6">
            <div className="border-b border-slate-500/10 pb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-xl bg-red-500/20 text-red-500`}>
                    <Shield className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPerson.name}</h2>
                    <p className={`text-sm ${currentTheme.textMuted} font-mono mt-1`}>
                      Multiple Case Suspect (MCS) Profile
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => onNavigateToNetwork(selectedPerson.name)}
                className={`px-4 py-2 rounded-lg text-xs font-bold ${currentTheme.accentBg} transition-colors flex items-center gap-2`}
              >
                <Network className="w-4 h-4" /> View in Network Map
              </button>
            </div>

            {/* D3 Visualization */}
            <div className={`rounded-xl border ${currentTheme.border} overflow-hidden bg-slate-900/50`}>
              <div className="p-3 border-b border-slate-500/10 flex items-center gap-2">
                <Network className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">Multi-Case Relationship Network</h3>
              </div>
              <svg ref={svgRef} className="w-full h-[400px]" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${currentTheme.textMuted} mt-4`}>Associated Cases ({selectedPerson.cases.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPerson.cases.map((c: Case) => (
                  <div key={c.id} className={`p-4 rounded-xl border ${currentTheme.border} bg-slate-500/5 hover:bg-slate-500/10 transition-colors`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-blue-500 text-sm">{c.fir_number}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        c.status === "Closed" ? "border-emerald-500/30 text-emerald-500" : "border-amber-500/30 text-amber-500"
                      }`}>{c.status}</span>
                    </div>
                    <p className="text-xs font-semibold mb-2 line-clamp-1">{c.crime_head}</p>
                    <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.location || c.police_station}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {c.date_of_registration}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={() => onSelectCase(c)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${currentTheme.border} hover:bg-blue-500/10 transition-colors text-center`}
                      >
                        View Case
                      </button>
                      <button 
                        onClick={() => (c.location || c.district) && onNavigateToMap(c.location || c.district)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${currentTheme.border} hover:bg-emerald-500/10 transition-colors text-center`}
                      >
                        Map
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
            <Link className="w-16 h-16 opacity-20" />
            <p className="text-sm font-medium">Select a suspect to view their multi-case connections</p>
          </div>
        )}
      </div>
    </div>
  );
};
