import os
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from agent import run_outreach_flow

app = FastAPI(title="FireReach Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OutreachRequest(BaseModel):
    company_name: str
    icp: str
    recipient: str = "test@example.com"

@app.get("/api/status")
async def get_api_status():
    keys = {
        "groq": bool(os.environ.get("GROQ_API_KEY", "").strip('"')),
        "tavily": bool(os.environ.get("TAVILY_API_KEY", "").strip('"')),
        "resend": bool(os.environ.get("RESEND_API_KEY", "").strip('"')) and os.environ.get("RESEND_API_KEY", "").strip('"') != "your_resend_api_key_here"
    }
    return keys

@app.post("/api/run-outreach")
async def run_outreach(request: OutreachRequest):
    return StreamingResponse(
        run_outreach_flow(request.company_name, request.icp, request.recipient),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
