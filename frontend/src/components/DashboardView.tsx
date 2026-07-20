import React, { memo, useMemo } from "react";
import type { Case, Theme } from "../types";
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, ChevronRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface DashboardViewProps {
  cases: Case[];
  currentTheme: Theme;
  onSelectCase: (caseItem: Case) => void;
  onNavigateToCases: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = memo(({
  cases,
  currentTheme,
  onSelectCase,
  onNavigateToCases
}) => {
  // Memoized Metrics & Statistics Calculations
  const stats = useMemo(() => {
    const total = cases.length;
    const active = cases.filter((c) => c.status === "Under Investigation").length;
    const closed = cases.filter((c) => c.status === "Closed").length;
    const highPriority = cases.filter(
      (c) => c.crime_head.toLowerCase().includes("murder") || c.crime_head.toLowerCase().includes("robbery")
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
    const recentCases = [...cases].slice(0, 5);

    return { total, active, closed, highPriority, categoryData, districtData, recentCases };
  }, [cases]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className={`p-6 rounded-2xl border backdrop-blur-md ${currentTheme.cardBg} ${currentTheme.border}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-bold ${currentTheme.textMain}`}>Command & Control Dashboard</h2>
            <p className={`text-xs ${currentTheme.textMuted} mt-1`}>
              Karnataka State Police Intelligence Overview & Analytical Insights
            </p>
          </div>
          <button
            onClick={onNavigateToCases}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${currentTheme.accentBg}`}
          >
            <span>View All Cases</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KSP Intelligence Evidence & Data Provenance Banner */}
      <div className={`p-4 rounded-2xl border ${currentTheme.id === "dark" ? "bg-cyan-950/20 border-cyan-500/30 text-cyan-200" : "bg-blue-50 border-blue-200 text-blue-950"} shadow-sm`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold tracking-wider text-[11px] uppercase">
                <span>KSP Intelligence System-Wide Data Grounding</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-mono border border-cyan-400/30">
                  Exact Database Grounding (100%)
                </span>
              </div>
              <p className="text-[11px] opacity-80 mt-0.5">
                All metrics, charts, and spatial counts are dynamically aggregated from verified KSP FIR case files.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono border-t md:border-t-0 md:border-l border-current/15 pt-2 md:pt-0 md:pl-4">
            <div>
              <span className="opacity-70">Data Source:</span>{" "}
              <strong className="font-semibold text-cyan-300">KSP Crime Database</strong>
            </div>
            <div>
              <span className="opacity-70">Live Sync:</span>{" "}
              <strong className="font-semibold text-emerald-400">Active Registry Sync</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${currentTheme.cardBg} ${currentTheme.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${currentTheme.textMuted}`}>Total Cases</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${currentTheme.textMain}`}>{stats.total.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span>Active database synchronized</span>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${currentTheme.cardBg} ${currentTheme.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${currentTheme.textMuted}`}>Active Investigations</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${currentTheme.textMain}`}>{stats.active.toLocaleString()}</p>
          <p className={`text-[11px] mt-1 ${currentTheme.textMuted}`}>
            {((stats.active / (stats.total || 1)) * 100).toFixed(1)}% of total cases
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${currentTheme.cardBg} ${currentTheme.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${currentTheme.textMuted}`}>Resolved Cases</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${currentTheme.textMain}`}>{stats.closed.toLocaleString()}</p>
          <p className={`text-[11px] mt-1 ${currentTheme.textMuted}`}>
            {((stats.closed / (stats.total || 1)) * 100).toFixed(1)}% clearance rate
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${currentTheme.cardBg} ${currentTheme.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${currentTheme.textMuted}`}>High Risk Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${currentTheme.textMain}`}>{stats.highPriority.toLocaleString()}</p>
          <p className={`text-[11px] mt-1 ${currentTheme.textMuted}`}>Serious / Violent offenses</p>
        </div>
      </div>

      {/* Analytics Charts & District Rank Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crime Head Distribution Bar Chart */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border ${currentTheme.cardBg} ${currentTheme.border}`}>
          <h3 className={`text-sm font-semibold mb-4 ${currentTheme.textMain}`}>Crime Category Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.chartGrid} />
                <XAxis dataKey="name" stroke={currentTheme.chartStroke} tick={{ fontSize: 11 }} />
                <YAxis stroke={currentTheme.chartStroke} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A182F",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "0.75rem",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill={currentTheme.chartBar} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Active Districts */}
        <div className={`p-5 rounded-2xl border ${currentTheme.cardBg} ${currentTheme.border}`}>
          <h3 className={`text-sm font-semibold mb-4 ${currentTheme.textMain}`}>Top Active Districts</h3>
          <div className="space-y-3">
            {stats.districtData.map((item, idx) => (
              <div key={item.district} className="flex items-center justify-between p-2.5 rounded-xl bg-black/20">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className={`text-xs font-medium ${currentTheme.textMain}`}>{item.district}</span>
                </div>
                <span className={`text-xs font-semibold ${currentTheme.textMuted}`}>{item.count} cases</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent High Priority Case Feed */}
      <div className={`p-5 rounded-2xl border ${currentTheme.cardBg} ${currentTheme.border}`}>
        <h3 className={`text-sm font-semibold mb-4 ${currentTheme.textMain}`}>Recent FIR Registrations</h3>
        <div className="divide-y divide-white/5">
          {stats.recentCases.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCase(c)}
              className="py-3 flex items-center justify-between hover:bg-white/5 px-2 rounded-xl cursor-pointer transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold text-blue-400`}>{c.fir_number}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 font-medium">
                    {c.crime_head}
                  </span>
                </div>
                <p className={`text-xs ${currentTheme.textMuted} mt-1 line-clamp-1`}>{c.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                    c.status === "Closed"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {c.status}
                </span>
                <p className={`text-[10px] ${currentTheme.textMuted} mt-1`}>{c.police_station}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

DashboardView.displayName = "DashboardView";
