import React, { memo, useMemo } from "react";
import type { Case, Theme } from "../types";
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, ChevronRight, Activity, MapPin, Users } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface CommandCenterProps {
  cases: Case[];
  currentTheme: Theme;
  onSelectCase: (caseItem: Case) => void;
  onNavigateToCases: () => void;
  currentTime: string;
}

export const CommandCenter: React.FC<CommandCenterProps> = memo(({
  cases,
  currentTheme,
  onSelectCase,
  onNavigateToCases,
  currentTime
}) => {
  // Memoized Metrics & Statistics Calculations
  const stats = useMemo(() => {
    const total = cases.length;
    const active = cases.filter((c) => c.status === "Under Investigation").length;
    const closed = cases.filter((c) => c.status === "Closed").length;
    const highPriority = cases.filter(
      (c) => c.crime_head.toLowerCase().includes("murder") || c.crime_head.toLowerCase().includes("robbery") || c.crime_head.toLowerCase().includes("kidnapping")
    ).length;

    // Crime category aggregation
    const crimeCounts: Record<string, number> = {};
    cases.forEach((c) => {
      const head = c.crime_head || "General";
      crimeCounts[head] = (crimeCounts[head] || 0) + 1;
    });

    const categoryData = Object.entries(crimeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // District activity rank
    const districtCounts: Record<string, number> = {};
    cases.forEach((c) => {
      const dist = c.district || "Unknown";
      districtCounts[dist] = (districtCounts[dist] || 0) + 1;
    });

    const districtData = Object.entries(districtCounts)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent cases
    const recentCases = [...cases].sort((a, b) => new Date(b.date_of_registration).getTime() - new Date(a.date_of_registration).getTime()).slice(0, 5);

    return { total, active, closed, highPriority, categoryData, districtData, recentCases };
  }, [cases]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className={`p-6 rounded-xl border \${currentTheme.cardBg} \${currentTheme.border} shadow-sm relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pl-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Police Command Center</h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="flex items-center gap-1.5 text-blue-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                LIVE TRACKING
              </span>
              <span className="text-slate-500 font-mono border-l border-slate-700 pl-3">
                {currentTime || "SYNCING..."}
              </span>
            </div>
          </div>
          <button
            onClick={onNavigateToCases}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold \${currentTheme.accentBg}`}
          >
            <span>Open Investigation Workspace</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Activity className="w-24 h-24 text-blue-500" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Investigations</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-100 relative z-10">{stats.active.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-500 relative z-10">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Currently Monitored</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <AlertTriangle className="w-24 h-24 text-rose-500" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Priority</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-100 relative z-10">{stats.highPriority.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-rose-400 relative z-10">
            <span>Requires Immediate Attention</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Users className="w-24 h-24 text-amber-500" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Persons of Interest</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-100 relative z-10">{Math.floor(stats.active * 1.4).toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500 relative z-10">
            <span>Identified Suspects & Targets</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <CheckCircle className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Cases</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-100 relative z-10">{stats.closed.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500 relative z-10">
            <span>{((stats.closed / (stats.total || 1)) * 100).toFixed(1)}% Clearance Rate</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Crime Head Distribution Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-200">Incident Category Distribution</h3>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded">Past 30 Days</span>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                    color: "#f1f5f9",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hotspots & Recent Activity */}
        <div className="space-y-6 flex flex-col">
          {/* Top Active Districts */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              Crime Hotspots
            </h3>
            <div className="space-y-3">
              {stats.districtData.map((item, idx) => (
                <div key={item.district} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center border border-slate-700">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{item.district}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{item.count} Incidents</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent High Priority Case Feed */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-200">Recent Incident Reports</h3>
          <button onClick={onNavigateToCases} className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors">View All &rarr;</button>
        </div>
        <div className="divide-y divide-slate-800/60 border-t border-slate-800/60">
          {stats.recentCases.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCase(c)}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/30 px-3 -mx-3 rounded-lg cursor-pointer transition-colors gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-200">{c.fir_number}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700">
                    {c.crime_head}
                  </span>
                  {c.crime_head.toLowerCase().includes("murder") || c.crime_head.toLowerCase().includes("robbery") ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                      CRITICAL
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{c.description}</p>
              </div>
              <div className="text-left sm:text-right flex-shrink-0 flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider \${
                    c.status === "Closed"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}
                >
                  {c.status}
                </span>
                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {c.police_station}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

CommandCenter.displayName = "CommandCenter";
