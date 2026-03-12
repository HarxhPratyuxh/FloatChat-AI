# 📖 FloatChat — Handoff Docs for RAG Team

> **Written by:** Lakshya  
> **Date:** 2026-03-07  
> **Purpose:** Everything you need to know about what's already built so you can jump straight into improving the RAG pipeline — no archaeology required.

---

## 🗺️ What This Doc Covers

| Section | What you'll learn |
|---------|------------------|
| [System Architecture](#system-architecture) | How all the pieces talk to each other |
| [Database](#database) | Schema, tables, rules — the data you're querying |
| [Auto Ingestion Pipeline](#auto-ingestion-pipeline) | How fresh Argo data gets into the DB every day |
| [FastAPI Backend](#fastapi-backend) | Every endpoint, how to call it, what it returns |
| [Blockchain Audit](#blockchain-audit) | What fires after every query and why |
| [Corpus / RAG Context Files](#corpus--rag-context-files) | The markdown files that feed your FAISS index |
| [Environment Variables](#environment-variables) | The `.env` keys you need to set |
| [How to Run Locally](#how-to-run-locally) | Get it running in 3 commands |
| [Your Touch Points](#your-touch-points) | Exactly which files YOU should be editing |

---

## System Architecture

Here's the full flow from user question → answer:

```
USER (React Frontend)
    │
    │  POST /query { "question": "..." }
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FastAPI  (api/main.py)                         │
│                                                                 │
│  1. Receives question                                           │
│  2. Calls RAG pipeline (rag/graph.py)                          │
│  3. Gets back: sql, results, summary                           │
│  4. Fires blockchain audit (blockchain/audit.py)               │
│  5. Returns full response JSON                                  │
└────────────────────┬──────────────────────────────┬────────────┘
                     │                              │
                     ▼                              ▼
        ┌────────────────────┐        ┌─────────────────────────┐
        │  RAG Pipeline      │        │  Blockchain Audit       │
        │  (rag/)            │        │  (blockchain/audit.py)  │
        │                    │        │                         │
        │  retrieve          │        │  SHA256(q+sql+result)   │
        │    → generate_sql  │        │  → Polygon Amoy TX      │
        │    → validate_sql  │        │  → return tx_hash       │
        │    → execute_sql   │        └─────────────────────────┘
        │    → summarize     │
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Supabase Postgres │
        │  (argo_profiles    │
        │   argo_measurements│
        │   argo_metadata)   │
        └────────────────────┘
                 ▲
                 │ fills data
        ┌────────────────────┐
        │  Ingestion Pipeline│
        │  (ingestion/       │
        │   auto_ingest_v2.py│
        │                    │
        │  Argovis API →     │
        │  Supabase DB →     │
        │  Corpus .md files  │
        │  FAISS rebuild     │
        └────────────────────┘
```

---

## Database

### Connection

Set `DATABASE_URL` in `.env`. It's a Supabase PostgreSQL connection string. All connections use `sslmode=require`.

```env
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
```

### Schema — 3 Tables

#### `argo_profiles` — One row per float measurement cycle
```sql
CREATE TABLE argo_profiles (
    id               SERIAL PRIMARY KEY,
    wmo_id           INTEGER NOT NULL,       -- Float's unique WMO number
    cycle_number     INTEGER NOT NULL,       -- Which dive cycle (1, 2, 3...)
    profile_datetime TIMESTAMP NOT NULL,     -- When the profile was taken (UTC)
    latitude         DOUBLE PRECISION NOT NULL,
    longitude        DOUBLE PRECISION NOT NULL,
    data_mode        CHAR(1),                -- 'D' = Delayed (best), 'R' = Real-time
    source_file      TEXT                   -- "argovis_<wmo>_<cycle>"
);
-- Unique constraint: (wmo_id, cycle_number) — no duplicates
```

#### `argo_measurements` — One row per depth level per profile
```sql
CREATE TABLE argo_measurements (
    id             SERIAL PRIMARY KEY,
    profile_id     INTEGER REFERENCES argo_profiles(id) ON DELETE CASCADE,
    pressure       DOUBLE PRECISION NOT NULL,    -- dbar, higher = deeper (0-2000)
    temp_adjusted  DOUBLE PRECISION,             -- °C, scientifically corrected
    psal_adjusted  DOUBLE PRECISION,             -- PSU, scientifically corrected
    temp_qc        CHAR(1),                      -- '1' = good data, filter on this
    psal_qc        CHAR(1)                       -- '1' = good data, filter on this
);
```

#### `argo_metadata` — Key/value store (optional, rarely queried)
```sql
CREATE TABLE argo_metadata (
    id    SERIAL PRIMARY KEY,
    key   TEXT UNIQUE NOT NULL,
    value TEXT
);
```

### Critical SQL Rules (Must Tell Your LLM)

| Rule | Why |
|------|-----|
| Always use `temp_adjusted`, never `temp` | Raw `temp` is uncorrected sensor data |
| Always use `psal_adjusted`, never `psal` | Same — raw salinity is unreliable |
| Always filter `temp_qc = '1'` | Flag '1' = QC-passed. Other flags = suspect data |
| Always filter `psal_qc = '1'` | Same |
| `data_mode = 'D'` is highest quality | 'D' = delayed mode, expert-reviewed |
| `argo_measurements` has NO lat/lon/time | You MUST JOIN to `argo_profiles` for that |
| Pressure is in **dbar** ≈ depth in meters | `pressure < 10` = surface, `> 1000` = deep |

### Correct JOIN Pattern (Always)
```sql
SELECT p.wmo_id, p.latitude, p.longitude, p.profile_datetime,
       m.pressure, m.temp_adjusted, m.psal_adjusted
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.id
WHERE m.temp_qc = '1'
  AND m.psal_qc = '1'
  AND p.data_mode = 'D';
```

### Region Bounding Boxes (for WHERE clauses)
| Region | Latitude | Longitude |
|--------|----------|-----------|
| Arabian Sea | 5 to 25 | 50 to 78 |
| Bay of Bengal | 5 to 23 | 80 to 100 |
| Indian Ocean North | -10 to 5 | 40 to 100 |
| Indian Ocean South | -40 to -10 | 40 to 100 |

### Data Volume
- **Profiles:** Up to 80,000 ceiling (set in ingestion)
- **Measurements:** ~100 rows per profile (one per depth level) → potentially ~8M rows
- **Date range:** 2020 – present
- **Coverage:** India-first (Arabian Sea, Bay of Bengal, Indian Ocean)

---

## Auto Ingestion Pipeline

**File:** `ingestion/auto_ingest_v2.py`  
**Data Source:** [Argovis API](https://argovis-api.colorado.edu) (University of Colorado)

### What It Does

The pipeline pulls real Argo float data from the Argovis REST API and stores it in Supabase. After every run, it:
1. Inserts new profiles + measurements into the DB
2. Regenerates `rag/corpus/data_stats.md` and `rag/corpus/float_coverage.md` with fresh stats
3. Triggers a FAISS index rebuild so the RAG retriever picks up new context

### Two Modes

#### Mode 1: Backfill (run ONCE)
Pulls all historical data from 2020–2025, month by month, 4 regions × each month.
```bash
# From project root:
python ingestion/auto_ingest_v2.py backfill
```
- Takes **30–60 minutes** total
- Safe to Ctrl+C and re-run — it skips already-ingested profiles
- Ceiling: 80,000 profiles max

#### Mode 2: Daily (run by scheduler automatically)
Pulls the **last 30 days** only. Used for keeping the DB fresh.
```bash
python ingestion/auto_ingest_v2.py daily
```
- APScheduler runs this automatically every **6 hours** when the API is running
- Targets up to 5,000 new profiles per run

### Key Config Constants
```python
MAX_TOTAL_PROFILES = 80_000   # DB ceiling
THROTTLE_SECONDS   = 5        # Pause between API calls (daily)
BACKFILL_THROTTLE  = 8        # Pause between API calls (backfill)
REQUEST_TIMEOUT    = 120      # Argovis request timeout in seconds
BACKFILL_START_YEAR = 2020
BACKFILL_END_YEAR   = 2025
```

### What Gets Stored

For every Argo profile returned by Argovis:
- **From the profile header:** `wmo_id`, `cycle_number`, `timestamp`, `lat`, `lon`, `data_mode`
- **From the profile data array:** `pressure`, `temperature`, `salinity` at each depth level

All data is QC=1 filtered at the API level (only quality-controlled measurements).

### Auto-Generated Corpus Files
After every ingestion run, two files are **auto-regenerated**:
- `rag/corpus/data_stats.md` — live DB stats (total profiles, measurements, surface averages, year breakdown)
- `rag/corpus/float_coverage.md` — regional breakdown, example queries, coordinate reference

> **RAG guys:** You don't manually edit these. The ingestion pipeline writes them. They feed your FAISS index so your LLM knows what data is actually available.

---

## FastAPI Backend

**File:** `api/main.py`  
**Run:** `python -m uvicorn api.main:app --reload --port 8000`  
**Docs (auto-generated):** http://localhost:8000/docs

### Startup Behaviour
On startup, the API:
1. Checks DB profile count — logs a warning if < 100 (backfill likely not done)
2. Starts APScheduler with `run_daily()` every 6 hours
3. All of this is handled in the async `lifespan` context manager

### All Endpoints

#### `GET /`
Health ping. Returns service name and data range.
```json
{ "status": "ok", "service": "FloatChat RAG", "data_range": "2020–present" }
```

---

#### `GET /health`
Full health check — DB connectivity + scheduler status.
```json
{
  "status": "ok",
  "database": { "connected": true, "profiles": 45231 },
  "scheduler": { "running": true, "ingestion_active": false, "backfill_done": true }
}
```

---

#### `POST /query` ← **This is what your RAG pipeline receives**
The main endpoint. Takes a natural language question, runs the full RAG pipeline.

**Request:**
```json
{ "question": "What is the average surface temperature in the Arabian Sea in 2023?" }
```

**Response:**
```json
{
  "summary": "The average surface temperature in the Arabian Sea in 2023 was 27.4°C...",
  "sql_query": "SELECT ROUND(AVG(m.temp_adjusted)::numeric, 2)...",
  "data": [{ "avg_surface_temp_c": 27.4 }],
  "validation_error": null,
  "audit_hash": "sha256:a3f4...",
  "tx_hash": "0xabc123...",
  "polygonscan_url": "https://amoy.polygonscan.com/tx/0xabc123..."
}
```

**How the RAG pipeline is called** (from `api/main.py`):
```python
initial_state = { "question": request.question, "retry_count": 0 }
final_state = await rag_graph.ainvoke(initial_state)
```
Your `rag/graph.py` exports `app` as `rag_graph`.

---

#### `POST /query/sql`
Direct SQL execution for testing. Only SELECT allowed.
```json
{ "sql": "SELECT COUNT(*) FROM argo_profiles" }
```
Returns `{ "columns": [...], "rows": [...] }`.

---

#### `POST /admin/ingest`
Manually trigger a daily ingestion run (last 30 days). Runs in background.
```bash
curl -X POST http://localhost:8000/admin/ingest \
  -H "Content-Type: application/json" \
  -d '{"secret": "floatchat-admin-2026", "max_profiles": 1000}'
```

---

#### `POST /admin/backfill`
Trigger historical backfill (2020–2025). Takes 30–60 min. Runs in background.
```bash
curl -X POST http://localhost:8000/admin/backfill \
  -H "Content-Type: application/json" \
  -d '{"secret": "floatchat-admin-2026"}'
```
Optional: `"start_year": 2022, "end_year": 2024` for custom range.

---

#### `GET /admin/ingest/status`
Rich status dashboard — live DB stats + ingestion state + year breakdown.
```bash
curl http://localhost:8000/admin/ingest/status
```
Returns:
```json
{
  "ingestion": {
    "running": false,
    "mode": null,
    "last_run": "2026-03-07T09:00:00+00:00",
    "last_result": { "status": "success", "profiles_added": 312 },
    "backfill_done": true,
    "next_scheduled_run": "2026-03-07T15:00:00+00:00",
    "schedule_interval": "every 6 hours"
  },
  "database": {
    "total_profiles": 45231,
    "total_measurements": 4523100,
    "unique_floats": 1204,
    "date_range": { "earliest": "2020-01-03", "latest": "2026-03-06" },
    "by_year": [{ "year": 2020, "profiles": 8231 }, ...],
    "by_region": [{ "region": "Arabian Sea", "profiles": 12400 }, ...]
  }
}
```

---

#### `POST /admin/ingest/stop`
Emergency: resets the `ingestion_state["running"]` flag if something gets stuck.
```bash
curl -X POST http://localhost:8000/admin/ingest/stop \
  -H "Content-Type: application/json" \
  -d '{"secret": "floatchat-admin-2026"}'
```

---

### Scheduler Configuration
Override via `.env`:
```env
INGEST_INTERVAL_HOURS=6    # Default: every 6 hours
ADMIN_SECRET=floatchat-admin-2026
```

---

## Blockchain Audit

**File:** `blockchain/audit.py`  
**Network:** Polygon Amoy testnet (chain ID: 80002)  
**Explorer:** https://amoy.polygonscan.com

### What Happens After Every Query

When `/query` returns a successful result (has SQL + data, no validation error):
1. Compute `SHA256(question + sql + json(result))` → `audit_hash`
2. Send `logQuery(hash_bytes)` transaction to the `FloatChatAudit` smart contract
3. Return `tx_hash` and `polygonscan_url` to the user

Researchers can paste the `tx_hash` into PolygonScan and verify the audit hash is immutably recorded on-chain.

### The Smart Contract ABI (`blockchain/contract_abi.json`)

Three functions:
| Function | Type | What it does |
|----------|------|-------------|
| `logQuery(bytes32 queryHash)` | write | Stores the hash on-chain |
| `getRecordCount()` | read | Returns total queries logged |
| `records(uint256 index)` | read | Returns `(queryHash, timestamp, submitter)` |

### Failure Handling

The module is **designed to never crash the main query**:
- If blockchain env vars are missing → returns `audit_hash` only, logs warning
- If RPC is unreachable → returns `audit_hash` only, sets `error` field
- If TX reverts → returns `tx_hash` + error message
- The `/query` endpoint always gets a response regardless

### Required `.env` for Blockchain
```env
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
FLOATCHAT_CONTRACT_ADDRESS=0xYourContractAddress
BLOCKCHAIN_WALLET_ADDRESS=0xYourWalletAddress
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here
```
> If these are blank, the system still works — audit hashes are computed but not stored on-chain.

---

## Corpus / RAG Context Files

**Directory:** `rag/corpus/`

These are the markdown files that get embedded into your FAISS index. The retriever pulls the most relevant chunks and injects them as context into the LLM prompt.

| File | Maintained by | Purpose |
|------|--------------|---------|
| `schema.md` | Manual (Lakshya) | DB table structure, field descriptions, join rules |
| `sql_patterns.md` | Manual (Lakshya) | 8 canonical SQL query examples the LLM should follow |
| `qc_rules.md` | Manual (Lakshya) | Quality control flag rules |
| `db.md` | Manual (Lakshya) | Conceptual DB overview for LLM grounding |
| `data_stats.md` | **Auto-generated** by ingestion | Live DB stats — total profiles, coverage, averages |
| `float_coverage.md` | **Auto-generated** by ingestion | Regional breakdown, example queries, coordinate reference |

> **RAG guys:** To improve LLM context, add/edit `.md` files in `rag/corpus/` and re-run:
> ```bash
> python rag/build_index.py
> ```
> The index rebuild takes ~10 seconds and picks up all `*.md` files in the corpus dir automatically.

---

## Environment Variables

Full `.env` reference (create this at project root):

```env
# ── Database (Required) ──────────────────────────────
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres

# ── LLM (Required for RAG) ──────────────────────────
GROQ_API_KEY=gsk_your_groq_key_here

# ── Blockchain (Optional — graceful fallback if missing) ──
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
FLOATCHAT_CONTRACT_ADDRESS=0xYourContractAddress
BLOCKCHAIN_WALLET_ADDRESS=0xYourWalletAddress
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here

# ── API Config (Optional — have defaults) ────────────
API_PORT=8000
ADMIN_SECRET=floatchat-admin-2026
INGEST_INTERVAL_HOURS=6

# ── Ingestion Config (Optional) ─────────────────────
CORPUS_PATH=rag/corpus
```

---

## How to Run Locally

### Prerequisites
```bash
pip install -r requirements.txt
```

### Step 1 — One-time: populate the DB with historical data
```bash
python ingestion/auto_ingest_v2.py backfill
```
> Takes 30–60 min. Watch the logs. You'll see profiles being inserted year by year.

### Step 2 — Start the API
```bash
python -m uvicorn api.main:app --reload --port 8000
```
> The scheduler auto-starts on API launch and runs `daily` mode every 6 hours.

### Step 3 — Start the Frontend
```bash
cd frontend
npm run dev
```
> Frontend runs at http://localhost:5173

### Test a Query (no frontend needed)
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the average surface temperature in the Arabian Sea?"}'
```

### Check DB Schema (if needed)
- Full schema SQL: `db/schema.sql`
- Run in Supabase SQL Editor to create tables from scratch

---

## Your Touch Points

> **RAG guys, these are the files you own:**

### Files You Should Edit

| File | What to do |
|------|-----------|
| `rag/nodes.py` | LLM calls, prompt chains, structured output logic |
| `rag/graph.py` | LangGraph pipeline — add new nodes, change flow |
| `rag/state.py` | Add new state fields (e.g., `chat_history`, `streaming_chunks`) |
| `rag/prompts.py` | Tune `SQL_GEN_TEMPLATE`, `SUMMARY_TEMPLATE` |
| `rag/retriever.py` | Change embedding model, top-k, retrieval strategy |
| `rag/llm_provider.py` | Switch to different model or provider |
| `rag/corpus/*.md` | Add more context docs — schema notes, domain knowledge |
| `rag/build_index.py` | Change chunking strategy, indexing logic |

### Files You Should NOT Touch (Already Done)

| File | Owner | Status |
|------|-------|--------|
| `ingestion/auto_ingest_v2.py` | Lakshya | ✅ Done |
| `api/main.py` | Lakshya | ✅ Done |
| `blockchain/audit.py` | Docker Guy | ✅ Done |
| `db/schema.sql` | Lakshya | ✅ Done |

### How Your RAG Pipeline Plugs In

The API calls your pipeline exactly like this:
```python
# api/main.py line 232
from rag.graph import app as rag_graph

initial_state = {
    "question": request.question,
    "retry_count": 0,
}
final_state = await rag_graph.ainvoke(initial_state)
```

Your pipeline must:
1. Accept `AgentState` with at least `question` and `retry_count`
2. Return a state with `sql_query`, `query_result`, `summary`, and optionally `validation_error`

That's the full contract. Everything else — DB, ingestion, blockchain — is already wired up.

---

## Key Things to Know Before You Start

1. **The LLM is already wired to Groq** (`llama-3.3-70b-versatile`). Switch in `rag/llm_provider.py`.
2. **FAISS index must exist** before the API starts. Run `python rag/build_index.py` if it's missing.
3. **The corpus auto-updates after every ingestion.** Don't manually edit `data_stats.md` or `float_coverage.md` — they get overwritten.
4. **Blockchain is fully optional.** Set env vars to enable it, leave them blank to skip. Never blocks a query.
5. **The validator (`validate_sql`)** blocks queries using raw `TEMP`, `PSAL`, or any DML keywords. Your generated SQL must use `temp_adjusted` and `psal_adjusted`.
6. **Max 3 retries** on validation failure (`retry_count > 3` → pipeline ends gracefully).
7. **The scheduler is a background thread.** Don't interact with `ingestion_state` dict from your RAG code — it's internal to the API.

---

*— Team Wavesena 🌊*
