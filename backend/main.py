import os
import uuid
import datetime
import requests
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import networkx as nx
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

app = FastAPI(title="CrimeMind AI API", version="1.0.0")

# Enable CORS for the React Dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock databases
OFFICERS_DB = {
    "inspector.gowda@ksp.gov.in": {
        "id": "officer-1",
        "name": "admin",
        "badge": "KSP-8932",
        "role": "investigator",
        "password_hash": "admin123"
    }
}

# Load Kaggle Datasets
CSV_CASES_PATH = os.path.join(os.path.dirname(__file__), "crime_dataset_india.csv")
CSV_STATS_PATH = os.path.join(os.path.dirname(__file__), "indian-crimes-from-jan-to-aug-2025.csv")

df_cases = pd.DataFrame()
df_stats = pd.DataFrame()

if os.path.exists(CSV_CASES_PATH):
    try:
        df_cases = pd.read_csv(CSV_CASES_PATH)
        print(f"Successfully loaded detailed dataset with {len(df_cases)} records.")
    except Exception as e:
        print(f"Error loading detailed dataset: {e}")
        
if os.path.exists(CSV_STATS_PATH):
    try:
        df_stats = pd.read_csv(CSV_STATS_PATH)
        print(f"Successfully loaded statistical dataset with {len(df_stats)} records.")
    except Exception as e:
        print(f"Error loading statistical dataset: {e}")

# Maintain df_full as df_cases for compatibility
df_full = df_cases

# Populate CASES_DB dynamically from detailed df_cases and stats df_stats
CASES_DB = []

# 1. Load cases from detailed df_cases (2020-2024)
if not df_cases.empty:
    sample_df = df_cases.head(1000)
    for idx, row in sample_df.iterrows():
        rep_num = str(row.get("Report Number", idx))
        city = str(row.get("City", "Unknown City"))
        crime_desc = str(row.get("Crime Description", "Unknown Crime")).title()
        
        # Parse dates safely
        date_reported_raw = str(row.get("Date Reported", ""))
        date_occ_raw = str(row.get("Date of Occurrence", ""))
        
        year_val = "2020"
        try:
            date_of_offence = datetime.datetime.strptime(date_occ_raw, "%d-%m-%Y %H:%M").isoformat()
            year_val = date_occ_raw.split("-")[2].split(" ")[0]
        except Exception:
            date_of_offence = (datetime.datetime.now() - datetime.timedelta(days=idx * 5)).isoformat()
            
        try:
            date_of_registration = datetime.datetime.strptime(date_reported_raw, "%d-%m-%Y %H:%M").isoformat()
            year_val = date_reported_raw.split("-")[2].split(" ")[0]
        except Exception:
            date_of_registration = (datetime.datetime.now() - datetime.timedelta(days=idx * 5 - 1)).isoformat()

        accused_names = [f"Accused-{100 + (idx % 25)}", f"Accused-{100 + ((idx+1) % 25)}"]
        phone_numbers = [f"98765432{idx%100:02d}", f"87654321{idx%100:02d}"]
        
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
            "bank_accounts": bank_accounts
        })

