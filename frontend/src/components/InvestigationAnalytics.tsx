import React from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { demoScenario } from "../data/demoScenario";

export const InvestigationAnalytics = ({ currentTheme }: any) => {
  const chartColors = [
    themeId(currentTheme) === "dark" ? "#a78bfa" : "#7c3aed",
    themeId(currentTheme) === "dark" ? "#22d3ee" : "#0284c7",
    themeId(currentTheme) === "dark" ? "#34d399" : "#10b981",
    themeId(currentTheme) === "dark" ? "#fb7185" : "#e11d48",
  ];

  function themeId(theme: any) {
    return theme?.id || "dark";
  }

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${currentTheme.textMain}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-sans">Investigation Analytics</h1>
          <p className={`text-sm ${currentTheme.textMuted} mt-1`}>Department performance and crime trend analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crime Trends (Line Chart) */}
        <div className={`p-5 rounded-2xl border ${currentTheme.border} ${currentTheme.cardBg} shadow-md`}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4">6-Month Crime Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demoScenario.analytics.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeId(currentTheme) === 'dark' ? '#1f2937' : '#e5e7eb'} />
                <XAxis dataKey="month" stroke={themeId(currentTheme) === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={10} />
                <YAxis stroke={themeId(currentTheme) === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: themeId(currentTheme) === 'dark' ? '#1f2937' : '#ffffff', borderColor: themeId(currentTheme) === 'dark' ? '#374151' : '#e5e7eb' }} />
                <Line type="monotone" dataKey="cases" name="Reported Cases" stroke={chartColors[0]} strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="resolved" name="Resolved Cases" stroke={chartColors[2]} strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Case Status (Bar Chart) */}
        <div className={`p-5 rounded-2xl border ${currentTheme.border} ${currentTheme.cardBg} shadow-md`}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Current Case Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoScenario.analytics.status}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeId(currentTheme) === 'dark' ? '#1f2937' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={themeId(currentTheme) === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={10} />
                <YAxis stroke={themeId(currentTheme) === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: themeId(currentTheme) === 'dark' ? '#1f2937' : '#ffffff', borderColor: themeId(currentTheme) === 'dark' ? '#374151' : '#e5e7eb' }} />
                <Bar dataKey="value" name="Cases" radius={[4, 4, 0, 0]}>
                  {demoScenario.analytics.status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
