import React, { useState } from "react";
import { Search, Filter, FileText, Phone, MapPin, Calendar, Briefcase, ChevronRight, X } from "lucide-react";

export const CaseWorkspace = ({ cases, currentTheme, selectedCase, onSelectCase }: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredCases = cases.filter((c: any) => {
    const matchesSearch = c.fir_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.crime_head.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-full gap-6 w-full relative">
      {/* Case List Section */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden ${selectedCase ? "hidden lg:flex" : ""}`}>
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Briefcase className={`w-6 h-6 ${currentTheme.textMain}`} />
            <h2 className={`text-xl font-bold ${currentTheme.textMain}`}>Case Files</h2>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${currentTheme.textMuted}`} />
              <input
                type="text"
                placeholder="Search cases, FIRs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg border bg-transparent outline-none focus:border-blue-500 ${currentTheme.border} ${currentTheme.textMain}`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border bg-transparent outline-none ${currentTheme.border} ${currentTheme.textMain}`}
            >
              <option value="all" className="bg-slate-900 text-white">All Status</option>
              <option value="investigation pending" className="bg-slate-900 text-white">Pending</option>
              <option value="charge sheet filed" className="bg-slate-900 text-white">Charge Sheet Filed</option>
              <option value="under investigation" className="bg-slate-900 text-white">Under Investigation</option>
            </select>
          </div>
        </div>

        {/* Case Cards */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {filteredCases.map((c: any) => (
            <div
              key={c.id}
              onClick={() => onSelectCase(c)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                selectedCase?.id === c.id
                  ? `border-blue-500 bg-blue-500/10`
                  : `${currentTheme.cardBg} ${currentTheme.border} hover:border-blue-500/50`
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                    c.status.toLowerCase().includes("pending") ? "bg-amber-500/20 text-amber-500" :
                    c.status.toLowerCase().includes("charge") ? "bg-emerald-500/20 text-emerald-500" :
                    "bg-blue-500/20 text-blue-500"
                  }`}>
                    {c.status.toUpperCase()}
                  </span>
                  <span className={`text-xs font-mono font-medium ${currentTheme.textMuted}`}>{c.date_of_registration}</span>
                </div>
                <h3 className={`font-bold text-sm mb-1 ${currentTheme.textMain}`}>{c.fir_number}</h3>
                <p className={`text-xs mb-2 ${currentTheme.textMuted} line-clamp-1`}>{c.crime_head} - {c.description}</p>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] flex items-center gap-1 ${currentTheme.textMuted}`}>
                    <MapPin className="w-3 h-3" /> {c.police_station}
                  </span>
                  <span className={`text-[10px] flex items-center gap-1 ${currentTheme.textMuted}`}>
                    <Calendar className="w-3 h-3" /> {c.date_of_offence}
                  </span>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 opacity-50 ${currentTheme.textMuted}`} />
            </div>
          ))}
          {filteredCases.length === 0 && (
            <div className={`p-8 text-center text-sm ${currentTheme.textMuted}`}>
              No cases found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Details Panel */}
      {selectedCase && (
        <div className={`absolute inset-0 lg:relative w-full lg:w-96 flex-shrink-0 flex flex-col h-full rounded-xl border ${currentTheme.cardBg} ${currentTheme.border}`}>
          <div className={`p-4 border-b flex justify-between items-center ${currentTheme.border}`}>
            <h3 className={`font-bold ${currentTheme.textMain}`}>Case Details</h3>
            <button onClick={() => onSelectCase(null)} className={`p-1 rounded-md hover:bg-white/10 ${currentTheme.textMuted}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            <div>
              <p className={`text-xs ${currentTheme.textMuted} mb-1`}>FIR Number</p>
              <p className={`text-lg font-bold font-mono ${currentTheme.textMain}`}>{selectedCase.fir_number}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${currentTheme.textMuted} mb-1`}>Status</p>
                <p className={`text-sm font-medium ${currentTheme.textMain}`}>{selectedCase.status}</p>
              </div>
              <div>
                <p className={`text-xs ${currentTheme.textMuted} mb-1`}>Crime Head</p>
                <p className={`text-sm font-medium ${currentTheme.textMain}`}>{selectedCase.crime_head}</p>
              </div>
              <div>
                <p className={`text-xs ${currentTheme.textMuted} mb-1`}>Date of Offence</p>
                <p className={`text-sm font-medium ${currentTheme.textMain}`}>{selectedCase.date_of_offence}</p>
              </div>
              <div>
                <p className={`text-xs ${currentTheme.textMuted} mb-1`}>Police Station</p>
                <p className={`text-sm font-medium ${currentTheme.textMain}`}>{selectedCase.police_station}</p>
              </div>
            </div>
            
            <div className={`pt-4 border-t ${currentTheme.border}`}>
              <p className={`text-xs ${currentTheme.textMuted} mb-1`}>Description</p>
              <p className={`text-sm ${currentTheme.textMain}`}>{selectedCase.description}</p>
            </div>

            <div className={`pt-4 border-t space-y-2 ${currentTheme.border}`}>
              <p className={`text-xs ${currentTheme.textMuted} mb-2 uppercase tracking-wider`}>Entities</p>
              {selectedCase.accused?.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-medium w-20 text-red-400">Accused:</span>
                  <span className={currentTheme.textMain}>{selectedCase.accused.join(", ")}</span>
                </div>
              )}
              {selectedCase.phone_numbers?.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-medium w-20 text-amber-400">Phones:</span>
                  <span className={currentTheme.textMain}>{selectedCase.phone_numbers.join(", ")}</span>
                </div>
              )}
              {selectedCase.vehicles?.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-medium w-20 text-green-400">Vehicles:</span>
                  <span className={currentTheme.textMain}>{selectedCase.vehicles.join(", ")}</span>
                </div>
              )}
            </div>

            <div className={`pt-6 mt-6 border-t space-y-2 ${currentTheme.border}`}>
              <p className={`text-xs ${currentTheme.textMuted} mb-2 uppercase tracking-wider`}>Actions</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => onNavigateToNetwork && onNavigateToNetwork(selectedCase.fir_number)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${currentTheme.accentBg} transition-colors`}
                >
                  View Network
                </button>
                <button 
                  onClick={() => onNavigateToMap && onNavigateToMap(selectedCase.fir_number)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  View on Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
