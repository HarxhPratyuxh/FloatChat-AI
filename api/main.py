import sys
from pathlib import Path

# Add the parent directory to the path to allow imports from sibling packages
sys.path.insert(0, str(Path(__file__).parent.parent))

import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

import psycopg2
import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import json

from rag.graph import app as rag_graph
from blockchain.audit import log_to_chain
from ingestion.auto_ingest_v2 import (
    run_daily,
    run_backfill,
    get_profile_count,
    get_conn,
)

load_dotenv()

log = logging.getLogger("floatchat.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DATABASE_URL = os.getenv("DATABASE_URL")

# How many profiles to ingest per scheduled / manual run
MAX_PROFILES_PER_RUN: int = 5_000

# Simple admin secret — override via ADMIN_SECRET env var
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "floatchat-admin-2026")

# Scheduler interval in hours — override via INGEST_INTERVAL_HOURS env var
INGEST_INTERVAL_HOURS = int(os.getenv("INGEST_INTERVAL_HOURS", 6))

# ── Ingestion state ────────────────────────────────────────────────────────────

ingestion_state: Dict[str, Any] = {
    "running": False,
    "mode": None,            # "daily" or "backfill"
    "last_run": None,
    "last_result": None,
    "backfill_done": False,
}

scheduler = BackgroundScheduler()


def scheduled_daily_ingest():
    """
    Wrapper for APScheduler — runs daily incremental ingestion.
    Skips if a run is already in progress.
    """
    if ingestion_state["running"]:
        log.info("Ingestion already running, skipping scheduled trigger.")
        return

    ingestion_state["running"] = True
    ingestion_state["mode"] = "daily"
    try:
        log.info("Scheduled daily ingestion starting...")
        result = run_daily(max_profiles=MAX_PROFILES_PER_RUN)
        ingestion_state["last_result"] = result
        log.info(f"Scheduled daily ingestion complete: {result}")
    except Exception as e:
        log.error(f"Scheduled ingestion failed: {e}")
        ingestion_state["last_result"] = {"status": "error", "error": str(e)}
    finally:
        ingestion_state["running"] = False
        ingestion_state["mode"] = None
        ingestion_state["last_run"] = datetime.now(timezone.utc).isoformat()


