import React, { useState } from "react";
import { 
  Search, Shield, User, FileText, MapPin, Briefcase, Network, Users
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
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              No matching victim records found
            </div>
          ) : (
            filteredCases.slice(0, 50).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`w-full text-left p-4 rounded-xl mb-1 hover:bg-slate-500/5 transition-all flex flex-col gap-1.5 cursor-pointer ${currentTheme.textMain} ${
                  selectedCase?.id === c.id
                    ? (currentTheme.id === "dark" ? "bg-slate-800/60 border border-fuchsia-500/50" : "bg-purple-50 border border-purple-600/50")
                    : "border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">Victim ID: {c.fir_number.split('/')[0] || "Unknown"}</span>
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
      <div className={`lg:flex-1 border ${currentTheme.border} ${currentTheme.cardBg} rounded-2xl p-6 flex flex-col overflow-y-auto shadow-lg ${currentTheme.textMain} custom-scrollbar`}>
        {selectedCase ? (
          <div className="space-y-6">
            <div className="border-b border-slate-500/10 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-3 rounded-xl ${currentTheme.id === 'dark' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-purple-100 text-purple-700'}`}>
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Victim Information</h2>
                  <p className={`text-sm ${currentTheme.textMuted} font-mono mt-1`}>Related Case: {selectedCase.fir_number}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 bg-slate-500/5 rounded-xl border ${currentTheme.border}`}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Incident Info
                </h3>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Crime Category:</strong> {selectedCase.crime_head}</p>
                  <p className="text-sm"><strong>Date Registered:</strong> {selectedCase.date_of_registration}</p>
                  <p className="text-sm"><strong>Status:</strong> {selectedCase.status}</p>
                </div>
              </div>

              <div className={`p-4 bg-slate-500/5 rounded-xl border ${currentTheme.border}`}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Location Connection
                </h3>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Location:</strong> {selectedCase.location}</p>
                  <p className="text-sm"><strong>Police Station:</strong> {selectedCase.police_station}</p>
                  <p className="text-sm"><strong>District:</strong> {selectedCase.district}</p>
                  <button 
                    onClick={() => onNavigateToMap(selectedCase.district)}
                    className="mt-3 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase flex items-center gap-1"
                  >
                    View on Map &rarr;
                  </button>
                </div>
              </div>
            </div>

            <div className={`p-4 bg-slate-500/5 rounded-xl border ${currentTheme.border}`}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Investigation Details</h3>
              <p className={`text-sm ${currentTheme.textMuted} leading-relaxed font-mono`}>{selectedCase.description}</p>
              <div className="mt-4 text-sm">
                <strong>Investigating Officer:</strong> {selectedCase.officer}
              </div>
            </div>

            <div className="border-t border-slate-500/10 pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Network className="w-4 h-4" /> Related People & Suspects
              </h3>
              
              {selectedCase.accused && selectedCase.accused.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedCase.accused.map((suspect: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => onNavigateToNetwork(suspect)}
                      className={`p-3 text-left bg-slate-500/5 hover:bg-slate-500/10 transition-colors border ${currentTheme.border} rounded-xl flex items-center gap-3 cursor-pointer`}
                    >
                      <User className={`w-4 h-4 ${currentTheme.id === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                      <div>
                        <div className="text-sm font-semibold">{suspect}</div>
                        <div className="text-[10px] text-slate-500 uppercase">Suspect</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-xl border border-dashed ${currentTheme.border} text-center text-sm ${currentTheme.textMuted}`}>
                  No suspects currently recorded for this victim's case.
                </div>
              )}
            </div>

            {selectedCase.phone_numbers?.length > 0 && (
              <MobileIntelligencePanel
                phones={selectedCase.phone_numbers}
                cases={cases}
                currentTheme={currentTheme}
                onNavigateToMap={onNavigateToMap}
                onNavigateToNetwork={onNavigateToNetwork}
                onSelectCase={onSelectCase}
              />
            )}

            <div className="border-t border-slate-500/10 pt-6">
               <button
                  onClick={() => onSelectCase(selectedCase)}
                  className={`w-full py-3 rounded-xl border ${currentTheme.border} ${currentTheme.id === 'dark' ? 'bg-[#E8F0FE] text-[#090C10]' : 'bg-[#1A182F] text-white'} font-bold uppercase tracking-wider text-xs transition-all hover:opacity-90 flex items-center justify-center gap-2 shadow-md`}
                >
                  <Briefcase className="w-4 h-4" />
                  View Full Case File
                </button>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20 text-slate-500 h-full">
            <div className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center flex-shrink-0 opacity-50 bg-slate-500/10">
              <Users className="w-8 h-8" />
            </div>
            <p className={`text-sm font-semibold ${currentTheme.id === 'dark' ? 'text-zinc-400' : 'text-zinc-650'}`}>
              Select a victim record to inspect related intelligence.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
