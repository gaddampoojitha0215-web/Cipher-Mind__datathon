import React, { memo } from "react";
import { Search, Globe, ChevronDown, Sun, Moon, Bell, Shield } from "lucide-react";
import { Theme } from "../types";

interface HeaderProps {
  currentTheme: Theme;
  onToggleTheme: () => void;
  language: string;
  onChangeLanguage: (lang: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onSelectLanguageDropdown?: () => void;
}

export const Header: React.FC<HeaderProps> = memo(({
  currentTheme,
  onToggleTheme,
  language,
  onChangeLanguage,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}) => {
  const languageNames: Record<string, string> = {
    en: "English",
    kn: "ಕನ್ನಡ (Kannada)",
    hi: "हिन्दी (Hindi)",
    te: "తెలుగు (Telugu)",
    ta: "தமிழ் (Tamil)",
  };

  return (
    <header className={`sticky top-0 z-40 px-6 py-3 border-b backdrop-blur-md ${currentTheme.cardBg} ${currentTheme.border}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Left: Logo & KSP Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`font-bold text-lg leading-tight tracking-wide flex items-center gap-2 ${currentTheme.textMain}`}>
              CrimeMind AI
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                LIVE
              </span>
            </h1>
            <p className={`text-xs ${currentTheme.textMuted}`}>Karnataka State Police Intelligence Platform</p>
          </div>
        </div>

        {/* Center: Global Quick Search */}
        <form onSubmit={onSearchSubmit} className="flex-1 max-w-xl hidden md:block">
          <div className="relative">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${currentTheme.textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by FIR, suspect, phone, vehicle plate, or location..."
              className={`w-full pl-10 pr-4 py-2 text-sm rounded-xl border bg-black/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${currentTheme.border} ${currentTheme.textMain}`}
            />
          </div>
        </form>

        {/* Right: Controls & User Profile */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative group">
            <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${currentTheme.border} ${currentTheme.textMain} bg-black/20 hover:bg-black/30 transition-colors`}>
              <Globe className="w-3.5 h-3.5" />
              <span>{languageNames[language] || "English"}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <div className="absolute right-0 mt-1 w-44 py-1.5 rounded-xl border bg-[#1A182F] border-white/10 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50">
              {Object.entries(languageNames).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => onChangeLanguage(code)}
                  className={`w-full text-left px-3.5 py-1.5 text-xs hover:bg-blue-600/20 transition-colors ${
                    language === code ? "text-blue-400 font-semibold" : "text-zinc-300"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-lg border bg-black/20 hover:bg-black/30 transition-colors ${currentTheme.border} ${currentTheme.textMain}`}
            title="Toggle Theme"
          >
            {currentTheme.id === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Notification Alert Bell */}
          <button className={`relative p-2 rounded-lg border bg-black/20 hover:bg-black/30 transition-colors ${currentTheme.border} ${currentTheme.textMain}`}>
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
          </button>

          {/* User Badge */}
          <div className={`flex items-center gap-2 pl-2 border-l ${currentTheme.border}`}>
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-300">
              IG
            </div>
            <div className="hidden lg:block text-left">
              <p className={`text-xs font-semibold leading-none ${currentTheme.textMain}`}>Inspector Gowda</p>
              <p className={`text-[10px] ${currentTheme.textMuted}`}>KSP-8932</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = "Header";
