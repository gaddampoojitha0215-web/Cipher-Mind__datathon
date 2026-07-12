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
                "Your task is to answer the user's query professionally, drawing connections, identifying matching Modus Operandi (MO), "
                "and finding links between suspects, phone numbers, vehicles, and bank accounts.\n"
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
        if "burglary" in msg or "ಕಳ್ಳತನ" in msg:
            matching_cases = [c for c in CASES_DB if c["crime_head"] == "Burglary"][:3]
            sources = [c["fir_number"] for c in matching_cases]
            evidence = ["Matched Modus Operandi: Residential lock bypass & entry through window."]
            response_msg = (
                f"Found {len(matching_cases)} recent Burglary cases. "
                f"Prime targets were residential buildings in Bengaluru with stolen gold. "
                f"Details: {', '.join([c['fir_number'] + ' (' + c['police_station'] + ')' for c in matching_cases])}."
            )
            if payload.language == "kn":
                response_msg = (
                    f"ಇತ್ತೀಚಿನ {len(matching_cases)} ಕಳ್ಳತನ ಪ್ರಕರಣಗಳು ಪತ್ತೆಯಾಗಿವೆ. "
                    f"ಚಿನ್ನಾಭರಣಗಳನ್ನು ಕಳವು ಮಾಡಲಾಗಿದೆ. "
                    f"ವಿವರಗಳು: {', '.join([c['fir_number'] + ' (' + c['police_station'] + ')' for c in matching_cases])}."
                )
            elif payload.language == "hi":
                response_msg = (
                    f"हाल ही के {len(matching_cases)} चोरी के मामले मिले हैं। "
                    f"सोने के गहने चोरी हुए हैं। "
                    f"विवरण: {', '.join([c['fir_number'] + ' (' + c['police_station'] + ')' for c in matching_cases])}."
                )
            elif payload.language == "te":
                response_msg = (
                    f"ఇటీవలి {len(matching_cases)} దొంగతనం కేసులు కనుగొనబడ్డాయి. "
                    f"బంగారు ఆభరణాలు చోరీకి గురయ్యాయి. "
                    f"వివరాలు: {', '.join([c['fir_number'] + ' (' + c['police_station'] + ')' for c in matching_cases])}."
                )
            elif payload.language == "ta":
                response_msg = (
                    f"சமீபத்திய {len(matching_cases)} திருட்டு வழக்குகள் கண்டுபிடிக்கப்பட்டுள்ளன. "
                    f"தங்க நகைகள் திருடப்பட்டுள்ளன. "
                    f"விவரங்கள்: {', '.join([c['fir_number'] + ' (' + c['police_station'] + ')' for c in matching_cases])}."
                )
        elif "phone" in msg or "ಮೊಬೈಲ್" in msg or any(x.isdigit() for x in msg.split()):
            digits = [x for x in msg.split() if x.isdigit()]
            target_phone = digits[0] if digits else "9876543211"
            connected_accused = []
            if target_phone in G:
                for nbr in G.neighbors(target_phone):
                    if G.nodes[nbr].get("type") == "accused":
                        connected_accused.append(nbr)

            sources = [c["fir_number"] for c in CASES_DB if target_phone in c["phone_numbers"]][:3]
            evidence = [f"Interlinked node mapping for phone number: {target_phone}."]

            if connected_accused:
                response_msg = f"Phone {target_phone} is linked to suspect(s): {', '.join(connected_accused)}."
            else:
                response_msg = f"Phone number {target_phone} was queried, but no matching active suspects were found directly linked. Showing generic association layout."

            if payload.language == "kn":
                response_msg = f"ಫೋನ್ {target_phone} ಆರೋಪಿಗಳೊಂದಿಗೆ ಲಿಂಕ್ ಹೊಂದಿದೆ: {', '.join(connected_accused) if connected_accused else 'ಯಾರೂ ಇಲ್ಲ'}."
            elif payload.language == "hi":
                response_msg = f"फ़ोन {target_phone} संदिग्ध(ों) से जुड़ा है: {', '.join(connected_accused) if connected_accused else 'कोई नहीं'}."
            elif payload.language == "te":
                response_msg = f"ఫోన్ {target_phone} అనుమానితులతో లింక్ చేయబడింది: {', '.join(connected_accused) if connected_accused else 'ఎవరూ లేరు'}."
            elif payload.language == "ta":
                response_msg = f"போன் {target_phone} சந்தேக நபர்களுடன் இணைக்கப்பட்டுள்ளது: {', '.join(connected_accused) if connected_accused else 'யாரும் இல்லை'}."
        else:
            response_msg = (
                "Welcome to KSP CrimeMind AI. I can assist you with case summaries, "
                "modus operandi matching, or relationship network visualization."
            )
            if payload.language == "kn":
                response_msg = "CrimeMind AI ಗೆ ಸುಸ್ವಾಗತ. ಪ್ರಕರಣದ ಸಾರಾಂಶಗಳು, ಅಥವಾ ಅಪರಾಧ ಜಾಲದ ದೃಶ್ಯೀಕರಣದಲ್ಲಿ ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ."
            elif payload.language == "hi":
                response_msg = "CrimeMind AI में आपका स्वागत है। मैं मामले के सारांश, और नेटवर्क विज़ुअलाइज़ेशन में आपकी सहायता कर सकता हूँ।"
            elif payload.language == "te":
                response_msg = "CrimeMind AI కు స్వాగతం. కేసు సారాంశాలు మరియు నెట్‌వర్క్ విజువలైజేషన్‌లో నేను మీకు సహాయం చేయగలను."
            elif payload.language == "ta":
                response_msg = "CrimeMind AI க்கு வரவேற்கிறோம். வழக்கு சுருக்கங்கள் அல்லது நெட்வொர்க் காட்சிப்படுத்தலில் நான் உங்களுக்கு உதவ முடியும்."

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
