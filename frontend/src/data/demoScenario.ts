export const demoScenario = {
  cases: [
    {
      id: "case-001",
      fir_number: "FIR/2026/089",
      police_station: "Indiranagar PS",
      district: "Bengaluru City",
      crime_head: "Cyber Fraud & Extortion",
      date_of_offence: "2026-08-15",
      date_of_registration: "2026-08-16",
      description: "Victim reported losing 15 Lakhs after being blackmailed with synthetic media. Suspects used VOIP numbers and routed money through multiple shell accounts.",
      status: "Active",
      priority: "High",
      accused: ["Unknown", "Ramesh K (Suspected Mule)"],
      victims: ["Priya Sharma"],
      location: "Indiranagar, 100ft Road",
      coordinates: [77.6411, 12.9716],
      phone_numbers: ["+91 9876543210", "+91 8765432109"],
      vehicles: ["KA-03-MR-1234"],
      bank_accounts: ["HDFC-00123984", "SBI-99382103"],
      officer: "inspector.gowda@ksp.gov.in"
    },
    {
      id: "case-002",
      fir_number: "FIR/2026/042",
      police_station: "Koramangala PS",
      district: "Bengaluru City",
      crime_head: "Financial Fraud",
      date_of_offence: "2026-06-10",
      date_of_registration: "2026-06-12",
      description: "Company accountant siphoned funds using dummy vendor invoices. Traced to a syndicate operating out of multiple locations.",
      status: "Closed",
      priority: "Medium",
      accused: ["Suresh Babu", "Ramesh K"],
      victims: ["TechNova Solutions"],
      location: "Koramangala 4th Block",
      coordinates: [77.6253, 12.9345],
      phone_numbers: ["+91 8765432109", "+91 7654321098"],
      vehicles: ["KA-01-AB-9876", "KA-03-MR-1234"],
      bank_accounts: ["ICICI-44829102", "HDFC-00123984"],
      officer: "inspector.gowda@ksp.gov.in"
    }
  ],
  evidence: [
    {
      id: "ev-001",
      case_id: "case-001",
      type: "Digital",
      title: "CCTV Footage - ATM Withdrawal",
      description: "Footage showing suspect at ATM using cloned card linked to HDFC-00123984.",
      date_added: "2026-08-17",
      status: "Analyzed"
    },
    {
      id: "ev-002",
      case_id: "case-001",
      type: "Document",
      title: "Bank Statement - SBI",
      description: "Shows transfers to suspected mule account.",
      date_added: "2026-08-16",
      status: "Pending Analysis"
    },
    {
      id: "ev-003",
      case_id: "case-002",
      type: "Digital",
      title: "WhatsApp Chat Logs",
      description: "Conversations between Suresh and Ramesh regarding fund transfer.",
      date_added: "2026-06-13",
      status: "Analyzed"
    }
  ],
  alerts: [
    {
      id: "alt-001",
      severity: "Critical",
      type: "Connection Detected",
      message: "Common Suspect (Ramesh K) found in active Case FIR/2026/089 and closed Case FIR/2026/042.",
      date: "2026-08-18",
      related_case_id: "case-001"
    },
    {
      id: "alt-002",
      severity: "High",
      type: "Missing Information",
      message: "Case FIR/2026/089 is missing physical evidence documentation for vehicle KA-03-MR-1234.",
      date: "2026-08-19",
      related_case_id: "case-001"
    },
    {
      id: "alt-003",
      severity: "Medium",
      type: "Hotspot Alert",
      message: "Increase in Cyber Fraud cases reported in Indiranagar within the last 7 days.",
      date: "2026-08-17",
      related_case_id: null
    }
  ],
  leads: [
    {
      id: "lead-001",
      case_id: "case-001",
      description: "Investigate Bank Account HDFC-00123984. It was also used in FIR/2026/042 (Financial Fraud) by suspect Ramesh K.",
      confidence: "High",
      type: "Financial Connection",
      status: "New"
    },
    {
      id: "lead-002",
      case_id: "case-001",
      description: "Vehicle KA-03-MR-1234 spotted near Koramangala 4th Block (Location from Case FIR/2026/042). Review local ANPR cameras.",
      confidence: "Medium",
      type: "Vehicle Tracking",
      status: "In Progress"
    }
  ],
  analytics: {
    trends: [
      { month: "Jan", cases: 120, resolved: 80 },
      { month: "Feb", cases: 150, resolved: 95 },
      { month: "Mar", cases: 130, resolved: 110 },
      { month: "Apr", cases: 180, resolved: 100 },
      { month: "May", cases: 160, resolved: 125 },
      { month: "Jun", cases: 190, resolved: 140 },
      { month: "Jul", cases: 210, resolved: 160 },
      { month: "Aug", cases: 140, resolved: 80 }
    ],
    status: [
      { name: "Active", value: 35 },
      { name: "Under Investigation", value: 45 },
      { name: "Charge Sheeted", value: 15 },
      { name: "Closed", value: 5 }
    ]
  }
};
