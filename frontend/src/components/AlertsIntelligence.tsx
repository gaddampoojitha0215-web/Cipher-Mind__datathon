import React, { useState } from "react";
import { Bell, AlertTriangle, ShieldAlert, Clock, MapPin, CheckCircle } from "lucide-react";
import type { Theme } from "../types";

interface AlertsIntelligenceProps {
  cases: any[];
  currentTheme: Theme;
  onSelectCase: (c: any) => void;
  onNavigateToNetwork?: (firNum: string) => void;
  onNavigateToMap?: (firNum: string) => void;
}

export const AlertsIntelligence: React.FC<AlertsIntelligenceProps> = ({ cases, currentTheme, onSelectCase, onNavigateToNetwork, onNavigateToMap }) => {
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

  // Generate some mock intelligence feed from cases
  const recentAlerts = cases.slice(0, 10).map((c, index) => {
    let type = "update";
    let priority = "low";
    if (index % 5 === 0) {
      type = "critical";
      priority = "high";
    } else if (index % 3 === 0) {
      type = "warning";
      priority = "medium";
    }

    return {
      id: `alert-${index}`,
      type,
      priority,
      caseInfo: c,
      time: new Date(Date.now() - index * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: type === "critical" ? `High priority suspect spotted near ${c.location}` : 
               type === "warning" ? `New evidence added to FIR ${c.fir_number}` :
               `Routine update for ${c.district} region`,
    };
  });

  return (
    <div className="flex h-full gap-6 w-full">
      {/* Main Feed */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <Bell className={`w-6 h-6 ${currentTheme.textMain}`} />
          <h2 className={`text-xl font-bold ${currentTheme.textMain}`}>Alerts & Intelligence</h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {recentAlerts.map(alert => (
            <div 
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-4 ${
                selectedAlert?.id === alert.id 
                  ? `border-blue-500 bg-blue-500/10` 
                  : `${currentTheme.cardBg} ${currentTheme.border} hover:border-blue-500/50`
              }`}
            >
              <div className="mt-1">
                {alert.priority === "high" ? <ShieldAlert className="w-5 h-5 text-red-500" /> :
                 alert.priority === "medium" ? <AlertTriangle className="w-5 h-5 text-amber-500" /> :
                 <CheckCircle className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold uppercase ${
                    alert.priority === "high" ? "text-red-500" :
                    alert.priority === "medium" ? "text-amber-500" : "text-blue-500"
                  }`}>
                    {alert.priority} Priority
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${currentTheme.textMuted}`}>
                    <Clock className="w-3 h-3" /> {alert.time}
                  </span>
                </div>
                <p className={`text-sm font-medium mb-2 ${currentTheme.textMain}`}>{alert.message}</p>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] px-2 py-1 rounded bg-black/20 ${currentTheme.textMuted}`}>
                    FIR: {alert.caseInfo.fir_number}
                  </span>
                  <span className={`text-[11px] px-2 py-1 rounded bg-black/20 flex items-center gap-1 ${currentTheme.textMuted}`}>
                    <MapPin className="w-3 h-3" /> {alert.caseInfo.district}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Panel */}
      {selectedAlert && (
        <div className={`w-80 flex-shrink-0 flex flex-col h-full rounded-xl border ${currentTheme.cardBg} ${currentTheme.border}`}>
          <div className={`p-4 border-b ${currentTheme.border}`}>
            <h3 className={`font-bold ${currentTheme.textMain}`}>Alert Details</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            <div>
              <p className={`text-xs ${currentTheme.textMuted} mb-1`}>Time / Priority</p>
              <p className={`text-sm font-medium ${currentTheme.textMain}`}>{selectedAlert.time} - {selectedAlert.priority.toUpperCase()}</p>
            </div>
            <div>
              <p className={`text-xs ${currentTheme.textMuted} mb-1`}>Message</p>
              <p className={`text-sm ${currentTheme.textMain}`}>{selectedAlert.message}</p>
            </div>
            <div className={`p-3 rounded-lg bg-black/20 border ${currentTheme.border}`}>
              <p className={`text-xs ${currentTheme.textMuted} mb-2`}>Related Case Details</p>
              <p className={`text-sm font-medium ${currentTheme.textMain} mb-1`}>{selectedAlert.caseInfo.fir_number}</p>
              <p className={`text-xs ${currentTheme.textMuted} mb-3`}>{selectedAlert.caseInfo.crime_head}</p>
              <button 
                onClick={() => onSelectCase(selectedAlert.caseInfo)}
                className={`w-full py-2 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors`}
              >
                View Full Case
              </button>
            </div>

            <div className={`pt-6 mt-6 border-t space-y-2 ${currentTheme.border}`}>
              <p className={`text-xs ${currentTheme.textMuted} mb-2 uppercase tracking-wider`}>Actions</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => onSelectCase(selectedAlert.caseInfo)}
                  className={`w-full py-2 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors`}
                >
                  Open Case File
                </button>
                <button 
                  onClick={() => onNavigateToNetwork && onNavigateToNetwork(selectedAlert.caseInfo.fir_number)}
                  className={`w-full py-2 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors`}
                >
                  View Network Graph
                </button>
                <button 
                  onClick={() => onNavigateToMap && onNavigateToMap(selectedAlert.caseInfo.fir_number)}
                  className="w-full py-2 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                >
                  Locate on KSP Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
