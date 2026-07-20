import React, { memo } from "react";
import { LayoutDashboard, MessageSquare, Map, Briefcase, Share2 } from "lucide-react";
import type { Theme } from "../types";

export type TabType = "dashboard" | "ai-assistant" | "map" | "cases" | "link-analysis";

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  currentTheme: Theme;
}

export const Sidebar: React.FC<SidebarProps> = memo(({ activeTab, onSelectTab, currentTheme }) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "ai-assistant", label: "AI Assistant", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "map", label: "Intelligence Map", icon: <Map className="w-4 h-4" /> },
    { id: "cases", label: "Cases Module", icon: <Briefcase className="w-4 h-4" /> },
    { id: "link-analysis", label: "Link Analysis", icon: <Share2 className="w-4 h-4" /> },
  ];

  return (
    <aside className={`w-56 flex-shrink-0 p-4 border-r backdrop-blur-md hidden md:flex flex-col justify-between ${currentTheme.cardBg} ${currentTheme.border}`}>
      <div className="space-y-1">
        <p className={`text-[10px] uppercase tracking-wider font-semibold px-3 mb-2 ${currentTheme.textMuted}`}>
          Navigation
        </p>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? `${currentTheme.accentBg} shadow-lg`
                  : `${currentTheme.textMuted} hover:${currentTheme.textMain} hover:bg-white/5`
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* System Status Footer */}
      <div className={`p-3 rounded-xl border bg-black/20 ${currentTheme.border}`}>
        <p className={`text-[11px] font-semibold ${currentTheme.textMain}`}>Database Connected</p>
        <p className={`text-[10px] ${currentTheme.textMuted}`}>1,150+ Cases Synchronized</p>
      </div>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";