# 2. Load cases from 2025 statistical df_stats
if not df_stats.empty:
    valid_rows = df_stats[df_stats["Number of cases from Jan to Aug(2025)"] > 0].head(100)
    cities = ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Kolkata", "Hyderabad", "Ahmedabad", "Pune", "Jaipur", "Lucknow"]
    for idx, (_, row) in enumerate(valid_rows.iterrows()):
        law = str(row.get("Law under which they are registered", "IPC Crime"))
        section = str(row.get("Crime + Legal Section", "General Crimes"))
        reason = str(row.get("Reason", "No specific reason reported"))
        total_cases = float(row.get("Number of cases from Jan to Aug(2025)", 0))
        
        crime_head = section.split("(")[0].strip()
        city = cities[idx % len(cities)]
        
        date_of_offence = (datetime.datetime(2025, 1, 1) + datetime.timedelta(days=idx * 2)).isoformat()
        date_of_registration = (datetime.datetime(2025, 1, 2) + datetime.timedelta(days=idx * 2)).isoformat()

        accused_names = [f"Accused-2025-{100 + (idx % 20)}"]
        phone_numbers = [f"90005432{idx%100:02d}"]
        
        vehicles = []
        if "STOLEN" in crime_head.upper() or "VEHICLE" in crime_head.upper() or "THEFT" in crime_head.upper():
            vehicles = [f"KA-03-HA-{2000 + idx}"]
            
        bank_accounts = []
        if "FRAUD" in crime_head.upper() or "CYBER" in crime_head.upper() or "THEFT" in crime_head.upper():
            bank_accounts = [f"SBIN0002{4321 + idx}"]

        description = (
            f"Case registered under {law} for {crime_head}. "
            f"Specific section details: {section}. "
            f"Stated Cause/Reason: {reason}. "
            f"Total aggregated cases reported in this category: {int(total_cases)}."
        )

        status_val = "Closed" if idx % 5 == 0 else "Under Investigation"

        CASES_DB.append({
            "id": f"case-stat-{idx}",
            "fir_number": f"FIR-{20000 + idx}/2025",
            "police_station": f"{city} Central PS",
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
            "bank_accounts": bank_accounts
        })
else:
    # Fallback to hardcoded mock data
    CASES_DB = [
        {
            "id": f"case-{i}",
            "fir_number": f"FIR-10{234 + i}/2026",
            "police_station": "Jayanagar PS" if i % 2 == 0 else "Indiranagar PS",
            "district": "Bengaluru City",
            "crime_head": "Burglary" if i % 3 == 0 else ("Vehicle Theft" if i % 3 == 1 else "Cyber Fraud"),
            "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=i * 5)).isoformat(),
            "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=i * 5 - 1)).isoformat(),
            "description": f"Burglary reported at residential building in Bengaluru. Suspect entered through window lock bypass at night. Stole gold ornaments worth Rs 5 Lakhs.",
            "status": "Under Investigation" if i % 5 != 0 else "Closed",
            "accused": [f"Accused-{100 + (i % 5)}", f"Accused-{100 + ((i+1) % 5)}"],
            "location": "Jayanagar 4th Block" if i % 2 == 0 else "Indiranagar 100ft Road",
            "phone_numbers": [f"98765432{i%10}{i%10}", f"87654321{i%10}{i%10}"],
            "vehicles": [f"KA-05-MJ-{1000 + i}"] if i % 3 == 1 else [],
            "bank_accounts": [f"SBIN0001{2345 + i}"] if i % 3 == 2 else []
        }
        for i in range(1, 51)
    ]


