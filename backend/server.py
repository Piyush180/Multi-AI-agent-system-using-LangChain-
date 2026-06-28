from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pipeline import run_research_pipeline, run_research_pipeline_streaming
import json
import asyncio

app = FastAPI(
    title="Multi-Agent Research System API",
    description="AI-powered research pipeline using LangChain + Google Gemini",
    version="1.0.0",
)

# ── CORS (allow React dev server) ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────
class ResearchRequest(BaseModel):
    topic: str


class ResearchResponse(BaseModel):
    topic: str
    search_results: str
    scraped_content: str
    draft: str
    final_report: str


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "Multi-Agent Research API is running 🚀"}


@app.post("/api/research", response_model=ResearchResponse)
async def research(request: ResearchRequest):
    """
    Run the full 4-stage research pipeline synchronously.
    Returns all intermediate + final results as JSON.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    try:
        result = await asyncio.to_thread(run_research_pipeline, request.topic)
        return ResearchResponse(
            topic=request.topic,
            search_results=result.get("search_results", ""),
            scraped_content=result.get("scraped_content", ""),
            draft=result.get("draft", ""),
            final_report=result.get("final_report", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stream")
async def stream_research(topic: str):
    """
    SSE endpoint — streams stage-by-stage updates to the React frontend.
    Usage: GET /api/stream?topic=your+topic
    """
    if not topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    async def event_generator():
        try:
            async for update in run_research_pipeline_streaming(topic):
                data = json.dumps(update)
                yield f"data: {data}\n\n"
                await asyncio.sleep(0)
        except Exception as e:
            error_payload = json.dumps({"stage": 0, "status": "error", "message": str(e)})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
