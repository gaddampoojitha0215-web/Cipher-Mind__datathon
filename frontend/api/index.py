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

CASES_DB = [
    {
        "id": f"case-{i}",
        "fir_number": f"FIR-10{234 + i}/2026",
        "police_station": "Jayanagar PS" if i % 2 == 0 else "Indiranagar PS",
        "district": "Bengaluru City",
        "crime_head": "Burglary" if i % 3 == 0 else ("Vehicle Theft" if i % 3 == 1 else "Cyber Fraud"),
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=i * 5)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=i * 5 - 1)).isoformat(),
        "description": f"Burglary reported at residential building in Bengaluru. Suspect entered through window lock bypass at night. Stole gold ornaments worth Rs 5 Lakhs." if i % 3 == 0 else (
            f"Vehicle theft of Royal Enfield Bullet. Stolen from parked parking spot outside commercial complex. Stolen between 14:00 and 16:00." if i % 3 == 1 else
            f"Cyber phishing fraud. Victim received fake SMS regarding electricity bill payment. Clicked link and lost Rs 1.5 Lakhs from bank account."
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


@app.get("/api/v1/cases/all")
def get_cases():
    return CASES_DB[:15]


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
