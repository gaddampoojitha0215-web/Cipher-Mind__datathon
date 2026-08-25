import React, { useState } from "react";
import { FileText, Camera, HardDrive, Search, Filter, Plus } from "lucide-react";
import { demoScenario } from "../data/demoScenario";

export const EvidenceManager = ({ currentTheme }: any) => {
  const [searchQuery, setSearchQuery] = useState("");

  const getIconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case "digital": return <HardDrive className="w-4 h-4 text-cyan-500" />;
      case "document": return <FileText className="w-4 h-4 text-purple-500" />;
      case "physical": return <Camera className="w-4 h-4 text-emerald-500" />;
      default: return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${currentTheme.textMain}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-sans">Evidence Management</h1>
          <p className={`text-sm ${currentTheme.textMuted} mt-1`}>Secure repository for case evidence and digital forensics</p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-all shadow-md ${currentTheme.id === "dark" ? "bg-[#E8F0FE] text-[#090C10] hover:bg-white" : "bg-[#1A182F] text-white hover:bg-black"}`}>
          <Plus className="w-4 h-4" /> Add Evidence
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search evidence by ID, case, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-transparent border ${currentTheme.border} rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 ${currentTheme.textMain} placeholder-slate-500`}
          />
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${currentTheme.border} text-xs font-bold uppercase hover:bg-slate-500/10 transition-colors`}>
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className={`border ${currentTheme.border} ${currentTheme.cardBg} rounded-2xl overflow-hidden shadow-lg`}>
        <table className="w-full text-left text-sm">
          <thead className={`border-b ${currentTheme.border} bg-slate-500/5`}>
            <tr>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-slate-500">ID</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-slate-500">Case Link</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-slate-500">Type</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-slate-500">Description</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-slate-500">Date Logged</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-500/10">
            {demoScenario.evidence.filter(ev => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return (ev.id?.toLowerCase() || "").includes(q) ||
                     (ev.case_id?.toLowerCase() || "").includes(q) ||
                     (ev.title?.toLowerCase() || "").includes(q) ||
                     (ev.description?.toLowerCase() || "").includes(q) ||
                     (ev.type?.toLowerCase() || "").includes(q);
            }).map(ev => (
              <tr key={ev.id} className="hover:bg-slate-500/5 transition-colors cursor-pointer">
                <td className="p-4 font-mono font-bold text-xs">{ev.id}</td>
                <td className="p-4 font-mono text-xs text-purple-500 font-bold">{ev.case_id}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${currentTheme.id === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
                    {getIconForType(ev.type)} {ev.type}
                  </span>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-sm">{ev.title}</div>
                  <div className={`text-xs ${currentTheme.textMuted} truncate max-w-xs mt-0.5`}>{ev.description}</div>
                </td>
                <td className="p-4 font-mono text-xs text-slate-500">{ev.date_added}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${ev.status === "Analyzed" ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10" : "border-amber-500/30 text-amber-500 bg-amber-500/10"}`}>
                    {ev.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
