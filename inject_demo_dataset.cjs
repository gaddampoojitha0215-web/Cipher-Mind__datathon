const fs = require('fs');

let content = fs.readFileSync('backend/main.py', 'utf8');

const target = '])\n\n# Build networkx graph';

const demoData = `])

# --- BEGIN V2 ADVANCED DEMO DATASET ---
# This dataset powers the End-to-End Demo Experience (Part 13)
# It features interconnected entities (Persons, Vehicles, Locations) to demonstrate Network Intelligence, Alerts, and Leads.

demo_cases = [
    {
        "id": "case-demo-001",
        "fir_number": "FIR-9901/2026",
        "police_station": "Koramangala PS",
        "district": "Bengaluru City",
        "crime_head": "Organized Crime / Smuggling",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=2)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat(),
        "description": "Operation Red Node: Suspected organized smuggling ring intercepted. A large cache of illegal goods was found in a warehouse. Suspects fled the scene.",
        "status": "High Priority",
        "accused": ["Ravi Kumar", "Prakash Shetty"],
        "victims": ["Anil Desai"],
        "location": "Koramangala Industrial Area, Bengaluru",
        "phone_numbers": ["9876500001", "9876500002"],
        "vehicles": ["KA-01-AB-1234"],
        "bank_accounts": ["SBIN0009999"],
        "evidence": ["E-001 (Contraband Goods)", "E-002 (CCTV Footage)"],
        "officer": "Inspector Gowda"
    },
    {
        "id": "case-demo-002",
        "fir_number": "FIR-9902/2026",
        "police_station": "Indiranagar PS",
        "district": "Bengaluru City",
        "crime_head": "Vehicle Theft",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=14)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=13)).isoformat(),
        "description": "A Black SUV was reported stolen from a residential parking lot during the night. The vehicle is suspected to be used in illicit activities.",
        "status": "Under Investigation",
        "accused": ["Prakash Shetty"],
        "victims": ["Kavitha Sharma"],
        "location": "Indiranagar 100ft Road, Bengaluru",
        "phone_numbers": ["9876500002"],
        "vehicles": ["KA-01-AB-1234"],  # Shared with case-demo-001
        "bank_accounts": [],
        "evidence": ["E-003 (Broken Garage Lock)"],
        "officer": "Officer Patil"
    },
    {
        "id": "case-demo-003",
        "fir_number": "FIR-9903/2026",
        "police_station": "Koramangala PS",
        "district": "Bengaluru City",
        "crime_head": "Missing Person",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(hours=12)).isoformat(),
        "description": "Family reported a local business owner missing. He was last seen near the industrial area. Foul play is suspected.",
        "status": "Critical",
        "accused": [],
        "victims": ["Anil Desai"],  # Shared with case-demo-001
        "location": "Koramangala Industrial Area, Bengaluru", # Shared with case-demo-001
        "phone_numbers": ["9876500099"],
        "vehicles": [],
        "bank_accounts": [],
        "evidence": ["E-004 (Abandoned Wallet)"],
        "officer": "Inspector Gowda"
    },
    {
        "id": "case-demo-004",
        "fir_number": "FIR-9904/2026",
        "police_station": "Whitefield PS",
        "district": "Bengaluru City",
        "crime_head": "Financial Fraud",
        "date_of_offence": (datetime.datetime.now() - datetime.timedelta(days=5)).isoformat(),
        "date_of_registration": (datetime.datetime.now() - datetime.timedelta(days=4)).isoformat(),
        "description": "Large scale financial fraud linked to shell companies. Funds were moved rapidly across multiple accounts.",
        "status": "Under Investigation",
        "accused": ["Ravi Kumar"], # Shared with case-demo-001
        "victims": ["Global Tech Solutions"],
        "location": "Whitefield IT Park, Bengaluru",
        "phone_numbers": ["9876500001"], # Shared with case-demo-001
        "vehicles": [],
        "bank_accounts": ["SBIN0009999"], # Shared with case-demo-001
        "evidence": ["E-005 (Forged Documents)", "E-006 (Bank Statements)"],
        "officer": "Officer Reddy"
    }
]

CASES_DB.extend(demo_cases)
# --- END V2 ADVANCED DEMO DATASET ---

# Build networkx graph`;

if (content.includes(target)) {
    content = content.replace(target, demoData);
    
    fs.writeFileSync('backend/main.py', content);
    console.log("Successfully injected demo dataset into backend/main.py");
} else {
    // try different newline sequence
    const target2 = '])\r\n\r\n# Build networkx graph';
    if (content.includes(target2)) {
        content = content.replace(target2, demoData.replace(/\n/g, '\r\n'));
        fs.writeFileSync('backend/main.py', content);
        console.log("Successfully injected demo dataset into backend/main.py (CRLF)");
    } else {
        console.error("Could not find insertion point in main.py");
        process.exit(1);
    }
}
