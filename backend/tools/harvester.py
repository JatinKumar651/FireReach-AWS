import os
import requests
import json

def tool_signal_harvester(name: str) -> dict:
    """
    Fetches live signals for a company using Tavily.
    If key is missing, falls back to Mock Mode.
    """
    tavily_key = os.environ.get("TAVILY_API_KEY")

    if not tavily_key:
        print(f"[{name}] Tavily API key missing. Using Mock Mode.")
        return _mock_harvest(name)

    print(f"[{name}] Tavily API key found. Fetching live signals...")
    search_signals = []
    
    try:
        payload = {
            "api_key": tavily_key,
            "query": f"Latest news, jobs, and funding for {name}",
            "search_depth": "advanced",
            "include_answer": True,
            "include_images": False,
            "include_raw_content": False,
            "max_results": 5
        }
        res = requests.post("https://api.tavily.com/search", json=payload, timeout=15)
        if res.status_code == 200:
            results = res.json().get("results", [])
            search_signals = [{"title": r.get('title'), "content": r.get('content'), "url": r.get('url')} for r in results]
        else:
            search_signals.append(f"API Error: {res.status_code} - {res.text}")
    except Exception as e:
        search_signals.append(f"Error fetching from Tavily: {str(e)}")

    return {
        "company": name,
        "search_signals": search_signals,
        "mode": "live"
    }

def _mock_harvest(name: str) -> dict:
    return {
        "company": name,
        "search_signals": [
            {"title": f"{name} just announced a new $50M Series B funding round.", "content": "Details about the funding.", "url": "https://example.com/funding"},
            {"title": f"{name} is expanding its enterprise operations.", "content": "Expansion news.", "url": "https://example.com/expansion"},
            {"title": f"{name} launches industry-leading AI product.", "content": "Product launch.", "url": "https://example.com/product"},
            {"title": f"{name} is hiring Staff Software Engineers in Remote.", "content": "Job posting.", "url": "https://example.com/jobs"}
        ],
        "mode": "mock"
    }