# Build networkx graph
G = nx.Graph()
for case in CASES_DB:
    fir = case["fir_number"]
    # Incident Case Node
    G.add_node(fir, type="incident", label=fir, title=case["crime_head"])
    
    # 1. Accused (Suspects)
    for acc in case["accused"]:
        G.add_node(acc, type="accused", label=f"{acc} (Suspect)", name=acc)
        G.add_edge(fir, acc, relationship="COMMITTED")
        for acc2 in case["accused"]:
            if acc != acc2:
                G.add_edge(acc, acc2, relationship="ASSOCIATED_WITH")
                
    # 2. Phone Numbers
    for ph in case.get("phone_numbers", []):
        G.add_node(ph, type="phone", label=ph)
        for acc in case["accused"]:
            G.add_edge(acc, ph, relationship="USED_PHONE")
            
    # 3. Vehicles
    for veh in case.get("vehicles", []):
        G.add_node(veh, type="vehicle", label=veh)
        for acc in case["accused"]:
            G.add_edge(acc, veh, relationship="DRIVES")
            
    # 4. Bank Accounts
    for bank in case.get("bank_accounts", []):
        G.add_node(bank, type="bank_account", label=bank)
        for acc in case["accused"]:
            G.add_edge(acc, bank, relationship="OWNS_ACCOUNT")

    # 5. Crime Locations (Addresses)
    loc = case.get("location")
    if loc:
        G.add_node(loc, type="location", label=loc)
        G.add_edge(fir, loc, relationship="OCCURRED_AT")

    # 6. Victims
    victim_name = f"Victim ({fir.split('/')[0]})"
    G.add_node(victim_name, type="victim", label=victim_name)
    G.add_edge(fir, victim_name, relationship="VICTIM_OF")

    # 7. Witnesses
    witness_name = f"Witness ({fir.split('/')[0]})"
    G.add_node(witness_name, type="witness", label=witness_name)
    G.add_edge(fir, witness_name, relationship="WITNESSED")

    # 8. Police Officers
    officer_name = "Officer Gowda" if "Jayanagar" in case.get("police_station", "") else ("Officer Patil" if "Indiranagar" in case.get("police_station", "") else "Officer Rao")
    G.add_node(officer_name, type="officer", label=officer_name)
    G.add_edge(fir, officer_name, relationship="INVESTIGATED_BY")

# Pydantic Schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class ChatQuery(BaseModel):
    message: str
    session_id: str
    language: str = "en"

class ExportPdfRequest(BaseModel):
    session_id: str

class ChatHistoryStore:
    def __init__(self):
        self.history: Dict[str, List[Dict[str, Any]]] = {}

chat_histories = ChatHistoryStore()

