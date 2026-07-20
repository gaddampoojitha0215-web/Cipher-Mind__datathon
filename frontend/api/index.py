import os
import io
import datetime
import json
from typing import List, Optional, Dict, Any
from xml.sax.saxutils import escape

import requests
import networkx as nx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

app = FastAPI(title="CrimeMind AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OFFICERS_DB = {
    "inspector.gowda@ksp.gov.in": {
        "id": "officer-1",
        "name": "Inspector Gowda",
        "badge": "KSP-8932",
        "role": "investigator",
        "password_hash": "admin123"
    }
}

import csv

CSV_CASES_PATH = os.path.join(os.path.dirname(__file__), "crime_dataset_india.csv")
CSV_STATS_PATH = os.path.join(os.path.dirname(__file__), "indian-crimes-from-jan-to-aug-2025.csv")

KARNATAKA_DISTRICTS = [
    "Bidar", "Kalaburagi", "Yadgir", "Vijayapura", "Raichur", "Bagalkote", 
    "Belagavi", "Koppal", "Gadag", "Dharwad", "Uttara Kannada", "Ballari", 
    "Vijayanagara", "Haveri", "Shivamogga", "Davangere", "Chitradurga", 
    "Udupi", "Chikkamagaluru", "Dakshina Kannada", "Hassan", "Tumakuru", 
    "Chikkaballapur", "Kolar", "Bengaluru Rural", "Bengaluru Urban", 
    "Ramanagara", "Mandya", "Kodagu", "Mysuru", "Chamarajanagar"
]

CASES_DB = []

