import os
import requests
import json

def tool_signal_harvester(company_name: str) -> dict:
    """
    Fetches live signals for a company using Tavily.
    If key is missing, falls back to Mock Mode.
    """
    tavily_key = os.environ.get("TAVILY_API_KEY")

    if not tavily_key:
        print(f"[{company_name}] Tavily API key missing. Using Mock Mode.")
        return _mock_harvest(company_name)

    print(f"[{company_name}] Tavily API key found. Fetching live signals...")
    search_signals = []
    
    try:
        payload = {
            "api_key": tavily_key,
            "query": f"Latest news, jobs, and funding for {company_name}",
            "search_depth": "advanced",
            "include_answer": True,
            "include_images": False,
            "include_raw_content": False,
            "max_results": 5
        }
        res = requests.post("https://api.tavily.com/search", json=payload, timeout=15)
        if res.status_code == 200:
            results = res.json().get("results", [])
            search_signals = [f"{r.get('title')}: {r.get('content')}" for r in results]
        else:
            search_signals.append(f"API Error: {res.status_code} - {res.text}")
    except Exception as e:
        search_signals.append(f"Error fetching from Tavily: {str(e)}")

    return {
        "company": company_name,
        "search_signals": search_signals,
        "mode": "live"
    }

def _mock_harvest(company_name: str) -> dict:
    return {
        "company": company_name,
        "search_signals": [
            f"{company_name} just announced a new $50M Series B funding round.",
            f"{company_name} is expanding its enterprise operations.",
            f"{company_name} launches industry-leading AI product.",
            f"{company_name} is hiring Staff Software Engineers in Remote."
        ],
        "mode": "mock"
    }