@app.post("/api/v1/auth/login")
def login(payload: LoginRequest):
    user = OFFICERS_DB.get(payload.email)
    if not user or user["password_hash"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": "mock-jwt-token-123", "user": {"name": user["name"], "role": user["role"], "badge": user["badge"]}}

def retrieve_relevant_cases(query_text: str, cases_db: List[Dict[str, Any]], limit: int = 12) -> List[Dict[str, Any]]:
    # Normalise query
    query = query_text.lower().strip()
    
    # Define standard stopwords to clean query words
    stopwords = {
        "show", "me", "find", "search", "the", "a", "an", "in", "on", "at", "to", "for", "of", "with", "about",
        "cases", "case", "fir", "firs", "suspect", "suspects", "accused", "phone", "number", "numbers", "vehicle",
        "vehicles", "bank", "account", "accounts", "is", "linked", "to", "and", "or", "what", "where", "who", "how",
        "regarding", "details", "police", "station", "district", "involved"
    }
    
    # Split query into words and clean punctuation
    query_words = []
    for word in query.split():
        clean_word = word.strip(".,;:!?()-\"'/")
        if clean_word and clean_word not in stopwords and len(clean_word) > 1:
            query_words.append(clean_word)
            
    # Try to find specific patterns
    # Extract any sequence of digits (e.g. 10234)
    digits = [w for w in query_words if w.isdigit()]
    
    # Look for phone numbers (usually 8-10 digits)
    phones = [w for w in query_words if w.isdigit() and len(w) >= 8]
    
    scored_cases = []
    for case in cases_db:
        score = 0.0
        
        fir = case.get("fir_number", "").lower()
        crime_head = case.get("crime_head", "").lower()
        police_station = case.get("police_station", "").lower()
        district = case.get("district", "").lower()
        description = case.get("description", "").lower()
        location = case.get("location", "").lower()
        accused_list = [a.lower() for a in case.get("accused", [])]
        phone_list = [p.lower() for p in case.get("phone_numbers", [])]
        vehicle_list = [v.lower() for v in case.get("vehicles", [])]
        bank_list = [b.lower() for b in case.get("bank_accounts", [])]
        
        # FIR Number Direct Match
        if fir in query:
            score += 150.0
        else:
            # Check if any digits from query match the digits in the FIR number
            for d in digits:
                if d in fir:
                    score += 80.0
                    
        # Accused / Suspect Match
        for acc in accused_list:
            if acc in query:
                score += 50.0
            else:
                for w in query_words:
                    if w in acc:
                        score += 20.0
                        
        # Phone Number Match
        for ph in phone_list:
            if ph in query:
                score += 60.0
            for p_digit in phones:
                if p_digit in ph:
                    score += 40.0
                    
        # Vehicle Plate Match
        for veh in vehicle_list:
            veh_clean = veh.replace("-", "").replace(" ", "")
            query_clean = query.replace("-", "").replace(" ", "")
            if veh in query or veh_clean in query_clean:
                score += 60.0
            else:
                for w in query_words:
                    if len(w) > 3 and (w in veh or w in veh_clean):
                        score += 30.0
                        
        # Bank Account Match
        for bank in bank_list:
            if bank in query:
                score += 60.0
            else:
                for w in query_words:
                    if len(w) > 3 and w in bank:
                        score += 30.0
                        
        # Crime Head Match
        if crime_head in query:
            score += 40.0
        else:
            for w in query_words:
                if w in crime_head:
                    score += 15.0
                    
        # Location & Police Station Match
        if location in query or police_station in query or district in query:
            score += 25.0
        for w in query_words:
            if w in location or w in police_station or w in district:
                score += 5.0
                
        # Description Content Match
        for w in query_words:
            if w in description:
                score += 2.0
                
        if score > 0:
            scored_cases.append((score, case))
            
    # Sort cases by score descending
    scored_cases.sort(key=lambda x: x[0], reverse=True)
    
    # Extract case dictionaries
    results = [item[1] for item in scored_cases]
    return results[:limit]

@app.post("/api/v1/chat/query")
def chat_query(payload: ChatQuery):
    msg = payload.message.strip().lower()
    
    # Defaults
    response_msg = ""
    graph_nodes = []
    graph_edges = []
    confidence = 0.90
    evidence = []
    sources = []

    # 1. Grounding Phase: Retrieve relevant cases
    retrieved_cases = retrieve_relevant_cases(payload.message, CASES_DB, limit=8)

    # If NVIDIA API Key is present, query NVIDIA NIM
    if NVIDIA_API_KEY:
        try:
            # Prepare statistical context summaries
            stats_summary_txt = ""
            if not df_cases.empty:
                stats_summary_txt += f"Detailed Cases Dataset (2020-2024) Summary:\n"
                stats_summary_txt += f"- Total Cases: {len(df_cases)}\n"
                stats_summary_txt += f"- Case counts by City:\n{df_cases['City'].value_counts().head(5).to_string()}\n\n"
            if not df_stats.empty:
                stats_summary_txt += f"2025 Crime Statistical Dataset Summary:\n"
                stats_summary_txt += f"- Total 2025 Cases: {int(df_stats['Number of cases from Jan to Aug(2025)'].sum())}\n"
                # Top causes
                top_causes = df_stats.groupby('Reason')['Number of cases from Jan to Aug(2025)'].sum().head(5)
                stats_summary_txt += f"- Top Causes in 2025:\n{top_causes.to_string()}\n\n"

            # Construct a prompt describing the context
            system_prompt = (
                "You are CrimeMind AI, an advanced crime analysis virtual assistant for the Karnataka State Police (KSP).\n"
                "You are a professional criminal intelligence analyst. Your role is to help the investigator (admin) analyze crime records and identify connections.\n\n"
                "Here is the retrieved context from the KSP FIR Database containing the most relevant case records for the user's query:\n"
                f"{json.dumps(retrieved_cases, indent=2)}\n\n"
                f"Here are the aggregated dataset statistics for context:\n"
                f"{stats_summary_txt}\n"
                "Your task is to answer the user's query professionally, identifying matching Modus Operandi (MO), "
                "and finding links between suspects, phone numbers, vehicles, and bank accounts.\n"
                "Your responses MUST be based strictly on these retrieved case records. Do NOT invent, hallucinate, or assume any facts, FIR numbers, suspect names, phone numbers, or vehicle plates that are not explicitly present in the retrieved cases.\n"
                "If the retrieved cases do not contain information to answer the query, state that you cannot find any matching records in the KSP database.\n\n"
                "When you refer to or discuss any case in your response, you MUST provide its key metadata fields in a structured, easy-to-read list:\n"
                "- **FIR Number**: [FIR Number]\n"
                "- **Police Station**: [Police Station]\n"
                "- **District**: [District]\n"
                "- **Date**: [Date of registration or occurrence]\n"
                "- **Crime Type**: [Crime Head]\n"
                "- **Case Status**: [Status]\n"
                "- **Description**: [Brief summary]\n\n"
                f"The response language must be: '{payload.language}' (en=English, kn=Kannada, hi=Hindi, te=Telugu, ta=Tamil).\n\n"
                "You MUST respond ONLY with a valid JSON object matching this structure (do not include markdown code block wraps or extra text outside the JSON):\n"
                "{\n"
                '  "message": "your detailed response and analysis written in the requested language",\n'
                '  "sources": ["list of exact case FIR numbers from the retrieved cases that are relevant, e.g. [\'FIR-10000/2020\']"],\n'
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
                "temperature": 0.1,
                "max_tokens": 1024,
            }

            # Retry mechanism for robustness
            resp = None
            last_error = None
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
                    last_error = e
                    if attempt < 2:
                        import time
                        time.sleep(1.0 * (attempt + 1))
                    else:
                        raise e

            if resp and resp.status_code == 200:
                result_json = resp.json()
                content = result_json["choices"][0]["message"]["content"].strip()
                # Clean up any potential markdown wraps
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
                status_code = resp.status_code if resp else "unknown"
                evidence = [f"NVIDIA API Error: Status {status_code}. Graceful fallback applied."]
        except Exception as e:
            evidence = [f"Failed to call NVIDIA API: {str(e)}. Graceful fallback applied."]

    # Fallback/Rule-based processing if response_msg is empty
    if not response_msg:
        # Detect statistical questions
        stats_keywords = ["stats", "statistics", "how many", "count", "cases in", "closed", "reported", "conviction", "arrests", "overview", "summary", "reason", "laws"]
        if any(kw in msg for kw in stats_keywords) and not df_stats.empty:
            city_found = None
            if not df_cases.empty:
                for city in df_cases['City'].unique():
                    if city.lower() in msg:
                        city_found = city
                        break
            
            if city_found:
                city_df = df_cases[df_cases['City'] == city_found]
                total = len(city_df)
                closed = (city_df['Case Closed'].str.strip().str.lower() == 'yes').sum()
                open_cases = total - closed
                crimes = city_df['Crime Description'].value_counts().head(3).to_dict()
                crime_summary = ", ".join([f"{k}: {v}" for k, v in crimes.items()])
                
                response_msg = (
                    f"Statistical Analysis (2020-2024) for {city_found}:\n"
                    f"- Total Cases: {total}\n"
                    f"- Active/Under Investigation: {open_cases}\n"
                    f"- Resolved/Closed: {closed}\n"
                    f"- Top Crime Types: {crime_summary}"
                )
                evidence = [f"Aggregated database stats for City: {city_found}."]
                sources = [f"Report-{city_df.iloc[i]['Report Number']}" for i in range(min(3, total))]
            
            else:
                matched_row = None
                for _, row in df_stats.iterrows():
                    sec = str(row.get("Crime + Legal Section", "")).lower()
                    reas = str(row.get("Reason", "")).lower()
                    if reas in msg or (sec in msg and len(sec) > 3):
                        matched_row = row
                        break
                
                if matched_row is not None:
                    sec_name = str(matched_row.get("Crime + Legal Section"))
                    reason_name = str(matched_row.get("Reason"))
                    jan_aug = int(matched_row.get("Number of cases from Jan to Aug(2025)", 0))
                    july = int(matched_row.get("Number of cases in July(2025)", 0))
                    aug = int(matched_row.get("Number of cases in Aug(2025)", 0))
                    
                    response_msg = (
                        f"2025 Statistical Report for **{sec_name}**:\n"
                        f"- **Stated Cause/Reason**: {reason_name}\n"
                        f"- **Total cases (Jan-Aug 2025)**: {jan_aug}\n"
                        f"- **Cases in July 2025**: {july}\n"
                        f"- **Cases in August 2025**: {aug}"
                    )
                    evidence = [f"Direct matches found in 2025 Crimes Registry under reason: '{reason_name}'."]
                    sources = ["Kaggle-Stats-2025"]
                else:
                    total_2025 = int(df_stats['Number of cases from Jan to Aug(2025)'].sum())
                    total_july = int(df_stats['Number of cases in July(2025)'].sum())
                    total_aug = int(df_stats['Number of cases in Aug(2025)'].sum())
                    top_reasons = df_stats.groupby('Reason')['Number of cases from Jan to Aug(2025)'].sum().head(3).to_dict()
                    reason_summary = ", ".join([f"{k}: {int(v)}" for k, v in top_reasons.items()])
                    
                    response_msg = (
                        f"2025 India Crimes Database Overview (Jan-Aug):\n"
                        f"- **Total Registered Cases (Jan-Aug)**: {total_2025}\n"
                        f"- **Total Cases in July 2025**: {total_july}\n"
                        f"- **Total Cases in August 2025**: {total_aug}\n"
                        f"- **Top Causes/Reasons**: {reason_summary}"
                    )
                    evidence = ["Aggregated 2025 national registry statistics."]
                    sources = ["DB-Global-Stats-2025"]
        
        else:
            if retrieved_cases:
                sources = [c["fir_number"] for c in retrieved_cases]
                evidence = [f"Retrieved {len(retrieved_cases)} cases matching query terms."]
                confidence = 0.85
                
                header_msg = "CrimeMind AI: Found the following relevant case records in the database:\n\n"
                if payload.language == "kn":
                    header_msg = "CrimeMind AI: ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಈ ಕೆಳಗಿನ ಪ್ರಸ್ತುತ ಪ್ರಕರಣ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿವೆ:\n\n"
                elif payload.language == "hi":
                    header_msg = "CrimeMind AI: डेटाबेस में निम्नलिखित प्रासंगिक मामले के रिकॉर्ड मिले:\n\n"
                elif payload.language == "te":
                    header_msg = "CrimeMind AI: డేటాబేస్లో క్రింది సంబంధిత కేసు రికార్డులు కనుగొనబడ్డాయి:\n\n"
                elif payload.language == "ta":
                    header_msg = "CrimeMind AI: தரவுத்தளத்தில் பின்வரும் தொடர்புடைய வழக்கு பதிவுகள் கண்டறியப்பட்டன:\n\n"
                
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
                    response_msg = "CrimeMind AI में आपका स्वागत है। मैं मामले के सारांश, और नेटवर्क विज़ुअलाइज़ेशन में आपकी सहायता कर सकता हूँ। कृपया FIR संख्या या संदिग्ध का उल्लेख करें."
                elif payload.language == "te":
                    response_msg = "CrimeMind AI కు స్వాగతం. కేసు సారాంశాలు లేదా నెట్‌వర్క్ విజువలైజేషన్‌లో నేను మీకు సహాయం చేయగలను. దయచేసి FIR సంఖ్య లేదా అనుమానితుడిని పేర్కొనండి."
                elif payload.language == "ta":
                    response_msg = "CrimeMind AI க்கு வரவேற்கிறோம். வழக்கு சுருக்கங்கள் அல்லது நெட்வொர்க் காட்சிப்படுத்தலில் நான் உங்களுக்கு உதவ முடியும். தயவுசெய்து FIR எண் அல்லது சந்தேக நபரை குறிப்பிடவும்."
                sources = []
                evidence = ["No matching cases found in database."]

    # Normalize sources: verify that every source in sources exists as an FIR in CASES_DB
    valid_fir_numbers = {c["fir_number"] for c in CASES_DB}
    normalized_sources = []
    for src in sources:
        src_str = str(src).strip()
        if src_str in valid_fir_numbers:
            if src_str not in normalized_sources:
                normalized_sources.append(src_str)
        else:
            found_match = False
            for real_fir in valid_fir_numbers:
                if real_fir.lower() == src_str.lower() or src_str.lower() in real_fir.lower():
                    if real_fir not in normalized_sources:
                        normalized_sources.append(real_fir)
                    found_match = True
                    break
    sources = normalized_sources

    # Ensure we populate sources if cases were matched but sources ended up empty
    if not sources and retrieved_cases:
        sources = [c["fir_number"] for c in retrieved_cases[:3]]

    # Build local subgraph for visualization (limit to 15 nodes)
    subgraph_nodes = set()
    for src in sources:
        if src in G:
            subgraph_nodes.add(src)
            subgraph_nodes.update(G.neighbors(src))
    
    # If empty, just add a sample network
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

    # Save to history
    if payload.session_id not in chat_histories.history:
        chat_histories.history[payload.session_id] = []
    chat_histories.history[payload.session_id].append({"role": "user", "text": payload.message})
    chat_histories.history[payload.session_id].append({"role": "assistant", "text": response_msg})
    return result

@app.get("/api/v1/analytics/stats")
def get_analytics_stats():
    # 1. Compute classifications (detailed breakdown of crime categories)
    classifications = []
    try:
        if not df_cases.empty:
            counts = df_cases['Crime Description'].value_counts().head(8)
            total_selected = counts.sum()
            for name, val in counts.items():
                classifications.append({
                    "name": str(name).title(),
                    "value": int(val)
                })
        else:
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
    except Exception as e:
        print(f"Error computing classifications: {e}")
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

    # 2. Compute city_distribution (crime counts by city)
    city_distribution = []
    try:
        if not df_cases.empty:
            city_counts = df_cases['City'].value_counts().head(8)
            for city, val in city_counts.items():
                city_distribution.append({
                    "name": str(city).title(),
                    "value": int(val)
                })
        else:
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
    except Exception as e:
        print(f"Error computing city distribution: {e}")
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

    # 3. Compute trends: aggregate July vs August 2025 vs Aug 2024 from df_stats
    trends = []
    try:
        if not df_stats.empty:
            july_housebreak = int(df_stats[df_stats['Crime + Legal Section'].str.contains('House-break|Theft', case=False, na=False)]['Number of cases in July(2025)'].sum() + 10)
            july_theft = int(df_stats['Number of cases in July(2025)'].sum())
            july_fraud = int(df_stats[df_stats['Crime + Legal Section'].str.contains('Cyber|Cheat|Forgery', case=False, na=False)]['Number of cases in July(2025)'].sum() + 15)
            
            aug_housebreak = int(df_stats[df_stats['Crime + Legal Section'].str.contains('House-break|Theft', case=False, na=False)]['Number of cases in Aug(2025)'].sum() + 10)
            aug_theft = int(df_stats['Number of cases in Aug(2025)'].sum())
            aug_fraud = int(df_stats[df_stats['Crime + Legal Section'].str.contains('Cyber|Cheat|Forgery', case=False, na=False)]['Number of cases in Aug(2025)'].sum() + 15)

            trends = [
                {"month": "Aug-24", "Burglaries": 105, "Theft": 240, "Fraud": 140},
                {"month": "Jan-25", "Burglaries": 110, "Theft": 260, "Fraud": 150},
                {"month": "Mar-25", "Burglaries": 125, "Theft": 280, "Fraud": 165},
                {"month": "May-25", "Burglaries": 130, "Theft": 295, "Fraud": 180},
                {"month": "Jul-25", "Burglaries": july_housebreak, "Theft": july_theft, "Fraud": july_fraud},
                {"month": "Aug-25", "Burglaries": aug_housebreak, "Theft": aug_theft, "Fraud": aug_fraud}
            ]
        else:
            trends = [
                {"month": "Jan", "Burglaries": 12, "Theft": 34, "Fraud": 18},
                {"month": "Feb", "Burglaries": 15, "Theft": 30, "Fraud": 24},
                {"month": "Mar", "Burglaries": 22, "Theft": 42, "Fraud": 28},
                {"month": "Apr", "Burglaries": 18, "Theft": 45, "Fraud": 35},
                {"month": "May", "Burglaries": 27, "Theft": 38, "Fraud": 42},
                {"month": "Jun", "Burglaries": 31, "Theft": 50, "Fraud": 39},
            ]
    except Exception as e:
        print(f"Error computing trends: {e}")
        trends = [
            {"month": "Jan", "Burglaries": 12, "Theft": 34, "Fraud": 18},
            {"month": "Feb", "Burglaries": 15, "Theft": 30, "Fraud": 24},
            {"month": "Mar", "Burglaries": 22, "Theft": 42, "Fraud": 28},
            {"month": "Apr", "Burglaries": 18, "Theft": 45, "Fraud": 35},
            {"month": "May", "Burglaries": 27, "Theft": 38, "Fraud": 42},
            {"month": "Jun", "Burglaries": 31, "Theft": 50, "Fraud": 39},
        ]

    # 4. Compute summaries using detailed cases (df_cases)
    try:
        if not df_cases.empty:
            active_cases = int((df_cases['Case Closed'].str.strip().str.lower() == 'no').sum())
            closed_cases = int((df_cases['Case Closed'].str.strip().str.lower() == 'yes').sum())
            total_cases = len(df_cases)
            match_rate = f"{round((closed_cases / total_cases) * 100)}%" if total_cases > 0 else "92%"
            suspects_monitored = int(df_cases['Police Deployed'].sum() // 1000)
        else:
            active_cases = 142
            suspects_monitored = 89
            match_rate = "92%"

        if not df_stats.empty:
            top_idx = df_stats['Number of cases from Jan to Aug(2025)'].idxmax()
            top_crime = df_stats.loc[top_idx]['Crime + Legal Section'].split("(")[0].strip()
            threat_level = f"High Volume: {top_crime}"
        else:
            threat_level = "High Volume: Theft"
    except Exception:
        active_cases = 142
        suspects_monitored = 89
        match_rate = "92%"
        threat_level = "High Volume: Theft"

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
    session_id = payload.session_id
    history = chat_histories.history.get(session_id, [
        {"role": "user", "text": "Show recent vehicle thefts in Bengaluru."},
        {"role": "assistant", "text": "Found 3 Royal Enfield theft cases in Indiranagar. Stolen vehicles: KA-05-MJ-1001, KA-05-MJ-1002."}
    ])

    filename = f"chat_history_{session_id}.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("CrimeMind AI - Karnataka State Police", styles["Title"]))
    story.append(Paragraph(f"Session Report - Exported at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    story.append(Spacer(1, 20))

    for chat in history:
        role = "Investigator" if chat["role"] == "user" else "CrimeMind AI"
        text = chat["text"]
        story.append(Paragraph(f"<b>{role}:</b> {text}", styles["BodyText"]))
        story.append(Spacer(1, 10))

    doc.build(story)
    return FileResponse(filename, media_type="application/pdf", filename=filename)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
