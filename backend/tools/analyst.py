import httpx
import json

async def tool_research_analyst(signals: dict, icp: str) -> str:
    """
    Calls local Ollama (Qwen 2.5:3b) to process signals and user ICP 
    into a 2-paragraph "Account Brief". Timout is 60s.
    """
    prompt = f"""
You are an expert sales analyst. Based on these signals and the Ideal Customer Profile (ICP),
write a 2-paragraph Account Brief highlighting their pain points and how we can help.

Signals: {json.dumps(signals)}
ICP: {icp}

Output only the two paragraphs.
"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "qwen2.5:3b",
                    "prompt": prompt,
                    "stream": False
                }
            )
            response.raise_for_status()
            result = response.json()
            return result.get("response", "No response from model.")
    except Exception as e:
        # Sanitize error string to prevent broken JSON in tool calling
        err_str = str(e).replace('"', "'").replace('\\', '')
        return f"Error contacting local Analyst (Ollama): {err_str}"