# ── Lifespan (startup + shutdown) ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    log.info("Starting FloatChat API...")

    # Check if backfill has been done (more than 100 profiles = backfill likely ran)
    try:
        conn = get_conn()
        count = get_profile_count(conn)
        conn.close()
        if count > 100:
            ingestion_state["backfill_done"] = True
            log.info(f"DB has {count:,} profiles — backfill appears complete.")
        else:
            log.warning(
                f"DB has only {count:,} profiles. "
                f"Run backfill: POST /admin/backfill or "
                f"python ingestion/auto_ingest_v2.py backfill"
            )
    except Exception as e:
        log.error(f"DB check failed on startup: {e}")

    # Schedule daily ingestion every N hours
    scheduler.add_job(
        scheduled_daily_ingest,
        trigger=IntervalTrigger(hours=INGEST_INTERVAL_HOURS),
        id="argo_daily_ingestion",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    log.info(
        f"Ingestion scheduler started — daily mode runs every "
        f"{INGEST_INTERVAL_HOURS} hours"
    )

    yield

    # ── SHUTDOWN ──
    scheduler.shutdown(wait=False)
    log.info("Scheduler stopped.")


# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="FloatChat RAG API",
    description=(
        "AI-powered Argo ocean data query platform with blockchain audit trail. "
        "Supports historical queries (2020–present) and real-time data."
    ),
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    chat_history: Optional[List[Dict[str, str]]] = []

class QueryResponse(BaseModel):
    summary: str
    sql_query: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    validation_error: Optional[str] = None
    audit_hash: Optional[str] = None
    tx_hash: Optional[str] = None
    polygonscan_url: Optional[str] = None
    blockchain_error: Optional[str] = None

class SQLQuery(BaseModel):
    sql: str

class IngestRequest(BaseModel):
    max_profiles: Optional[int] = MAX_PROFILES_PER_RUN
    secret: str

class BackfillRequest(BaseModel):
    secret: str
    start_year: Optional[int] = 2020
    end_year: Optional[int] = 2025


# ── Core endpoints ─────────────────────────────────────────────────────────────

@app.post("/rerun-sql")
async def rerun_sql(body: SQLQuery):
    """
    Re-executes a previously generated SQL query to reload map/chart data.
    Used by the frontend 'Load Map' button for chat history persistence.
    Only SELECT queries are allowed (enforced by read-only session).
    """
    sql = body.sql.strip()
    if not sql.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed.")

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured.")

    try:
        conn = psycopg2.connect(db_url, sslmode='require')
        conn.set_session(readonly=True, autocommit=True)
        cursor = conn.cursor()
        cursor.execute(sql)

        if cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchmany(15000)
            results = [dict(zip(columns, row)) for row in rows]
        else:
            results = []

        cursor.close()
        conn.close()

        # Convert Decimal/datetime to JSON-safe types
        import decimal
        def make_serializable(obj):
            if isinstance(obj, decimal.Decimal):
                return float(obj)
            if hasattr(obj, 'isoformat'):
                return obj.isoformat()
            return obj

        results = [{k: make_serializable(v) for k, v in row.items()} for row in results]

        return JSONResponse(content={"data": results, "row_count": len(results)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQL execution failed: {str(e)}")


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "FloatChat RAG",
        "data_range": "2020–present",
        "regions": ["Arabian Sea", "Bay of Bengal", "Indian Ocean"],
    }


@app.get("/health")
def health():
    try:
        conn = get_conn()
        count = get_profile_count(conn)
        conn.close()
        db_ok = True
    except Exception:
        count = 0
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "version": "2.1.0",
        "database": {"connected": db_ok, "profiles": count},
        "scheduler": {
            "running": scheduler.running,
            "ingestion_active": ingestion_state["running"],
            "backfill_done": ingestion_state["backfill_done"],
        },
    }


@app.post("/query")
async def run_query(request: QueryRequest):
    """
    Executes the RAG pipeline for a given question via SSE Streaming.
    Supports historical queries like "salinity in 2023" and real-time data.
    """
    async def generate_stream():
        initial_state = {
            "question": request.question,
            "chat_history": request.chat_history,
            "retry_count": 0,
            "failsafe_count": 0,
        }
        
        final_state = {}
        streamed_tokens = False
        
        try:
            # astream_events requires version="v2" to safely intercept tool and model chunks
            async for event in rag_graph.astream_events(initial_state, version="v2"):
                kind = event["event"]
                name = event["name"]
                
                if kind == "on_chat_model_stream":
                    # Only stream the final summary/qa nodes to the frontend, hide the SQL generation thinking
                    node_name = event.get("metadata", {}).get("langgraph_node", "")
                    if node_name in ["general_qa", "summarize"] or not node_name:
                        content = event["data"]["chunk"].content
                        
                        # Gemini returns a list of dictionaries for chunk.content, whereas OpenAI returns a string
                        if isinstance(content, list):
                            content = "".join([c.get("text", "") for c in content if isinstance(c, dict)])
                            
                        if content:
                            streamed_tokens = True
                            yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                            
                elif kind == "on_chain_start":
                    if name == "generate_sql":
                        yield f"data: {json.dumps({'type': 'status', 'message': 'Generating SQL Query...'})}\n\n"
                    elif name == "execute_sql":
                        yield f"data: {json.dumps({'type': 'status', 'message': 'Executing PostgreSQL Query...'})}\n\n"
                        
                elif kind == "on_chain_end":
                    if name == "LangGraph":
                        final_state = event["data"]["output"]

            # The LangGraph execution is complete. Extract final metadata.
            sql_query  = final_state.get("sql_query")
            query_data = final_state.get("query_result") or []
            val_error  = final_state.get("validation_error")
            summary    = final_state.get("summary")
            
            if val_error:
                 yield f"data: {json.dumps({'type': 'error', 'message': val_error})}\n\n"
                 
            # Emulate streaming for General QA since structured outputs bypass native LangGraph token events
            if summary and not streamed_tokens:
                yield f"data: {json.dumps({'type': 'token', 'content': summary})}\n\n"
            
            # ── Blockchain Audit ──
            audit_result = {}
            if sql_query and query_data and not val_error:
                yield f"data: {json.dumps({'type': 'status', 'message': 'Logging to Polygon Blockchain...'})}\n\n"
                try:
                    audit_result = await log_to_chain(
                        question=request.question,
                        sql=sql_query,
                        result=query_data,
                    )
                except Exception as audit_err:
                    audit_result["error"] = f"Audit fire failed: {str(audit_err)}"

            # Final payload wrapper containing table rows, SQL syntax, and blockchain hashes
            final_payload = {
                "type": "result",
                "sql_query": sql_query,
                "data": query_data if query_data else None,
                "audit_hash": audit_result.get("audit_hash"),
                "tx_hash": audit_result.get("tx_hash"),
                "polygonscan_url": audit_result.get("polygonscan_url"),
                "blockchain_error": audit_result.get("error")
            }
            
            yield f"data: {json.dumps(final_payload, default=str)}\n\n"
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': f'Server Error: {str(e)}'})}\n\n"

    return StreamingResponse(generate_stream(), media_type="text/event-stream")


@app.post("/query/sql")
def run_sql(query: SQLQuery):
    """Direct SQL execution endpoint for testing."""
    sql = query.sql.strip()

    if not sql.lower().startswith("select"):
        raise HTTPException(status_code=400, detail="Only SELECT queries allowed")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        cur.execute(sql)
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]

        cur.close()
        conn.close()

        return {"columns": columns, "rows": rows}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Admin: daily ingestion ─────────────────────────────────────────────────────

