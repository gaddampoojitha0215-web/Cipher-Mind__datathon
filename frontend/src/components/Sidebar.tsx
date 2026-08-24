import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Briefcase, 
  Network, 
  Map as MapIcon, 
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  HelpCircle,
  GripVertical
} from "lucide-react";
import type { Theme } from "../types";
import logoImg from "../assets/logo.png";

export type TabType = 
  | "dashboard" 
  | "ai-assistant" 
  | "cases" 
  | "network-map" 
  | "ksp-map" 
  | "alerts"
  | "settings"
  | "help";

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  currentTheme: Theme;
}

const MIN_WIDTH = 220;
const MAX_WIDTH = 450;
const COLLAPSED_WIDTH = 80;

export const Sidebar: React.FC<SidebarProps> = memo(({ activeTab, onSelectTab, currentTheme }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(256);
  const isDragging = useRef(false);

  useEffect(() => {
    const savedWidth = localStorage.getItem("cmai_sidebar_width");
    const savedCollapsed = localStorage.getItem("cmai_sidebar_collapsed");
    if (savedWidth) setWidth(Number(savedWidth));
    if (savedCollapsed) setIsCollapsed(savedCollapsed === "true");
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    let newWidth = e.clientX;
    if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
    if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
    setWidth(newWidth);
    if (isCollapsed) {
      setIsCollapsed(false);
      localStorage.setItem("cmai_sidebar_collapsed", "false");
    }
  }, [isCollapsed]);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.cursor = "default";
      localStorage.setItem("cmai_sidebar_width", width.toString());
    }
  }, [width]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("cmai_sidebar_collapsed", String(newState));
  };

  const mainNavigation: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "ai-assistant", label: "AI Assistant", icon: <MessageSquare className="w-5 h-5" /> },
    { id: "cases", label: "Cases", icon: <Briefcase className="w-5 h-5" /> },
    { id: "network-map", label: "Network Map", icon: <Network className="w-5 h-5" /> },
    { id: "ksp-map", label: "KSP Intelligence Map", icon: <MapIcon className="w-5 h-5" /> },
    { id: "alerts", label: "Alerts & Intelligence", icon: <Bell className="w-5 h-5" /> },
  ];

  const bottomNavigation = [
    { id: "settings" as TabType, label: "Settings", icon: <Settings className="w-5 h-5" /> },
    { id: "help" as TabType, label: "Help & Support", icon: <HelpCircle className="w-5 h-5" /> },
  ];

  const currentWidth = isCollapsed ? COLLAPSED_WIDTH : width;

  return (
    <aside 
      className={`relative flex-shrink-0 flex flex-col h-full border-r ${currentTheme.cardBg} ${currentTheme.border} transition-[width] duration-200 ease-out z-50`}
      style={{ width: `${currentWidth}px` }}
    >
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* BRANDING */}
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between pl-4 pr-2"} pt-4 pb-6`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0">
                <img src={logoImg} className="w-6 h-6 object-contain" alt="Logo" />
              </div>
              <div className="flex flex-col whitespace-nowrap">
                <span className={`font-bold text-sm tracking-tight ${currentTheme.textMain}`}>CrimeMind AI</span>
                <span className={`text-[9px] uppercase tracking-widest font-mono ${currentTheme.textMuted}`}>KSP Intelligence</span>
              </div>
            </div>
          )}
          <button 
            onClick={toggleCollapse}
            className={`p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0 ${currentTheme.textMuted}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* MAIN NAVIGATION */}
        <div className="px-3 space-y-1">
          {!isCollapsed && (
            <p className={`text-[10px] uppercase tracking-widest font-bold px-3 mb-3 mt-2 opacity-60 ${currentTheme.textMuted}`}>
              Main Modules
            </p>
          )}
          {mainNavigation.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                title={isCollapsed ? tab.label : undefined}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? `${currentTheme.accentBg} shadow-md`
                    : `${currentTheme.textMuted} hover:${currentTheme.textMain} hover:bg-black/5 dark:hover:bg-white/5`
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <div className={isActive ? (currentTheme.id === 'dark' ? currentTheme.accentText : "text-white") : "opacity-80"}>
                  {tab.icon}
                </div>
                {!isCollapsed && <span className="whitespace-nowrap">{tab.label}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex-1"></div>

        {/* OPTIONAL LOWER AREA */}
        <div className="px-3 pb-4 pt-6 space-y-1">
          {!isCollapsed && (
            <p className={`text-[10px] uppercase tracking-widest font-bold px-3 mb-3 opacity-60 ${currentTheme.textMuted}`}>
              System
            </p>
          )}
          {bottomNavigation.map((tab) => (
            <button
              key={tab.id}
              title={isCollapsed ? tab.label : undefined}
              onClick={() => {
                if (tab.id === "settings") onSelectTab("settings");
                else if (tab.id === "help") onSelectTab("help");
                else alert(`The ${tab.label} module is coming soon in the next update!`);
              }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold transition-colors ${currentTheme.textMuted} hover:${currentTheme.textMain} hover:bg-black/5 dark:hover:bg-white/5 ${isCollapsed ? "justify-center" : ""}`}
            >
              <div className="opacity-80">
                {tab.icon}
              </div>
              {!isCollapsed && <span className="whitespace-nowrap">{tab.label}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 z-50 flex items-center justify-center group"
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-white drop-shadow-md" />
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";
