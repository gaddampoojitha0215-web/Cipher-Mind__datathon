import React, { useState } from "react";
import { 
  Search, Shield, User, FileText, MapPin, Briefcase, Network, Users, Phone, Navigation, Database
} from "lucide-react";
import type { Theme } from "../types";
import { MobileIntelligencePanel } from "./MobileIntelligencePanel";

interface VictimIntelligenceProps {
  cases: any[];
  currentTheme: Theme;
  onSelectCase: (c: any) => void;
  onNavigateToNetwork: (entity: string) => void;
  onNavigateToMap: (location: string) => void;
}

export const VictimIntelligence: React.FC<VictimIntelligenceProps> = ({ 
  cases, 
  currentTheme, 
  onSelectCase, 
  onNavigateToNetwork, 
  onNavigateToMap 
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "cases" | "statements" | "documents">("overview");

  const rawQuery = searchQuery.trim().toLowerCase();
  
  const filteredCases = !rawQuery
    ? cases
    : cases.filter(c => {
        return (
          (c.fir_number?.toLowerCase() || "").includes(rawQuery) ||
          (c.crime_head?.toLowerCase() || "").includes(rawQuery) ||
          (c.location?.toLowerCase() || "").includes(rawQuery) ||
          (c.description?.toLowerCase() || "").includes(rawQuery)
        );
      });

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 w-full">
      {/* Victim Search Panel */}
      <div className={`lg:w-1/3 flex flex-col h-full border ${currentTheme.border} ${currentTheme.cardBg} rounded-2xl overflow-hidden shadow-lg`}>
        <div className="p-6 border-b border-slate-500/10">
          <div className="flex items-center gap-2 mb-4">
            <Users className={`w-6 h-6 ${currentTheme.textMain}`} />
            <h2 className={`text-xl font-bold ${currentTheme.textMain}`}>Victim Intelligence</h2>
          </div>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${currentTheme.textMuted}`} />
            <input
              type="text"
              placeholder="Search victim records, FIRs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-transparent border ${currentTheme.border} rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 ${currentTheme.textMain} placeholder-slate-500 transition-colors`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-500/15 custom-scrollbar p-2">
          {filteredCases.length === 0 ? (
            <div className={`p-8 text-center text-sm ${currentTheme.textMuted}`}>
              No victim records found
            </div>
          ) : (
            filteredCases.slice(0, 50).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`w-full p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                  selectedCase?.id === c.id
                    ? "border-blue-500 bg-blue-500/10"
                    : `${currentTheme.cardBg} ${currentTheme.border} hover:border-blue-500/50`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold flex items-center gap-2 ${currentTheme.textMain}`}>
                    <User className="w-4 h-4" />
                    {c.fir_number}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    c.status === "Closed" ? "border-emerald-500/30 text-emerald-500" : "border-amber-500/30 text-amber-500"
                  }`}>{c.status}</span>
                </div>
                <h4 className="text-sm font-semibold">Victim of {c.crime_head}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{c.location}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Victim Profile Details */}
      <div className={`lg:flex-1 border ${currentTheme.border} ${currentTheme.cardBg} rounded-2xl flex flex-col overflow-hidden shadow-lg ${currentTheme.textMain}`}>
        {selectedCase ? (
          <div className="flex flex-col h-full">
            
            {/* Profile Header */}
            <div className="p-6 border-b border-slate-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full bg-slate-500/10 border ${currentTheme.border} flex items-center justify-center flex-shrink-0`}>
                  <User className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Victim Profile</h2>
                  <p className={`text-sm ${currentTheme.textMuted} mt-1 flex flex-wrap items-center gap-2`}>
                    <span>Gender: Not Recorded</span>
                    <span>&bull;</span>
                    <span>Age: Not Recorded</span>
                    <span>&bull;</span>
                    <span className="truncate">{selectedCase.district || "Unknown"}, Karnataka</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-wider font-bold mb-1`}>Total Cases</div>
                  <div className="text-xl font-bold">1</div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-wider font-bold mb-1`}>Last Case</div>
                  <div className="text-sm font-bold mt-1 whitespace-nowrap">{selectedCase.date_of_registration}</div>
                </div>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className={`flex items-center gap-6 px-6 border-b border-slate-500/10 ${currentTheme.textMuted} text-sm font-bold bg-black/10`}>
              {["overview", "cases", "statements", "documents"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-3 pt-4 uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === tab ? "border-blue-500 text-blue-500" : "border-transparent hover:text-slate-400"
                  }`}
                >
                  {tab === "cases" ? "Cases (1)" : tab}
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
                        <div>
                          <p className={`text-[10px] uppercase tracking-wider ${currentTheme.textMuted}`}>Phone</p>
                          <p className="text-sm font-medium">{selectedCase.phone_numbers && selectedCase.phone_numbers.length > 0 ? selectedCase.phone_numbers.join(", ") : "Not Recorded"}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase tracking-wider ${currentTheme.textMuted}`}>Address</p>
                          <p className="text-sm font-medium">{selectedCase.location || "Not Recorded"}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase tracking-wider ${currentTheme.textMuted}`}>Occupation</p>
                          <p className="text-sm font-medium text-slate-500 italic">Not Recorded in FIR</p>
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase tracking-wider ${currentTheme.textMuted}`}>ID Proof</p>
                          <p className="text-sm font-medium text-slate-500 italic">Not Recorded in FIR</p>
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${currentTheme.border} bg-slate-500/5`}>
                      <div className="flex items-center gap-2 mb-4 text-slate-500">
                        <Briefcase className="w-4 h-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">Recent Case Summary</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-500/10 pb-2">
                          <span className={`text-xs ${currentTheme.textMuted}`}>{selectedCase.fir_number}</span>
                          <span className="text-xs font-bold">{selectedCase.crime_head}</span>
                          <span className="text-xs">{selectedCase.date_of_registration}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Intelligence Panel */}
                  <MobileIntelligencePanel 
                    personName={`Victim in ${selectedCase.fir_number}`}
                    cases={[selectedCase]} 
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
                      <tr className="hover:bg-slate-500/5 transition-colors">
                        <td className="px-4 py-3 font-bold text-blue-400">{selectedCase.fir_number}</td>
                        <td className="px-4 py-3">{selectedCase.crime_head}</td>
                        <td className="px-4 py-3">{selectedCase.police_station}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            selectedCase.status === "Closed" ? "border-emerald-500/30 text-emerald-500" : "border-amber-500/30 text-amber-500"
                          }`}>{selectedCase.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{selectedCase.date_of_registration}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {(activeTab === "statements" || activeTab === "documents") && (
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
            <p className="text-lg font-medium">Select a victim record to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};
