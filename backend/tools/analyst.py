import os
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def tool_research_analyst(signals: dict, icp: str) -> str:
    """
    Calls Groq API to process signals and user ICP 
    into a 2-paragraph "Account Brief".
    """
    prompt = f"""
You are an expert sales analyst. Based on these signals and the Ideal Customer Profile (ICP),
write a 2-paragraph Account Brief highlighting their pain points and how we can help.

Signals: {signals}
ICP: {icp}

Output only the two paragraphs.
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        err_str = str(e).replace('"', "'").replace('\\', '')
        return f"Error contacting Groq Analyst: {err_str}"
