import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, MapPin, Calendar, Shield, ExternalLink, Network, User, AlertTriangle, Link, FileText, Users, Briefcase, Database
} from "lucide-react";
import type { Theme, Case } from "../types";
import * as d3 from "d3";
import { MobileIntelligencePanel } from "./MobileIntelligencePanel";

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
  const [activeTab, setActiveTab] = useState<"overview" | "cases" | "associates" | "addresses" | "vehicles">("overview");
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
      .filter(([name, personCases]: any) => personCases.length > 1)
      .map(([name, personCases]: any) => ({
        id: name,
        name,
        cases: personCases
      }))
      .sort((a: any, b: any) => b.cases.length - a.cases.length);
  }, [cases]);

  const rawQuery = searchQuery.trim().toLowerCase();
  
  const filteredPersons = !rawQuery
    ? multiCasePersons
    : multiCasePersons.filter((p: any) => p.name.toLowerCase().includes(rawQuery));

  // D3 Network Graph for Associates tab
  useEffect(() => {
    if (activeTab !== "associates" || !selectedPerson || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 400; // Fixed height for visualization

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous graph

    // Prepare graph data
    const nodes: any[] = [];
    const links: any[] = [];

    // Add central suspect
    nodes.push({
      id: selectedPerson.name,
      label: selectedPerson.name,
      type: "suspect",
      group: 0
    });

    // Add cases and locations
    selectedPerson.cases.forEach((c: any) => {
      const caseId = `case-${c.id}`;
      nodes.push({
        id: caseId,
        label: c.fir_number,
        type: "case",
        group: 1
      });
      links.push({
        source: selectedPerson.name,
        target: caseId,
        type: "involved_in"
      });

      if (c.location) {
        const locId = `loc-${c.location}`;
        if (!nodes.find(n => n.id === locId)) {
          nodes.push({
            id: locId,
            label: c.location,
            type: "location",
            group: 2
          });
        }
        links.push({
          source: caseId,
          target: locId,
          type: "occurred_at"
        });
      }
    });

    // Simulation setup
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    // Draw links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", currentTheme.id === "dark" ? "#475569" : "#cbd5e1")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6);

    // Draw nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .call(d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node rectangles
    node.append("rect")
      .attr("width", 140)
      .attr("height", 40)
      .attr("x", -70)
      .attr("y", -20)
      .attr("rx", 6)
      .attr("fill", currentTheme.id === "dark" ? "#1e293b" : "#f8fafc")
      .attr("stroke", (d: any) => {
        if (d.type === "suspect") return "#ef4444"; // red
        if (d.type === "case") return "#3b82f6"; // blue
        return "#10b981"; // green
      })
      .attr("stroke-width", 1.5);
    
    // Node left border accent
    node.append("rect")
      .attr("width", 4)
      .attr("height", 40)
      .attr("x", -70)
      .attr("y", -20)
      .attr("rx", 2)
      .attr("fill", (d: any) => {
        if (d.type === "suspect") return "#ef4444";
        if (d.type === "case") return "#3b82f6";
        return "#10b981";
      });

    // Icons
    node.append("text")
      .attr("x", -55)
      .attr("y", 5)
      .attr("font-family", "FontAwesome")
      .attr("font-size", "12px")
      .attr("fill", (d: any) => {
        if (d.type === "suspect") return "#ef4444";
        if (d.type === "case") return "#3b82f6";
        return "#10b981";
      })
      .text((d: any) => {
        if (d.type === "suspect") return "\uf007"; // fa-user
        if (d.type === "case") return "\uf07b"; // fa-folder
        return "\uf041"; // fa-map-marker
      });

    // Labels
    node.append("text")
      .attr("x", -35)
      .attr("y", -2)
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", currentTheme.id === "dark" ? "#f8fafc" : "#0f172a")
      .text((d: any) => d.label.length > 15 ? d.label.substring(0, 15) + "..." : d.label);
    
    // Sub-labels
    node.append("text")
      .attr("x", -35)
      .attr("y", 10)
      .attr("font-size", "8px")
      .attr("fill", currentTheme.id === "dark" ? "#94a3b8" : "#64748b")
      .text((d: any) => {
        if (d.type === "suspect") return "Suspect";
        if (d.type === "case") return "Case File";
        return "Location";
      });

    // Connection indicator
    node.append("circle")
      .attr("cx", 60)
      .attr("cy", -10)
      .attr("r", 3)
      .attr("fill", (d: any) => {
        if (d.type === "suspect") return "#ef4444";
        if (d.type === "case") return "#3b82f6";
        return "#10b981";
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [selectedPerson, currentTheme, activeTab]);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 w-full">
      {/* Suspect Search Panel */}
      <div className={`lg:w-1/3 flex flex-col h-full border ${currentTheme.border} ${currentTheme.cardBg} rounded-2xl overflow-hidden shadow-lg`}>
        <div className="p-6 border-b border-slate-500/10">
          <div className="flex items-center gap-2 mb-4">
            <Users className={`w-6 h-6 ${currentTheme.textMain}`} />
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

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {filteredPersons.length === 0 ? (
            <div className={`p-8 text-center text-sm ${currentTheme.textMuted}`}>
              No multi-case individuals found
            </div>
          ) : (
            filteredPersons.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedPerson(p)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                  selectedPerson?.id === p.id
                    ? "border-blue-500 bg-blue-500/10"
                    : `${currentTheme.cardBg} ${currentTheme.border} hover:border-blue-500/50`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold flex items-center gap-2 ${currentTheme.textMain}`}>
                    <User className="w-4 h-4" />
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

      {/* Profile Details Panel */}
      <div className={`lg:flex-1 border ${currentTheme.border} ${currentTheme.cardBg} rounded-2xl flex flex-col overflow-hidden shadow-lg ${currentTheme.textMain}`}>
        {selectedPerson ? (
          <div className="flex flex-col h-full">
            
            {/* Profile Header */}
            <div className="p-6 border-b border-slate-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full bg-slate-500/10 border ${currentTheme.border} flex items-center justify-center flex-shrink-0`}>
                  <User className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedPerson.name}</h2>
                  <p className={`text-sm ${currentTheme.textMuted} mt-1 flex flex-wrap items-center gap-2`}>
                    <span className="truncate">Karnataka</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-wider font-bold mb-1`}>Total Cases</div>
                  <div className="text-xl font-bold">{selectedPerson.cases.length}</div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-wider font-bold mb-1`}>Arrests</div>
                  <div className="text-xl font-bold">{selectedPerson.cases.filter((c: any) => c.status === "Closed" || c.status === "Chargesheeted").length}</div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-wider font-bold mb-1`}>Known Associates</div>
                  <div className="text-xl font-bold">Multiple</div>
                </div>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className={`flex items-center gap-6 px-6 border-b border-slate-500/10 ${currentTheme.textMuted} text-sm font-bold bg-black/10 overflow-x-auto custom-scrollbar`}>
              {["overview", "cases", "associates", "addresses", "vehicles"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-3 pt-4 uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab ? "border-blue-500 text-blue-500" : "border-transparent hover:text-slate-400"
                  }`}
                >
                  {tab === "cases" ? `Linked Cases (${selectedPerson.cases.length})` : tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Demographics Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border ${currentTheme.border} bg-slate-500/5`}>
                      <div className="flex items-center gap-2 mb-4 text-slate-500">
                        <User className="w-4 h-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">Demographics</h3>
                      </div>
                      <div className="space-y-3">
                        <div className={`text-sm ${currentTheme.textMuted} italic`}>
                          No demographic data available for this record.
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${currentTheme.border} bg-slate-500/5`}>
                      <div className="flex items-center justify-between mb-4 text-slate-500">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          <h3 className="text-xs font-bold uppercase tracking-wider">Top Cases</h3>
                        </div>
                        <button 
                          onClick={() => setActiveTab("cases")}
                          className="text-[10px] font-bold text-blue-500 uppercase hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      <div className="space-y-3">
                        {selectedPerson.cases.slice(0, 3).map((c: any, i: number) => (
                          <div key={i} className="flex justify-between items-center border-b border-slate-500/10 pb-2 last:border-0 last:pb-0">
                            <span className={`text-xs ${currentTheme.textMuted}`}>{c.fir_number}</span>
                            <span className="text-xs font-bold">{c.crime_head}</span>
                            <span className="text-xs">{c.date_of_registration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Intelligence Panel */}
                  <MobileIntelligencePanel 
                    personName={selectedPerson.name}
                    cases={selectedPerson.cases} 
                    currentTheme={currentTheme} 
                    onNavigateToMap={onNavigateToMap}
                    onNavigateToNetwork={onNavigateToNetwork}
                    onSelectCase={onSelectCase}
                  />
                </div>
              )}

              {activeTab === "cases" && (
                <div className={`rounded-xl border ${currentTheme.border} overflow-hidden`}>
                  <table className="w-full text-left text-sm">
                    <thead className={`bg-slate-500/10 ${currentTheme.textMuted} text-xs uppercase tracking-wider`}>
                      <tr>
                        <th className="px-4 py-3 font-bold">FIR No.</th>
                        <th className="px-4 py-3 font-bold">Category</th>
                        <th className="px-4 py-3 font-bold">Police Station</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/10">
                      {selectedPerson.cases.map((c: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-500/5 transition-colors">
                          <td className="px-4 py-3 font-bold text-blue-400">{c.fir_number}</td>
                          <td className="px-4 py-3">{c.crime_head}</td>
                          <td className="px-4 py-3">{c.police_station}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              c.status === "Closed" ? "border-emerald-500/30 text-emerald-500" : "border-amber-500/30 text-amber-500"
                            }`}>{c.status}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{c.date_of_registration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "associates" && (
                <div className={`rounded-xl border ${currentTheme.border} overflow-hidden bg-slate-900/50 flex flex-col h-full min-h-[450px]`}>
                  <div className="p-3 border-b border-slate-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-slate-500" />
                      <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">Multi-Case Relationship Network</h3>
                    </div>
                    <button 
                      onClick={() => onNavigateToNetwork(selectedPerson.name)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold border ${currentTheme.border} hover:bg-slate-500/10 transition-colors flex items-center gap-2 uppercase tracking-wider`}
                    >
                      <ExternalLink className="w-3 h-3" /> Full Screen
                    </button>
                  </div>
                  <div className="flex-1 relative w-full h-[400px]">
                    <svg ref={svgRef} className="w-full h-full absolute inset-0" />
                  </div>
                </div>
              )}

              {(activeTab === "addresses" || activeTab === "vehicles") && (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-4">
                  <Database className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">No {activeTab} currently recorded in system.</p>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
            <Users className="w-16 h-16 opacity-20" />
            <p className="text-lg font-medium">Select a suspect record to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};