@app.post("/admin/ingest")
async def trigger_daily_ingestion(
    req: IngestRequest, background_tasks: BackgroundTasks
):
    """
    Manually trigger a daily incremental ingestion (last 30 days).
    Runs in background — returns immediately.

    curl -X POST http://localhost:8000/admin/ingest \\
      -H "Content-Type: application/json" \\
      -d '{"secret": "floatchat-admin-2026", "max_profiles": 1000}'
    """
    if req.secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    if ingestion_state["running"]:
        return {
            "status": "already_running",
            "mode": ingestion_state["mode"],
            "message": "Ingestion is already in progress. Check /admin/ingest/status.",
        }

    def run_bg():
        ingestion_state["running"] = True
        ingestion_state["mode"] = "daily"
        try:
            result = run_daily(max_profiles=req.max_profiles)
            ingestion_state["last_result"] = result
        except Exception as e:
            ingestion_state["last_result"] = {"status": "error", "error": str(e)}
        finally:
            ingestion_state["running"] = False
            ingestion_state["mode"] = None
            ingestion_state["last_run"] = datetime.now(timezone.utc).isoformat()

    background_tasks.add_task(run_bg)

    return {
        "status": "started",
        "mode": "daily",
        "message": f"Daily ingestion triggered (last 30d, up to {req.max_profiles:,} profiles).",
        "check_status": "/admin/ingest/status",
    }


# ── Admin: historical backfill ─────────────────────────────────────────────────

@app.post("/admin/backfill")
async def trigger_backfill(
    req: BackfillRequest, background_tasks: BackgroundTasks
):
    """
    Trigger historical backfill (2020–2025 by default).
    Run this ONCE to populate historical data for year-wise queries.
    Takes 30–60 minutes. Fully resumable if interrupted.

    curl -X POST http://localhost:8000/admin/backfill \\
      -H "Content-Type: application/json" \\
      -d '{"secret": "floatchat-admin-2026"}'

    Optional: specify year range
      -d '{"secret": "floatchat-admin-2026", "start_year": 2022, "end_year": 2024}'
    """
    if req.secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    if ingestion_state["running"]:
        return {
            "status": "already_running",
            "mode": ingestion_state["mode"],
            "message": "Ingestion is already in progress. Check /admin/ingest/status.",
        }

    if ingestion_state["backfill_done"]:
        return {
            "status": "already_done",
            "message": (
                "Backfill appears complete (DB has >100 profiles). "
                "To force re-run, use the CLI: python ingestion/auto_ingest_v2.py backfill"
            ),
        }

    def run_bg():
        ingestion_state["running"] = True
        ingestion_state["mode"] = "backfill"
        try:
            # Temporarily update backfill years if custom range provided
            import ingestion.auto_ingest_v2 as ingest_module
            original_start = ingest_module.BACKFILL_START_YEAR
            original_end = ingest_module.BACKFILL_END_YEAR

            ingest_module.BACKFILL_START_YEAR = req.start_year
            ingest_module.BACKFILL_END_YEAR = req.end_year

            result = run_backfill()
            ingestion_state["last_result"] = result
            ingestion_state["backfill_done"] = True

            # Restore originals
            ingest_module.BACKFILL_START_YEAR = original_start
            ingest_module.BACKFILL_END_YEAR = original_end

        except Exception as e:
            ingestion_state["last_result"] = {"status": "error", "error": str(e)}
        finally:
            ingestion_state["running"] = False
            ingestion_state["mode"] = None
            ingestion_state["last_run"] = datetime.now(timezone.utc).isoformat()

    background_tasks.add_task(run_bg)

    return {
        "status": "started",
        "mode": "backfill",
        "year_range": f"{req.start_year}–{req.end_year}",
        "message": (
            f"Historical backfill started ({req.start_year}–{req.end_year}). "
            f"This will take 30–60 minutes. Fully resumable if interrupted."
        ),
        "check_status": "/admin/ingest/status",
    }


