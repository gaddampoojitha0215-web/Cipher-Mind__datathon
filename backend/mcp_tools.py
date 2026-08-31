import json
from typing import List, Dict, Any

class MCPTools:
    def __init__(self, cases_db: List[Dict[Any, Any]]):
        self.cases_db = cases_db

    def search_fir(self, query: str) -> Dict[str, Any]:
        """Search for cases by FIR number or description."""
        query = query.lower()
        results = []
        for c in self.cases_db:
            if query in c.get('fir_number', '').lower() or query in c.get('description', '').lower():
                results.append(c)
                if len(results) >= 5:
                    break
        
        return {
            "tool": "search_fir",
            "results": results,
            "evidence": [c['fir_number'] for c in results]
        }

    def get_suspect_details(self, suspect_name: str) -> Dict[str, Any]:
        """Get details and cases associated with a suspect."""
        name = suspect_name.lower()
        related_cases = []
        locations = set()
        for c in self.cases_db:
            accused_list = [a.lower() for a in c.get('accused', [])]
            if any(name in a for a in accused_list):
                related_cases.append(c)
                if c.get('location'):
                    locations.add(c['location'])
                    
        return {
            "tool": "get_suspect_details",
            "suspect": suspect_name,
            "cases": [c['fir_number'] for c in related_cases],
            "locations": list(locations),
            "evidence": [f"Found {len(related_cases)} related cases for suspect '{suspect_name}'"]
        }

    def get_location_data(self, location: str) -> Dict[str, Any]:
        """Get cases in a specific location."""
        loc = location.lower()
        results = []
        for c in self.cases_db:
            if loc in str(c.get('location', '')).lower() or loc in str(c.get('district', '')).lower():
                results.append(c)
                if len(results) >= 5:
                    break
                    
        return {
            "tool": "get_location_data",
            "location": location,
            "results": [c['fir_number'] for c in results],
            "evidence": [f"Found {len(results)} cases in '{location}'"]
        }

    def execute_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Execute a tool by name."""
        if tool_name == "search_fir":
            return self.search_fir(kwargs.get("query", ""))
        elif tool_name == "get_suspect_details":
            return self.get_suspect_details(kwargs.get("suspect_name", ""))
        elif tool_name == "get_location_data":
            return self.get_location_data(kwargs.get("location", ""))
        else:
            return {"error": f"Unknown tool: {tool_name}"}