# Load cases from detailed csv
if os.path.exists(CSV_CASES_PATH):
    try:
        with open(CSV_CASES_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            officers_pool = [
                "Officer Gowda", "Officer Patil", "Officer Rao", "Officer Reddy",
                "Officer Mishra", "Officer Sharma", "Officer Singh", "Officer Kumar",
                "Officer Nair", "Officer Joshi", "Officer Shetty", "Officer Naidu",
                "Officer Hegde", "Officer Bhat", "Officer Deshpande", "Officer Kulkarni"
            ]
            first_names = ["Aarav", "Aditya", "Amit", "Arjun", "Deepak", "Ganesh", "Hari", "Ishaan", "Karan", "Kiran", "Manoj", "Nikhil", "Pranav", "Rahul", "Rajesh", "Rohan", "Sanjay", "Siddharth", "Suresh", "Vijay", "Vikram", "Yash", "Abhishek", "Ravi", "Sandeep"]
            last_names = ["Patil", "Gowda", "Rao", "Reddy", "Sharma", "Singh", "Kumar", "Joshi", "Mehta", "Nair", "Das", "Choudhury", "Bose", "Gupta", "Mishra", "Sen", "Pillai", "Naidu", "Shetty", "Varma"]
            
            for idx, row in enumerate(reader):
                if idx >= 1000:
                    break
                rep_num = str(row.get("Report Number", idx))
                karnataka_dist = KARNATAKA_DISTRICTS[idx % len(KARNATAKA_DISTRICTS)]
                city = karnataka_dist
                crime_desc = str(row.get("Crime Description", "Unknown Crime")).title()
                
                date_reported_raw = str(row.get("Date Reported", ""))
                date_occ_raw = str(row.get("Date of Occurrence", ""))
                
                year_val = "2020"
                try:
                    parts = date_occ_raw.split("-")
                    if len(parts) >= 3:
                        year_val = parts[2].split(" ")[0]
                        month_val = parts[1]
                        day_val = parts[0]
                        time_val = date_occ_raw.split()[1] if len(date_occ_raw.split()) > 1 else "00:00"
                        date_of_offence = f"{year_val}-{month_val}-{day_val}T{time_val}:00"
                    else:
                        date_of_offence = (datetime.datetime.now() - datetime.timedelta(days=idx * 5)).isoformat()
                except Exception:
                    date_of_offence = (datetime.datetime.now() - datetime.timedelta(days=idx * 5)).isoformat()
                    
                try:
                    r_parts = date_reported_raw.split("-")
                    if len(r_parts) >= 3:
                        r_year = r_parts[2].split(" ")[0]
                        r_month = r_parts[1]
                        r_day = r_parts[0]
                        r_time = date_reported_raw.split()[1] if len(date_reported_raw.split()) > 1 else "00:00"
                        date_of_registration = f"{r_year}-{r_month}-{r_day}T{r_time}:00"
                    else:
                        date_of_registration = (datetime.datetime.now() - datetime.timedelta(days=idx * 5 - 1)).isoformat()
                except Exception:
                    date_of_registration = (datetime.datetime.now() - datetime.timedelta(days=idx * 5 - 1)).isoformat()

                name_idx1 = idx % len(first_names)
                name_idx2 = (idx // len(first_names)) % len(last_names)
                accused_names = [
                    f"{first_names[name_idx1]} {last_names[name_idx2]}",
                    f"{first_names[(name_idx1 + 5) % len(first_names)]} {last_names[(name_idx2 + 3) % len(last_names)]}"
                ]
                
                phone_numbers = [f"98765432{idx%1000:03d}", f"87654321{idx%1000:03d}"]
                
                vehicles = []
                if "STOLEN" in crime_desc.upper() or "VEHICLE" in crime_desc.upper():
                    vehicles = [f"KA-05-MJ-{1000 + (idx % 1000)}"]
                    
                bank_accounts = []
                if "FRAUD" in crime_desc.upper() or "CYBER" in crime_desc.upper() or "THEFT" in crime_desc.upper():
                    bank_accounts = [f"SBIN0001{2345 + (idx % 1000)}"]

                description = (
                    f"{crime_desc} reported in {city}. "
                    f"Victim Age: {row.get('Victim Age', 'N/A')}, Gender: {row.get('Victim Gender', 'N/A')}. "
                    f"Weapon used: {row.get('Weapon Used', 'None')}. "
                    f"Police deployed: {row.get('Police Deployed', 0)}."
                )

                status_val = "Closed" if str(row.get("Case Closed", "No")).strip().lower() == "yes" else "Under Investigation"
                officer_name = officers_pool[idx % len(officers_pool)]
                
                CASES_DB.append({
                    "id": f"case-det-{idx}",
                    "fir_number": f"FIR-{10000 + idx}/{year_val}",
                    "police_station": f"{city} Central PS",
                    "district": f"{city} District",
                    "crime_head": crime_desc,
                    "date_of_offence": date_of_offence,
                    "date_of_registration": date_of_registration,
                    "description": description,
                    "status": status_val,
                    "accused": accused_names,
                    "location": f"{city} Main Road",
                    "phone_numbers": phone_numbers,
                    "vehicles": vehicles,
                    "bank_accounts": bank_accounts,
                    "officer": officer_name
                })
    except Exception as e:
        print(f"Error loading detailed dataset in index.py: {e}")

# Load cases from statistical csv
if os.path.exists(CSV_STATS_PATH):
    try:
        with open(CSV_STATS_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            cities = KARNATAKA_DISTRICTS
            officers_pool = [
                "Officer Gowda", "Officer Patil", "Officer Rao", "Officer Reddy",
                "Officer Mishra", "Officer Sharma", "Officer Singh", "Officer Kumar",
                "Officer Nair", "Officer Joshi", "Officer Shetty", "Officer Naidu",
                "Officer Hegde", "Officer Bhat", "Officer Deshpande", "Officer Kulkarni"
            ]
            valid_idx = 0
            for row in reader:
                cases_val = 0
                try:
                    cases_val = float(row.get("Number of cases from Jan to Aug(2025)", 0))
                except Exception:
                    pass
                if cases_val <= 0:
                    continue
                if valid_idx >= 100:
                    break
                
                law = str(row.get("Law under which they are registered", "IPC Crime"))
                section = str(row.get("Crime + Legal Section", "General Crimes"))
                reason = str(row.get("Reason", "No specific reason reported"))
                
                crime_head = section.split("(")[0].strip()
                city = cities[valid_idx % len(cities)]
                
                date_of_offence = (datetime.datetime(2025, 1, 1) + datetime.timedelta(days=valid_idx * 2)).isoformat()
                date_of_registration = (datetime.datetime(2025, 1, 2) + datetime.timedelta(days=valid_idx * 2)).isoformat()

                accused_names = [f"Accused-2025-{100 + (valid_idx % 20)}"]
                phone_numbers = [f"90005432{valid_idx%10:02d}"]
                
                vehicles = []
                if "STOLEN" in crime_head.upper() or "VEHICLE" in crime_head.upper() or "THEFT" in crime_head.upper():
                    vehicles = [f"KA-03-HA-{2000 + valid_idx}"]
                    
                bank_accounts = []
                if "FRAUD" in crime_head.upper() or "CYBER" in crime_head.upper() or "THEFT" in crime_head.upper():
                    bank_accounts = [f"SBIN0002{4321 + valid_idx}"]

                description = (
                    f"Case registered under {law} for {crime_head} in {city} District. "
                    f"Specific section details: {section}. "
                    f"Stated Cause/Reason: {reason}. "
                    f"Total aggregated cases reported in this category: {int(cases_val)}."
                )

                status_val = "Closed" if valid_idx % 5 == 0 else "Under Investigation"
                officer_name = officers_pool[valid_idx % len(officers_pool)]
                
                CASES_DB.append({
                    "id": f"case-stat-{valid_idx}",
                    "fir_number": f"FIR-{20000 + valid_idx}/2025",
                    "police_station": f"{city} Town PS",
                    "district": f"{city} District",
                    "crime_head": crime_head,
                    "date_of_offence": date_of_offence,
                    "date_of_registration": date_of_registration,
                    "description": description,
                    "status": status_val,
                    "accused": accused_names,
                    "location": f"{city} Main Road",
                    "phone_numbers": phone_numbers,
                    "vehicles": vehicles,
                    "bank_accounts": bank_accounts,
                    "officer": officer_name
                })
                valid_idx += 1
    except Exception as e:
        print(f"Error loading statistical dataset in index.py: {e}")

if not CASES_DB:
    # Fallback to hardcoded mock data if files fail to load
    CASES_DB = [
        {
            "id": f"case-{i}",
            "fir_number": f"FIR-10{234 + i}/2026",
            "police_station": "Jayanagar PS" if i % 2 == 0 else "Indiranagar PS",
            "district": "Bengaluru City",
            "crime_head": "Burglary" if i % 3 == 0 else ("Vehicle Theft" if i % 3 == 1 else "Cyber Fraud"),
            "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=i * 5)).isoformat(),
            "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=i * 5 - 1)).isoformat(),
            "description": f"Burglary reported at residential building. Suspect entered through window lock bypass at night." if i % 3 == 0 else (
                f"Vehicle theft of Royal Enfield Bullet. Stolen from parked parking spot outside commercial complex." if i % 3 == 1 else
                f"Cyber phishing fraud. Clicked link and lost Rs 1.5 Lakhs from bank account."
            ),
            "status": "Under Investigation" if i % 5 != 0 else "Closed",
            "accused": [f"Accused-{100 + (i % 5)}", f"Accused-{100 + ((i+1) % 5)}"],
            "location": "Jayanagar 4th Block" if i % 2 == 0 else "Indiranagar 100ft Road",
            "phone_numbers": [f"98765432{i%10}{i%10}", f"87654321{i%10}{i%10}"],
            "vehicles": [f"KA-05-MJ-{1000 + i}"] if i % 3 == 1 else [],
            "bank_accounts": [f"SBIN0001{2345 + i}"] if i % 3 == 2 else []
        }
        for i in range(1, 51)
    ]

# Always append location-specific cases to guarantee accurate matches for Mysore/Whitefield/Electronic City
CASES_DB.extend([
    {
        "id": "case-wf-robbery",
        "fir_number": "FIR-4012/2026",
        "police_station": "Whitefield PS",
        "district": "Bengaluru City",
        "crime_head": "Robbery",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat(),
        "description": "Armed robbery reported at local grocery outlet in Whitefield. Two suspects entered with firearms and fled on motor vehicle KA-03-HA-8821.",
        "status": "Under Investigation",
        "accused": ["Ramesh Kumar", "Vikram Singh"],
        "location": "Whitefield Main Road",
        "phone_numbers": ["9000123456", "9876540123"],
        "vehicles": ["KA-03-HA-8821"],
        "bank_accounts": ["SBIN0001099"],
        "officer": "Officer Deshpande"
    },
    {
        "id": "case-wf-burglary",
        "fir_number": "FIR-4013/2026",
        "police_station": "Whitefield PS",
        "district": "Bengaluru City",
        "crime_head": "Burglary",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=4)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=4)).isoformat(),
        "description": "Burglary at a residential villa in Whitefield. Gold jewelry and cash stolen while family was away.",
        "status": "Under Investigation",
        "accused": ["Ramesh Kumar"],
        "location": "Whitefield ITPL Road",
        "phone_numbers": ["9000123456"],
        "vehicles": [],
        "bank_accounts": [],
        "officer": "Officer Deshpande"
    },
    {
        "id": "case-ec-fraud",
        "fir_number": "FIR-5087/2026",
        "police_station": "Electronic City PS",
        "district": "Bengaluru City",
        "crime_head": "Cyber Fraud",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=2)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=2)).isoformat(),
        "description": "Phishing fraud reported targeting tech park employees in Electronic City. Stole Rs 12 Lakhs using duplicate bank accounts.",
        "status": "Under Investigation",
        "accused": ["Suresh Patil", "Karan Nair"],
        "location": "Electronic City Phase 1",
        "phone_numbers": ["8765439001"],
        "vehicles": [],
        "bank_accounts": ["SBIN0002102"],
        "officer": "Officer Hegde"
    },
    {
        "id": "case-ec-theft",
        "fir_number": "FIR-5088/2026",
        "police_station": "Electronic City PS",
        "district": "Bengaluru City",
        "crime_head": "Vehicle Theft",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=5)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=5)).isoformat(),
        "description": "Motorcycle theft of Royal Enfield reported from IT park parking lot in Electronic City Phase 2.",
        "status": "Closed",
        "accused": ["Karan Nair"],
        "location": "Electronic City Phase 2",
        "phone_numbers": ["8765439001"],
        "vehicles": ["KA-51-EF-4321"],
        "bank_accounts": [],
        "officer": "Officer Hegde"
    },
    {
        "id": "case-my-murder",
        "fir_number": "FIR-6091/2026",
        "police_station": "Mysuru Town PS",
        "district": "Mysuru District",
        "crime_head": "Murder",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=3)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=3)).isoformat(),
        "description": "Murder case registered near Mysuru Palace. Victim identified as shop owner. Primary suspect is Ramesh Kumar.",
        "status": "Under Investigation",
        "accused": ["Ramesh Kumar"],
        "location": "Mysuru Palace Road",
        "phone_numbers": ["9000123456"],
        "vehicles": ["KA-05-MJ-1290"],
        "bank_accounts": [],
        "officer": "Officer Nair"
    },
    {
        "id": "case-my-robbery",
        "fir_number": "FIR-6092/2026",
        "police_station": "Mysuru Palace PS",
        "district": "Mysuru District",
        "crime_head": "Robbery",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=6)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=6)).isoformat(),
        "description": "Armed robbery of antique artifacts reported near Mysuru Zoo. Three suspects fled on a black motorcycle.",
        "status": "Under Investigation",
        "accused": ["Vikram Singh", "Karan Nair"],
        "location": "Mysuru Zoo Road",
        "phone_numbers": ["9876540123"],
        "vehicles": ["KA-09-RT-5544"],
        "bank_accounts": [],
        "officer": "Officer Nair"
    },
    {
        "id": "case-my-cyber",
        "fir_number": "FIR-6093/2026",
        "police_station": "Mysuru Cyber PS",
        "district": "Mysuru District",
        "crime_head": "Cyber Fraud",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat(),
        "description": "Online phishing scam targeting bank customers in Mysuru. Fraudulent transfers made to multiple bank accounts.",
        "status": "Under Investigation",
        "accused": ["Suresh Patil"],
        "location": "Mysuru Gokulam Road",
        "phone_numbers": ["8765439001"],
        "vehicles": [],
        "bank_accounts": ["SBIN0002102"],
        "officer": "Officer Hegde"
    },
    {
        "id": "case-jn-robbery",
        "fir_number": "FIR-7011/2026",
        "police_station": "Jayanagar PS",
        "district": "Bengaluru City",
        "crime_head": "Robbery",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=8)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=8)).isoformat(),
        "description": "Chain snatching incident near Jayanagar 4th Block bus stand. Two suspects fled on a bike.",
        "status": "Under Investigation",
        "accused": ["Ramesh Kumar"],
        "location": "Jayanagar 4th Block",
        "phone_numbers": ["9000123456"],
        "vehicles": ["KA-05-AB-1234"],
        "bank_accounts": [],
        "officer": "Officer Patil"
    },
    {
        "id": "case-in-cyber",
        "fir_number": "FIR-8011/2026",
        "police_station": "Indiranagar PS",
        "district": "Bengaluru City",
        "crime_head": "Cyber Fraud",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=9)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=9)).isoformat(),
        "description": "E-commerce delivery fraud targeting residents in Indiranagar. Suspicious bank transfers recorded.",
        "status": "Closed",
        "accused": ["Suresh Patil"],
        "location": "Indiranagar 100ft Road",
        "phone_numbers": ["9876540123"],
        "vehicles": [],
        "bank_accounts": ["SBIN0001099"],
        "officer": "Officer Rao"
    }
])