# ── Admin: ingestion status ───────────────────────────────────────────────────

@app.get("/admin/ingest/status")
async def ingestion_status():
    """
    Returns current ingestion state + live DB stats + year-wise breakdown.

    curl http://localhost:8000/admin/ingest/status
    """
    conn = get_conn()
    total = get_profile_count(conn)

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM argo_measurements")
        measurements = cur.fetchone()[0]

        cur.execute("SELECT COUNT(DISTINCT wmo_id) FROM argo_profiles")
        floats = cur.fetchone()[0]

        cur.execute(
            "SELECT MIN(profile_datetime), MAX(profile_datetime) FROM argo_profiles"
        )
        date_min, date_max = cur.fetchone()

        # Year-wise breakdown — shows backfill progress
        cur.execute("""
            SELECT
                EXTRACT(YEAR FROM profile_datetime)::int AS year,
                COUNT(*) AS profiles
            FROM argo_profiles
            GROUP BY year ORDER BY year
        """)
        yearly = [{"year": row[0], "profiles": row[1]} for row in cur.fetchall()]

        # Region breakdown
        cur.execute("""
            SELECT
                CASE
                    WHEN latitude BETWEEN 5  AND 25  AND longitude BETWEEN 50 AND 78
                        THEN 'Arabian Sea'
                    WHEN latitude BETWEEN 5  AND 23  AND longitude BETWEEN 80 AND 100
                        THEN 'Bay of Bengal'
                    WHEN latitude BETWEEN -40 AND 5  AND longitude BETWEEN 40 AND 100
                        THEN 'Indian Ocean'
                    ELSE 'Other'
                END AS region,
                COUNT(*) AS profiles
            FROM argo_profiles
            GROUP BY region ORDER BY profiles DESC
        """)
        region_stats = [
            {"region": row[0], "profiles": row[1]} for row in cur.fetchall()
        ]

    conn.close()

    # Next scheduled run
    next_run = None
    job = scheduler.get_job("argo_daily_ingestion")
    if job and job.next_run_time:
        next_run = job.next_run_time.isoformat()

    return {
        "ingestion": {
            "running": ingestion_state["running"],
            "mode": ingestion_state["mode"],
            "last_run": ingestion_state["last_run"],
            "last_result": ingestion_state["last_result"],
            "backfill_done": ingestion_state["backfill_done"],
            "next_scheduled_run": next_run,
            "schedule_interval": f"every {INGEST_INTERVAL_HOURS} hours",
        },
        "database": {
            "total_profiles": total,
            "total_measurements": measurements,
            "unique_floats": floats,
            "date_range": {
                "earliest": date_min.isoformat() if date_min else None,
                "latest": date_max.isoformat() if date_max else None,
            },
            "by_year": yearly,
            "by_region": region_stats,
        },
    }


# ── Admin: force stop ─────────────────────────────────────────────────────────

@app.post("/admin/ingest/stop")
async def stop_ingestion(req: IngestRequest):
    """
    Force-reset the ingestion state flag.
    Does NOT kill the running thread — just allows new runs to start.

    curl -X POST http://localhost:8000/admin/ingest/stop \\
      -H "Content-Type: application/json" \\
      -d '{"secret": "floatchat-admin-2026"}'
    """
    if req.secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    was_running = ingestion_state["running"]
    ingestion_state["running"] = False
    ingestion_state["mode"] = None

    return {
        "status": "reset",
        "was_running": was_running,
        "message": "Ingestion state reset. New runs can now be triggered.",
    }


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)