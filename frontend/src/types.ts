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

export interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  confidence_score?: number;
  evidence_trail?: string[];
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
    name: "Dark Mode",
    bodyBg: "bg-[#090C10] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#1A182F] via-[#090C10] to-[#090C10]",
    cardBg: "backdrop-blur-md bg-[#1A182F]/45 border border-[#B4BBC5]/15 shadow-[0_0_30px_rgba(232,240,254,0.05)]",
    border: "border-[#B4BBC5]/15",
    textMain: "text-zinc-100",
    textMuted: "text-[#B4BBC5]/65",
    accentBg: "bg-[#E8F0FE] hover:bg-white text-[#090C10] font-bold shadow-[0_0_15px_rgba(232,240,254,0.4)] hover:shadow-[0_0_22px_rgba(232,240,254,0.7)] transition-all duration-300",
    accentText: "text-[#090C10] font-bold",
    chatUser: "bg-[#E8F0FE]/10 border border-[#E8F0FE]/25 text-zinc-100",
    chatAssistant: "bg-[#090C10]/95 border border-[#B4BBC5]/15 text-zinc-100",
    chartGrid: "#1c1a2f",
    chartStroke: "#e8f0fe",
    chartBar: "#e8f0fe",
    chartLine: "#e8f0fe",
    nodeIncident: "#e8f0fe",
    nodeAccused: "#cbdcf8",
    nodePhone: "#a9c6f5",
    nodeVehicle: "#d7e6fc",
    nodeBankAccount: "#cbdcf8"
  },
  {
    id: "light",
    name: "Light Mode",
    bodyBg: "bg-[#F4F6F9]",
    cardBg: "bg-white border border-slate-200 shadow-md",
    border: "border-slate-200",
    textMain: "text-slate-900",
    textMuted: "text-slate-500",
    accentBg: "bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-all duration-300",
    accentText: "text-blue-600 font-bold",
    chatUser: "bg-blue-50 border border-blue-200 text-slate-900",
    chatAssistant: "bg-white border border-slate-200 text-slate-900",
    chartGrid: "#E2E8F0",
    chartStroke: "#2563EB",
    chartBar: "#3B82F6",
    chartLine: "#1D4ED8",
    nodeIncident: "#2563EB",
    nodeAccused: "#EF4444",
    nodePhone: "#10B981",
    nodeVehicle: "#F59E0B",
    nodeBankAccount: "#8B5CF6"
  }
];
