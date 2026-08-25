import React, { useMemo } from "react";
import { 
  Smartphone, MapPin, Clock, History, ExternalLink, Network, FileText, AlertTriangle
} from "lucide-react";
import type { Theme, Case } from "../types";

interface MobileIntelligencePanelProps {
  personName?: string;
  phones?: string[];
  cases: Case[];
  currentTheme: Theme;
  onNavigateToMap: (location: string) => void;
  onNavigateToNetwork: (entity: string) => void;
  onSelectCase: (c: Case) => void;
}

export const MobileIntelligencePanel: React.FC<MobileIntelligencePanelProps> = ({
  personName,
  phones = [],
  cases,
  currentTheme,
  onNavigateToMap,
  onNavigateToNetwork,
  onSelectCase
}) => {
  // Find cases relevant to the person OR the provided phones
  const relevantCases = useMemo(() => {
    return cases.filter(c => {
      const matchName = personName && (c.accused || []).includes(personName);
      const matchPhone = (phones || []).some(p => (c.phone_numbers || []).includes(p));
      return matchName || matchPhone;
    }).sort((a, b) => new Date(b.date_of_registration).getTime() - new Date(a.date_of_registration).getTime());
  }, [cases, personName, phones]);

  if (relevantCases.length === 0) return null;

  // Extract unique phones associated with these cases
  const knownPhones = useMemo(() => {
    const pSet = new Set<string>();
    relevantCases.forEach(c => {
      (c.phone_numbers || []).forEach(p => pSet.add(p));
    });
    return Array.from(pSet);
  }, [relevantCases]);

  const displayPhones = phones.length > 0 ? phones : knownPhones;

  const lastKnownCase = relevantCases[0];
  const historicalCases = relevantCases.slice(1);

  const cardStyle = `border ${currentTheme.border} ${currentTheme.cardBg} rounded-xl p-4`;

  return (
    <div className={`mt-6 pt-6 border-t ${currentTheme.border} space-y-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Smartphone className={`w-5 h-5 ${currentTheme.textMain}`} />
        <h3 className={`text-lg font-bold ${currentTheme.textMain}`}>Mobile Intelligence</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mobile Info */}
        <div className={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <h4 className={`text-sm font-bold uppercase tracking-wider ${currentTheme.textMuted}`}>Device Identifiers</h4>
          </div>
          {displayPhones.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {displayPhones.map(p => (
                <button 
                  key={p} 
                  onClick={() => onNavigateToNetwork(p)}
                  className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-500 text-xs font-mono border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                  title="View in Network Map"
                >
                  {p} <Network className="w-3 h-3" />
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-xs ${currentTheme.textMuted} italic`}>No direct mobile identifier found.</p>
          )}
          
          {personName && (
            <div className="mt-4 pt-3 border-t border-slate-500/10">
              <span className={`text-xs ${currentTheme.textMuted}`}>Associated Entity:</span>
              <p className={`text-sm font-bold ${currentTheme.textMain} mt-1`}>{personName}</p>
            </div>
          )}
        </div>

        {/* Last Known Location */}
        <div className={`${cardStyle} relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <h4 className={`text-sm font-bold uppercase tracking-wider ${currentTheme.textMuted}`}>Last Known Location</h4>
          </div>
          <div className="mb-4">
            <p className={`text-lg font-bold text-emerald-500 mb-1`}>
              {lastKnownCase.location || lastKnownCase.police_station}
            </p>
            <div className={`flex flex-col gap-1 text-xs ${currentTheme.textMuted}`}>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recorded: {lastKnownCase.date_of_registration}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> Source FIR: {lastKnownCase.fir_number}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onNavigateToMap(lastKnownCase.location || lastKnownCase.police_station)}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-center flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View on KSP Map
            </button>
            <button 
              onClick={() => onSelectCase(lastKnownCase)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${currentTheme.border} hover:bg-slate-500/10 transition-colors text-center ${currentTheme.textMain}`}
            >
              View Case
            </button>
          </div>
        </div>
      </div>

      {/* Historical Location Timeline */}
      {historicalCases.length > 0 && (
        <div className={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-amber-500" />
            <h4 className={`text-sm font-bold uppercase tracking-wider ${currentTheme.textMuted}`}>Location Timeline</h4>
          </div>
          <div className="relative pl-3 space-y-4 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-500/20">
            {relevantCases.map((c, idx) => (
              <div key={c.id + idx} className="relative pl-6">
                <div className={`absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full border-2 ${currentTheme.cardBg} ${idx === 0 ? "bg-emerald-500" : "bg-amber-500"}`} />
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-bold ${idx === 0 ? "text-emerald-500" : currentTheme.textMain}`}>
                      {c.location || c.police_station}
                      {idx === 0 && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-500 uppercase tracking-wider">Latest</span>}
                    </p>
                    <p className={`text-xs ${currentTheme.textMuted} mt-0.5 flex items-center gap-1`}>
                      <Clock className="w-3 h-3" /> {c.date_of_registration}
                    </p>
                  </div>
                  <button 
                    onClick={() => onSelectCase(c)}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-blue-500 transition-colors"
                  >
                    {c.fir_number}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