G = nx.Graph()
for case in CASES_DB:
    fir = case["fir_number"]
    G.add_node(fir, type="incident", title=case["crime_head"])
    for acc in case["accused"]:
        G.add_node(acc, type="accused", name=acc)
        G.add_edge(fir, acc, relationship="COMMITTED")
        for acc2 in case["accused"]:
            if acc != acc2:
                G.add_edge(acc, acc2, relationship="ASSOCIATED_WITH")
    for ph in case["phone_numbers"]:
        G.add_node(ph, type="phone", label=ph)
        for acc in case["accused"]:
            G.add_edge(acc, ph, relationship="USED_PHONE")
    for veh in case["vehicles"]:
        G.add_node(veh, type="vehicle", label=veh)
        for acc in case["accused"]:
            G.add_edge(acc, veh, relationship="DRIVES")
    for bank in case["bank_accounts"]:
        G.add_node(bank, type="bank_account", label=bank)
        for acc in case["accused"]:
            G.add_edge(acc, bank, relationship="OWNS_ACCOUNT")


class LoginRequest(BaseModel):
    email: str
    password: str


class ChatQuery(BaseModel):
    message: str
    session_id: str
    language: str = "en"


class ChatTurn(BaseModel):
    role: str
    text: str


class ExportPdfRequest(BaseModel):
    session_id: str
    history: Optional[List[ChatTurn]] = None


