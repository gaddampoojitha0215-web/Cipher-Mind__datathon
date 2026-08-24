export interface Case {
  id: string;
  fir_number: string;
  police_station: string;
  district: string;
  crime_head: string;
  date_of_offence: string;
  date_of_registration: string;
  description: string;
  status: string;
  accused: string[];
  location: string;
  phone_numbers: string[];
  vehicles: string[];
  bank_accounts: string[];
  officer: string;
}

export interface EvidenceMetadata {
  matched_by: string;
  records_found: number;
  data_source: string;
  last_database_update: string;
  confidence: string;
}

export interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  confidence_score?: number;
  evidence_trail?: string[];
  evidence_metadata?: EvidenceMetadata;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphLink {
  source: string;
  target: string;
  relationship: string;
}

export interface Theme {
  id: "dark" | "light";
  name: string;
  bodyBg: string;
  cardBg: string;
  border: string;
  textMain: string;
  textMuted: string;
  accentBg: string;
  accentText: string;
  chatUser: string;
  chatAssistant: string;
  chartGrid: string;
  chartStroke: string;
  chartBar: string;
  chartLine: string;
  nodeIncident: string;
  nodeAccused: string;
  nodePhone: string;
  nodeVehicle: string;
  nodeBankAccount: string;
}

export const THEMES: Theme[] = [
  {
    id: "dark",
    name: "Command Center Dark",
    bodyBg: "bg-slate-950",
    cardBg: "bg-slate-900 border border-slate-800 shadow-lg",
    border: "border-slate-800",
    textMain: "text-slate-200",
    textMuted: "text-slate-500",
    accentBg: "bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors",
    accentText: "text-blue-500 font-medium",
    chatUser: "bg-blue-900/30 border border-blue-800/50 text-slate-200",
    chatAssistant: "bg-slate-800 border border-slate-700 text-slate-200",
    chartGrid: "#334155",
    chartStroke: "#3b82f6",
    chartBar: "#3b82f6",
    chartLine: "#60a5fa",
    nodeIncident: "#3b82f6",
    nodeAccused: "#ef4444",
    nodePhone: "#eab308",
    nodeVehicle: "#22c55e",
    nodeBankAccount: "#f97316"
  },
  {
    id: "light",
    name: "Command Center Light",
    bodyBg: "bg-slate-50",
    cardBg: "bg-white border border-slate-200 shadow-sm",
    border: "border-slate-200",
    textMain: "text-slate-900",
    textMuted: "text-slate-500",
    accentBg: "bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors",
    accentText: "text-blue-600 font-medium",
    chatUser: "bg-blue-50 border border-blue-200 text-slate-900",
    chatAssistant: "bg-white border border-slate-200 text-slate-900",
    chartGrid: "#e2e8f0",
    chartStroke: "#2563eb",
    chartBar: "#3b82f6",
    chartLine: "#1d4ed8",
    nodeIncident: "#2563eb",
    nodeAccused: "#ef4444",
    nodePhone: "#10b981",
    nodeVehicle: "#f59e0b",
    nodeBankAccount: "#8b5cf6"
  }
];