# Note: serverless functions are stateless — this survives only within a warm
# instance. The PDF endpoint accepts the history from the client instead.
chat_histories: Dict[str, List[Dict[str, Any]]] = {}


@app.post("/api/v1/auth/login")
def login(payload: LoginRequest):
    user = OFFICERS_DB.get(payload.email)
    if not user or user["password_hash"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": "mock-jwt-token-123", "user": {"name": user["name"], "role": user["role"], "badge": user["badge"]}}


@app.post("/api/v1/chat/query")
def chat_query(payload: ChatQuery):
    msg = payload.message.strip().lower()
    
    # Clean the message from any prepended context tags to check for raw greetings
    import re
    clean_msg = re.sub(r'\[target suspect:.*?\]', '', msg)
    clean_msg = re.sub(r'\[target case:.*?\]', '', clean_msg)
    clean_msg = clean_msg.strip()

    greetings_pool = [
        "hi", "hello", "hey", "hii", "heyy", "heyyy", "good morning", "good afternoon", "good evening", 
        "namaste", "namaskara", "vanakkam", "how are you", "who are you", "what can you do", "help", 
        "thanks", "thank you", "awesome", "great"
    ]
    words = [w.strip(".,;:!?()-\"'/") for w in clean_msg.split()]
    is_greeting = any(g in clean_msg for g in ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste", "namaskara", "how are you", "who are you", "thanks", "thank you"]) or (len(words) >= 1 and all(w in greetings_pool for w in words))
    
    if is_greeting:
        response_msg = (
            "Hello! I am CrimeMind AI, your intelligence assistant. Please feel free to use this system "
            "for any of your enquiries, case searches, suspect profiling, or investigation questions. "
            "How can I assist you with your enquiries today?"
        )
        if any(k in clean_msg for k in ["thanks", "thank you", "great", "awesome"]):
            response_msg = "You're very welcome! I'm here to assist you anytime with your KSP investigation enquiries."
        elif "who are you" in clean_msg or "what can you do" in clean_msg:
            response_msg = (
                "I am CrimeMind AI, an advanced crime analysis virtual assistant for the Karnataka State Police (KSP). "
                "I can assist you with case lookup, suspect profiling, modus operandi analysis, phone/vehicle/bank account mapping, and statistical reports."
            )
            
        return {
            "message": response_msg,
            "sources": [],
            "confidence_score": 1.0,
            "evidence_trail": ["Friendly conversational greeting check triggered."],
            "evidence_metadata": {
                "matched_by": "Conversational Greeting",
                "records_found": 0,
                "data_source": "KSP System Assistant",
                "last_database_update": "Live Active Registry",
                "confidence": "Exact Match (100%)"
            }
        }
    
    # 1. Grounding Phase: Retrieve relevant cases
    query_lower = payload.message.lower()
    exact_matches = []
    
    # Match patterns like: "fir-10008/2020", "10008/2020", "fir-10008", or "fir 10008"
    import re
    fir_patterns = re.findall(r'(?:fir[- ]?)?\\d+/\\d+|(?:fir[- ]?)\\d+', query_lower)
    
    for c in CASES_DB:
        fir_no = c.get("fir_number", "").lower()
        if fir_no in query_lower:
            exact_matches.append(c)
        else:
            for pattern in fir_patterns:
                clean_pattern = pattern.replace("fir", "").replace("-", "").replace(" ", "").strip()
                if clean_pattern and clean_pattern in fir_no:
                    exact_matches.append(c)
                    break
                    
    if exact_matches:
        # Keep unique exact match cases
        seen = set()
        retrieved_cases = []
        for em in exact_matches:
            if em["fir_number"] not in seen:
                seen.add(em["fir_number"])
                retrieved_cases.append(em)
    else:
        # Simple retrieval since retrieve_relevant_cases is only in backend
        retrieved_cases = [c for c in CASES_DB if any(w in c["description"].lower() or w in c["crime_head"].lower() or w in c["location"].lower() for w in query_lower.split() if len(w) > 3)]
        if not retrieved_cases:
            retrieved_cases = CASES_DB[:5]

    response_msg = ""
    graph_nodes = []
    graph_edges = []
    confidence = 0.90
    evidence = []
    sources = []

    if NVIDIA_API_KEY:
        try:
            system_prompt = (
                "You are CrimeMind AI, an advanced crime analysis virtual assistant for the Karnataka State Police. "
                "You are talking to Inspector Gowda.\n\n"
                "Here is the database of cases (in JSON format):\n"
                f"{json.dumps(CASES_DB, indent=2)}\n\n"
                "Your task is to answer the user's query professionally.\n"
                "CRITICAL INSTRUCTION: You MUST answer ONLY the specific question asked by the user. Do NOT include any unrequested, extra, or unneeded details or analysis. Focus strictly on answering the user's query. If the user asks about a specific case or FIR number, respond ONLY with information regarding that case/FIR and do NOT describe, mention, or link other cases unless explicitly asked to do so.\n"
                "If the user asks a specific question (such as asking for suspects, date, status, location, officer, etc.), answer ONLY that specific question directly and concisely. Do NOT include any structured list of all metadata fields unless the user explicitly requests 'details', 'full details', 'case card', or the complete case file/record.\n"
                f"The user's query is: '{payload.message}'\n"
                f"The response language must be: '{payload.language}' (en=English, kn=Kannada, hi=Hindi, te=Telugu, ta=Tamil).\n\n"
                "You MUST respond ONLY with a valid JSON object matching this structure (do not include markdown block syntax or extra text):\n"
                "{\n"
                '  "message": "your detailed response written in the requested language",\n'
                '  "sources": ["list of case FIR numbers that are relevant, e.g. [\'FIR-10235/2026\']"],\n'
                '  "confidence_score": 0.95,\n'
                '  "evidence_trail": ["short sentence explaining piece of evidence", "another piece of evidence"]\n'
                "}"
            )

            headers = {
                "Authorization": f"Bearer {NVIDIA_API_KEY}",
                "Content-Type": "application/json",
            }
            api_payload = {
                "model": NVIDIA_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": payload.message}
                ],
                "temperature": 0.2,
                "max_tokens": 1024,
            }

            resp = None
            for attempt in range(3):
                try:
                    resp = requests.post(
                        "https://integrate.api.nvidia.com/v1/chat/completions",
                        headers=headers,
                        json=api_payload,
                        timeout=30.0
                    )
                    if resp.status_code >= 500:
                        raise requests.exceptions.RequestException(f"Server error {resp.status_code}")
                    break
                except (requests.exceptions.Timeout, requests.exceptions.RequestException) as e:
                    if attempt < 2:
                        import time
                        time.sleep(1.0 * (attempt + 1))
                    else:
                        raise e

            if resp is not None and resp.status_code == 200:
                result_json = resp.json()
                content = result_json["choices"][0]["message"]["content"].strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

                parsed_res = json.loads(content)
                response_msg = parsed_res.get("message", "")
                sources = parsed_res.get("sources", [])
                confidence = parsed_res.get("confidence_score", 0.90)
                evidence = parsed_res.get("evidence_trail", [])
            else:
                status_code = resp.status_code if resp is not None else "unknown"
                evidence = [f"NVIDIA API Error: Status {status_code}. Graceful fallback applied."]
        except Exception as e:
            evidence = [f"Failed to call NVIDIA API: {str(e)}. Graceful fallback applied."]

    if not response_msg:
        # Detect greetings or general chat queries
        greetings = ["hi", "hello", "hey", "hii", "heyy", "good morning", "good afternoon", "good evening", "namaste", "namaskara", "yo"]
        import re
        clean_msg = re.sub(r'\[target suspect:.*?\]', '', msg)
        clean_msg = re.sub(r'\[target case:.*?\]', '', clean_msg)
        clean_msg_stripped = re.sub(r'[.,;:!?()"\-\'/]', '', clean_msg.strip().lower())
        words = clean_msg_stripped.split()
        
        is_greeting = len(words) >= 1 and all(w in greetings for w in words)
        is_casual = clean_msg_stripped in ["how are you", "who are you", "what can you do", "help"]

        if is_greeting or is_casual:
            response_msg = (
                "Hello! I am CrimeMind AI, your digital intelligence assistant for the Karnataka State Police. "
                "How can I help you with your cases, suspect profiling, or analysis enquiries today?"
            )
            if payload.language == "kn":
                response_msg = "ನಮಸ್ಕಾರ! ನಾನು ಕ್ರೈಮ್‌ಮೈಂಡ್ ಎಐ ಸಹಾಯಕಿ. ಪ್ರಕರಣಗಳ ವಿಶ್ಲೇಷಣೆ, ಶಂಕಿತರ ವಿವರ ಅಥವಾ ತನಿಖಾ ವಿಚಾರಣೆಗಳ ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"
            elif payload.language == "hi":
                response_msg = "नमस्ते! मैं क्राइममाइंड एआई सहायक हूँ। मामलों के विश्लेषण, संदिग्धों के विवरण या जांच से जुड़े प्रश्नों में आज मैं आपकी क्या सहायता कर सकता हूँ?"
            elif payload.language == "te":
                response_msg = "నమస్కారం! నేను క్రైమ్‌మైండ్ AI అసిస్టెంట్‌ని. ఈ రోజు కేసుల విశ్లేషణ లేదా అనుమానితుల వివరాల గురించి నేను మీకు ఎలా సహాయపడగలను?"
            elif payload.language == "ta":
                response_msg = "வணக்கம்! நான் கிரைம்மைண்ட் AI உதவியாளர். வழக்குகள் அல்லது சந்தேக நபர்களைப் பற்றிய தகவல்களைக் கண்டறிய இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?"
            sources = []
            confidence = -1
            evidence = []
        else:
            if retrieved_cases:
                sources = [c["fir_number"] for c in retrieved_cases]
                evidence = [f"Retrieved {len(retrieved_cases)} cases matching query terms."]
                confidence = 0.94
                
                # Check if the query is asking for a specific field of the case to answer precisely
                q_clean = clean_msg.lower()
                templates = {
                    "en": {
                        "suspects": "The suspect(s) for case {fir}: {val}.",
                        "officer": "The investigating officer for case {fir}: {val}.",
                        "station": "The police station for case {fir}: {val}.",
                        "district": "The district for case {fir}: {val}.",
                        "date": "The registration date for case {fir}: {val}.",
                        "status": "The case status for case {fir}: {val}.",
                        "crime": "The crime type for case {fir}: {val}.",
                        "location": "The location for case {fir}: {val}.",
                        "phone": "The phone number(s) linked to case {fir}: {val}.",
                        "vehicle": "The vehicle(s) linked to case {fir}: {val}.",
                        "bank": "The bank account(s) linked to case {fir}: {val}.",
                        "summary": "The summary for case {fir}: {val}.",
                        "header": "CrimeMind AI: Found the following relevant case records in the database:"
                    },
                    "kn": {
                        "suspects": "ಪ್ರಕರಣ {fir} ರ ಆರೋಪಿ(ಗಳು): {val}.",
                        "officer": "ಪ್ರಕರಣ {fir} ರ ತನಿಖಾಧಿಕಾರಿ: {val}.",
                        "station": "ಪ್ರಕರಣ {fir} ರ ಪೊಲೀಸ್ ಠಾಣೆ: {val}.",
                        "district": "ಪ್ರಕರಣ {fir} ರ ಜಿಲ್ಲೆ: {val}.",
                        "date": "ಪ್ರಕರಣ {fir} ರ ನೋಂದಣಿ ದಿನಾಂಕ: {val}.",
                        "status": "ಪ್ರಕರಣ {fir} ರ ಸ್ಥಿತಿ: {val}.",
                        "crime": "ಪ್ರಕರಣ {fir} ರ ಅಪರಾಧ ಪ್ರಕಾರ: {val}.",
                        "location": "ಪ್ರಕರಣ {fir} ರ ಘಟನಾ ಸ್ಥಳ: {val}.",
                        "phone": "ಪ್ರಕರಣ {fir} ಗೆ ಲಿಂಕ್ ಮಾಡಲಾದ ಫೋನ್ ಸಂಖ್ಯೆ(ಗಳು): {val}.",
                        "vehicle": "ಪ್ರಕರಣ {fir} ಗೆ ಲಿಂಕ್ ಮಾಡಲಾದ ವಾಹನ(ಗಳು): {val}.",
                        "bank": "ಪ್ರಕರಣ {fir} ಗೆ ಲಿಂಕ್ ಮಾಡಲಾದ ಬ್ಯಾಂಕ್ ಖಾತೆ(ಗಳು): {val}.",
                        "summary": "ಪ್ರಕರಣ {fir} ರ ಸಾರಾಂಶ: {val}.",
                        "header": "CrimeMind AI: ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಈ ಕೆಳಗಿನ ಪ್ರಸ್ತುತ ಪ್ರಕರಣ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿವೆ:"
                    },
                    "hi": {
                        "suspects": "मामला {fir} के संदिग्ध: {val}.",
                        "officer": "मामला {fir} के जांच अधिकारी: {val}.",
                        "station": "मामला {fir} का पुलिस स्टेशन: {val}.",
                        "district": "मामला {fir} का जिला: {val}.",
                        "date": "मामला {fir} की पंजीकरण तिथि: {val}.",
                        "status": "मामला {fir} की स्थिति: {val}.",
                        "crime": "मामला {fir} का अपराध प्रकार: {val}.",
                        "location": "मामला {fir} का घटना स्थल: {val}.",
                        "phone": "मामला {fir} से जुड़े phone number: {val}.",
                        "vehicle": "मामला {fir} से जुड़े वाहन: {val}.",
                        "bank": "मामला {fir} से जुड़े बैंक खाते: {val}.",
                        "summary": "मामला {fir} का विवरण: {val}.",
                        "header": "CrimeMind AI: डेटाबेस में निम्नलिखित प्रासंगिक मामले के रिकॉर्ड मिले:"
                    },
                    "te": {
                        "suspects": "కేసు {fir} యొక్క నిందితులు: {val}.",
                        "officer": "కేసు {fir} యొక్క దర్యాప్తు అధికారి: {val}.",
                        "station": "కేసు {fir} యొక్క పోలీస్ స్టేషన్: {val}.",
                        "district": "కేసు {fir} యొక్క జిల్లా: {val}.",
                        "date": "కేసు {fir} యొక్క నమోదు తేదీ: {val}.",
                        "status": "కేసు {fir} యొక్క స్థితి: {val}.",
                        "crime": "కేసు {fir} యొక్క నేరం రకం: {val}.",
                        "location": "కేసు {fir} యొక్క ఘటన స్థలం: {val}.",
                        "phone": "కేసు {fir} తో అనుసంధానించబడిన ఫోన్ నంబర్లు: {val}.",
                        "vehicle": "కేసు {fir} తో అనుసంధానించబడిన వాహనాలు: {val}.",
                        "bank": "కేసు {fir} తో అనుసంధానించబడిన బ్యాంక్ ఖాతాలు: {val}.",
                        "summary": "కేసు {fir} యొక్క సారాంశం: {val}.",
                        "header": "CrimeMind AI: డేటాబేస్లో క్రింది సంబంధిత కేస్ రికార్డులు కనుగొనబడ్డాయి:"
                    },
                    "ta": {
                        "suspects": "வழக்கு {fir}-இன் சந்தேக நபர்கள்: {val}.",
                        "officer": "வழக்கு {fir}-இன் விசாரணை அதிகாரி: {val}.",
                        "station": "வழக்கு {fir}-இன் காவல் நிலையம்: {val}.",
                        "district": "வழக்கு {fir}-இன் மாவட்டம்: {val}.",
                        "date": "வழக்கு {fir}-இன் பதிவு தேதி: {val}.",
                        "status": "வழக்கு {fir}-இன் நிலை: {val}.",
                        "crime": "வழக்கு {fir}-இன் குற்ற வகை: {val}.",
                        "location": "வழக்கு {fir} நடந்த இடம்: {val}.",
                        "phone": "வழக்கு {fir}-உடன் தொடர்புடைய தொலைபேசி எண்கள்: {val}.",
                        "vehicle": "வழக்கு {fir}-உடன் தொடர்புடைய வாகனங்கள்: {val}.",
                        "bank": "வழக்கு {fir}-உடன் தொடர்புடைய வங்கி கணக்குகள்: {val}.",
                        "summary": "வழக்கு {fir}-இன் சுருக்கம்: {val}.",
                        "header": "CrimeMind AI: தரவுத்தளத்தில் பின்வரும் தொடர்புடைய வழக்கு பதிவுகள் கண்டறியப்பட்டன:"
                    }
                }
                
                lang = payload.language if payload.language in templates else "en"
                
                # Check for specific attribute requests
                matched_field = None
                if any(k in q_clean for k in ["suspect", "accused", "who is the accused", "who committed"]):
                    matched_field = "suspects"
                elif any(k in q_clean for k in ["officer", "investigator", "who is the officer", "who is investigating"]):
                    matched_field = "officer"
                elif any(k in q_clean for k in ["police station", "station"]):
                    matched_field = "station"
                elif "district" in q_clean:
                    matched_field = "district"
                elif any(k in q_clean for k in ["date", "when"]):
                    matched_field = "date"
                elif "status" in q_clean:
                    matched_field = "status"
                elif any(k in q_clean for k in ["crime type", "crime head", "type of crime"]):
                    matched_field = "crime"
                elif any(k in q_clean for k in ["location", "place", "where did it occur"]):
                    matched_field = "location"
                elif any(k in q_clean for k in ["phone", "mobile", "number"]):
                    matched_field = "phone"
                elif any(k in q_clean for k in ["vehicle", "car", "bike", "plate"]):
                    matched_field = "vehicle"
                elif any(k in q_clean for k in ["bank", "account"]):
                    matched_field = "bank"
                elif any(k in q_clean for k in ["summary", "description"]):
                    matched_field = "summary"
                
                if matched_field and not any(k in q_clean for k in ["details", "full details", "case card", "complete file", "complete record"]):
                    response_msg = ""
                    for c in retrieved_cases:
                        fir = c["fir_number"]
                        if matched_field == "suspects":
                            val = ", ".join(c["accused"])
                        elif matched_field == "officer":
                            val = "Officer Gowda"  # mock default
                        elif matched_field == "station":
                            val = c["police_station"]
                        elif matched_field == "district":
                            val = c["district"]
                        elif matched_field == "date":
                            val = c["date_of_registration"][:10]
                        elif matched_field == "status":
                            val = c["status"]
                        elif matched_field == "crime":
                            val = c["crime_head"]
                        elif matched_field == "location":
                            val = c["location"]
                        elif matched_field == "phone":
                            val = ", ".join(c.get("phone_numbers", [])) if c.get("phone_numbers") else "None"
                        elif matched_field == "vehicle":
                            val = ", ".join(c.get("vehicles", [])) if c.get("vehicles") else "None"
                        elif matched_field == "bank":
                            val = ", ".join(c.get("bank_accounts", [])) if c.get("bank_accounts") else "None"
                        elif matched_field == "summary":
                            val = c["description"]
                        
                        response_msg += templates[lang][matched_field].format(fir=fir, val=val) + "\n"
                    response_msg = response_msg.strip()
                else:
                    header_msg = templates[lang]["header"] + "\n\n"
                    response_msg = header_msg
                    for c in retrieved_cases:
                        response_msg += (
                            f"### Case Card: {c['fir_number']}\n"
                            f"- **FIR Number**: {c['fir_number']}\n"
                            f"- **Police Station**: {c['police_station']}\n"
                            f"- **District**: {c['district']}\n"
                            f"- **Date**: {c['date_of_registration'][:10]}\n"
                            f"- **Crime Type**: {c['crime_head']}\n"
                            f"- **Case Status**: {c['status']}\n"
                            f"- **Suspects**: {', '.join(c['accused'])}\n"
                            f"- **Summary**: {c['description']}\n\n"
                        )
            else:
                response_msg = "Welcome to KSP CrimeMind AI. I can assist you with case summaries, modus operandi matching, or relationship network visualization. Please specify an FIR number, suspect, or crime location."
                if payload.language == "kn":
                    response_msg = "CrimeMind AI ಗೆ ಸುಸ್ವಾಗತ. ಪ್ರಕರಣದ ಸಾರಾಂಶಗಳು, ಅಥವಾ ಅಪರಾಧ ಜಾಲದ ದೃಶ್ಯೀಕರಣದಲ್ಲಿ ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ದಯವಿಟ್ಟು FIR ಸಂಖ್ಯೆ ಅಥವಾ ಶಂಕಿತರ ಹೆಸರನ್ನು ನಮೂದಿಸಿ."
                elif payload.language == "hi":
                    response_msg = "CrimeMind AI में आपका स्वागत है। मैं मामले के सारांश, और नेटवर्क विज़ुअलाइज़ेशन में आपकी सहायता कर सकता हूँ। कृपया FIR संख्या या संदिग्ध का उल्लेख करें।"
                elif payload.language == "te":
                    response_msg = "CrimeMind AI కు స్వాగతం. కేసు సారాంశాలు మరియు నెట్‌వర్క్ విజువలైజేషన్‌లో నేను మీకు సహాయం చేయగలను. దయచేసి FIR సంఖ్య లేదా అనుమానితుడిని పేర్కొనండి."
                elif payload.language == "ta":
                    response_msg = "CrimeMind AI க்கு வரவேற்கிறோம். வழக்கு சுருக்கங்கள் அல்லது நெட்வொர்க் காட்சிப்படுத்தலில் நான் உங்களுக்கு உதவ முடியும். தயவுசெய்து FIR எண் அல்லது சந்தேக நபரை குறிப்பிடவும்."
                sources = []
                evidence = ["No matching cases found in database."]

    subgraph_nodes = set()
    for src in sources:
        if src in G:
            subgraph_nodes.add(src)
            subgraph_nodes.update(G.neighbors(src))

    if not subgraph_nodes:
        subgraph_nodes = list(G.nodes)[:10]

    for node in subgraph_nodes:
        node_type = G.nodes[node].get("type", "entity")
        graph_nodes.append({
            "id": node,
            "label": G.nodes[node].get("name", G.nodes[node].get("label", node)),
            "type": node_type
        })

    for u, v in G.edges:
        if u in subgraph_nodes and v in subgraph_nodes:
            graph_edges.append({
                "source": u,
                "target": v,
                "relationship": G.edges[u, v].get("relationship", "LINKED")
            })

    result = {
        "message": response_msg,
        "sources": sources,
        "confidence_score": confidence,
        "evidence_trail": evidence,
        "graph_data": {
            "nodes": graph_nodes,
            "links": graph_edges
        }
    }

    chat_histories.setdefault(payload.session_id, [])
    chat_histories[payload.session_id].append({"role": "user", "text": payload.message})
    chat_histories[payload.session_id].append({"role": "assistant", "text": response_msg})
    return result


@app.get("/api/v1/analytics/stats")
def get_analytics_stats():
    # 1. Compute classifications
    classifications = []
    if os.path.exists(CSV_CASES_PATH):
        try:
            counts = {}
            with open(CSV_CASES_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    desc = row.get("Crime Description")
                    if desc:
                        counts[desc] = counts.get(desc, 0) + 1
            sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:8]
            for name, val in sorted_counts:
                classifications.append({
                    "name": str(name).title(),
                    "value": int(val)
                })
        except Exception as e:
            print(f"Error classifications: {e}")
    if not classifications:
        classifications = [
            {"name": "Burglary", "value": 1980},
            {"name": "Vandalism", "value": 1975},
            {"name": "Fraud", "value": 1965},
            {"name": "Domestic Violence", "value": 1932},
            {"name": "Firearm Offense", "value": 1931},
            {"name": "Robbery", "value": 1928},
            {"name": "Kidnapping", "value": 1920},
            {"name": "Cybercrime", "value": 1899}
        ]

    # 2. Compute city_distribution
    city_distribution = []
    if os.path.exists(CSV_CASES_PATH):
        try:
            counts = {}
            with open(CSV_CASES_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    city = row.get("City")
                    if city:
                        counts[city] = counts.get(city, 0) + 1
            sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:8]
            for city, val in sorted_counts:
                city_distribution.append({
                    "name": str(city).title(),
                    "value": int(val)
                })
        except Exception as e:
            print(f"Error city distribution: {e}")
    if not city_distribution:
        city_distribution = [
            {"name": "Bengaluru", "value": 420},
            {"name": "Mumbai", "value": 380},
            {"name": "Delhi", "value": 510},
            {"name": "Chennai", "value": 290},
            {"name": "Kolkata", "value": 310},
            {"name": "Hyderabad", "value": 340},
            {"name": "Pune", "value": 220},
            {"name": "Jaipur", "value": 180}
        ]

    # 3. Compute trends
    trends = []
    if os.path.exists(CSV_STATS_PATH):
        try:
            july_housebreak = 10
            july_theft = 0
            july_fraud = 15
            
            aug_housebreak = 10
            aug_theft = 0
            aug_fraud = 15
            
            with open(CSV_STATS_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    sec = str(row.get("Crime + Legal Section", "")).lower()
                    
                    try:
                        july_val = float(row.get("Number of cases in July(2025)", 0))
                    except ValueError:
                        july_val = 0.0
                        
                    try:
                        aug_val = float(row.get("Number of cases in Aug(2025)", 0))
                    except ValueError:
                        aug_val = 0.0
                        
                    july_theft += july_val
                    aug_theft += aug_val
                    
                    if "house-break" in sec or "theft" in sec:
                        july_housebreak += july_val
                        aug_housebreak += aug_val
                        
                    if "cyber" in sec or "cheat" in sec or "forgery" in sec:
                        july_fraud += july_val
                        aug_fraud += aug_val
                        
            trends = [
                {"month": "Aug-24", "Burglaries": 105, "Theft": 240, "Fraud": 140},
                {"month": "Jan-25", "Burglaries": 110, "Theft": 260, "Fraud": 150},
                {"month": "Mar-25", "Burglaries": 125, "Theft": 280, "Fraud": 165},
                {"month": "May-25", "Burglaries": 130, "Theft": 295, "Fraud": 180},
                {"month": "Jul-25", "Burglaries": int(july_housebreak), "Theft": int(july_theft), "Fraud": int(july_fraud)},
                {"month": "Aug-25", "Burglaries": int(aug_housebreak), "Theft": int(aug_theft), "Fraud": int(aug_fraud)}
            ]
        except Exception as e:
            print(f"Error trends: {e}")
    if not trends:
        trends = [
            {"month": "Jan", "Burglaries": 12, "Theft": 34, "Fraud": 18},
            {"month": "Feb", "Burglaries": 15, "Theft": 30, "Fraud": 24},
            {"month": "Mar", "Burglaries": 22, "Theft": 42, "Fraud": 28},
            {"month": "Apr", "Burglaries": 18, "Theft": 45, "Fraud": 35},
            {"month": "May", "Burglaries": 27, "Theft": 38, "Fraud": 42},
            {"month": "Jun", "Burglaries": 31, "Theft": 50, "Fraud": 39}
        ]

    # 4. Compute summary details
    active_cases = 142
    closed_cases = 0
    total_cases = 0
    suspects_monitored = 89
    match_rate = "92%"
    
    if os.path.exists(CSV_CASES_PATH):
        try:
            active_cases = 0
            deployed_total = 0.0
            with open(CSV_CASES_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    total_cases += 1
                    closed = str(row.get("Case Closed", "No")).strip().lower() == "yes"
                    if closed:
                        closed_cases += 1
                    else:
                        active_cases += 1
                    
                    try:
                        deployed = float(row.get("Police Deployed", 0))
                    except ValueError:
                        deployed = 0.0
                    deployed_total += deployed
                    
            if active_cases < 50:
                active_cases = max(142, int(total_cases * 0.45))
            match_rate = f"{round((closed_cases / total_cases) * 100)}%" if total_cases > 0 else "92%"
            suspects_monitored = int(deployed_total // 1000)
            if suspects_monitored < 10:
                suspects_monitored = 89
        except Exception:
            pass

    threat_level = "High Volume: Theft"
    if os.path.exists(CSV_STATS_PATH):
        try:
            with open(CSV_STATS_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                max_cases = -1
                top_crime = "Theft"
                for row in reader:
                    try:
                        val = float(row.get("Number of cases from Jan to Aug(2025)", 0))
                    except ValueError:
                        val = 0.0
                    if val > max_cases:
                        max_cases = val
                        top_crime = str(row.get("Crime + Legal Section", "Theft")).split("(")[0].strip()
                threat_level = f"High Volume: {top_crime}"
        except Exception:
            pass

    return {
        "trends": trends,
        "classifications": classifications,
        "city_distribution": city_distribution,
        "summary": {
            "active_cases": active_cases,
            "suspects_monitored": suspects_monitored,
            "match_rate": match_rate,
            "threat_level": threat_level
        }
    }


@app.get("/api/v1/cases/all")
def get_cases():
    return CASES_DB


@app.post("/api/v1/chat/export-pdf")
def export_pdf(payload: ExportPdfRequest):
    # Prefer client-supplied history: serverless instances don't share memory.
    if payload.history:
        history = [{"role": t.role, "text": t.text} for t in payload.history]
    else:
        history = chat_histories.get(payload.session_id, [
            {"role": "user", "text": "Show recent vehicle thefts in Bengaluru."},
            {"role": "assistant", "text": "Found 3 Royal Enfield theft cases in Indiranagar. Stolen vehicles: KA-05-MJ-1001, KA-05-MJ-1002."}
        ])

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("CrimeMind AI - Karnataka State Police", styles["Title"]))
    story.append(Paragraph(f"Session Report - Exported at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    story.append(Spacer(1, 20))

    for chat in history:
        role = "Investigator" if chat["role"] == "user" else "CrimeMind AI"
        text = escape(chat["text"])
        story.append(Paragraph(f"<b>{role}:</b> {text}", styles["BodyText"]))
        story.append(Spacer(1, 10))

    doc.build(story)
    pdf_bytes = buffer.getvalue()

    safe_id = "".join(ch for ch in payload.session_id if ch.isalnum() or ch == "-")[:12]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="chat_history_{safe_id}.pdf"'}
    )
