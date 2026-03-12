# 🌊 FloatChat — Democratizing Ocean Science

> *"3.9 billion people depend on oceans. The data exists. But it's locked in formats that need a PhD to open. FloatChat lets any researcher, student, or policymaker just… ask."*

**Team Argonauts** · HackIndia Mar 13–14 · TECHआरंभ 2.0 Mar 20–21

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm
- **PostgreSQL** database (we use [Supabase](https://supabase.com))
- **Google Gemini API key** (for LLM)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/YourOrg/FloatChat-AI.git
cd FloatChat-AI
```

Create a `.env` file in the project root:

```env
# ── Core (Required) ────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:port/dbname
GOOGLE_API_KEY=your_google_gemini_api_key

# ── Supabase Auth (Required for frontend) ──────────────────────
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# ── Blockchain Audit Trail (Optional) ─────────────────────────
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
FLOATCHAT_CONTRACT_ADDRESS=your_contract_address
BLOCKCHAIN_WALLET_ADDRESS=your_wallet_address
BLOCKCHAIN_PRIVATE_KEY=your_private_key

# ── Optional ──────────────────────────────────────────────────
GROQ_API_KEY=your_groq_key          # Alternative LLM provider
OPENROUTER_API_KEY=your_key          # Alternative LLM provider
REDIS_URL=redis://localhost:6379     # For rate limiting
```

### 2. Install & Run

```bash
# Backend setup
python -m venv venv && venv\Scripts\activate   # Windows
# source venv/bin/activate                      # macOS/Linux
pip install -r requirements.txt

# Frontend setup
cd frontend && npm install && cd ..

# Run (two terminals)
python -m uvicorn api.main:app --reload --port 8000   # Terminal 1
cd frontend && npm run dev -- --host                             # Terminal 2
```

Open `http://localhost:5173` 🌊

### First-Time Data Ingestion

```bash
python ingestion/auto_ingest_v2.py backfill   # Load historical Argo data
python ingestion/auto_ingest_v2.py daily      # Schedule daily updates
```

## What Is FloatChat?

FloatChat is an **AI-powered ocean data query platform** built on top of the global [Argo float network](https://argo.ucsd.edu/) — a fleet of ~4,000 autonomous sensors measuring ocean temperature and salinity across every major ocean basin.

Instead of requiring a PhD and Python skills to query Argo data, FloatChat lets anyone ask in plain English:

> *"What is the average salinity in the Bay of Bengal at 500m depth?"*

and get back a real, SQL-backed, AI-summarised answer — with every query **cryptographically logged on the Polygon blockchain** for scientific reproducibility.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLOATCHAT STACK                          │
├──────────────┬──────────────────────────────┬───────────────────┤
│   FRONTEND   │         BACKEND              │    BLOCKCHAIN     │
│              │                              │                   │
│  React +     │  FastAPI                     │  Solidity         │
│  Vite        │    └─ LangGraph RAG          │  FloatChatAudit   │
│  Supabase    │         ├─ FAISS retrieve    │  on Polygon Amoy  │
│  Auth        │         ├─ Groq LLM (SQL)    │                   │
│  Chat UI     │         ├─ Validate SQL      │  web3.py hook     │
│  TX Badge    │         ├─ Execute SQL       │  after every      │
│              │         └─ Summarise         │  successful query │
│              │  Supabase PostgreSQL         │                   │
│              │  (Argo float data)           │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
```

### RAG Pipeline Flow

```
User Question
    │
    ▼
[1] RETRIEVE  ── FAISS semantic search → schema + QC rules context
    │
    ▼
[2] GENERATE  ── Groq LLM (llama-3.3-70b) → structured SQL via Pydantic
    │
    ▼
[3] VALIDATE  ── Safety checks (no DELETE/DROP) + schema rules (TEMP_ADJUSTED not TEMP)
    │             If invalid → loop back to GENERATE (max 3 retries)
    ▼
[4] EXECUTE   ── psycopg2 → Supabase PostgreSQL
    │
    ▼
[5] SUMMARISE ── Groq LLM → natural language answer
    │
    ▼
[6] AUDIT     ── SHA256(question + SQL + result) → Polygon Amoy blockchain TX
    │
    ▼
Response: { summary, sql_query, data, audit_hash, tx_hash, polygonscan_url }
```

---

## ✅ Non-Negotiable Ship Status

From the `Non-Neg_FloatChat.md` war plan — current state of each item:

| Feature | Owner | Status | Notes |
|---|---|---|---|
| **Streaming Responses (SSE)** | You + AI Guy 1 | ⏳ TODO | Next priority |
| **Chat History / Memory** | AI Guy 1 | ✅ **DONE** | Supabase `messages` table, loaded per conversation |
| **Login (Supabase Auth)** | Java Guy | ✅ **DONE** | Full email + Google OAuth, protected routes |
| **Auto Ingestion Pipeline** | Lakshya | 🔄 In Progress | APScheduler / Argo GDAC pulls |
| **Blockchain Query Audit Trail** | Docker Guy / This Branch | ✅ **DONE** | Polygon Amoy, `FloatChatAudit.sol`, gas fixed to 300k |
| **Redis Rate Limiting** | Docker Guy | ⏳ TODO | `slowapi` scaffold ready, add when Redis container is up |
| **React Frontend (Kill Streamlit)** | All | ✅ **DONE** | Full React + Vite, Streamlit retained as backup only |

---

## 📁 Repository Structure

```
FloatChat-AI/
│
├── 📋 Non-Neg_FloatChat.md       ← The law. If it's here, it ships.
├── 📋 Why_This_Branch.md         ← This branch's specific scope
│
├── api/
│   └── main.py                   ← FastAPI backend (CORS, /query, /query/sql)
│
├── blockchain/                   ← ⛓️ THIS BRANCH — Blockchain audit module
│   ├── audit.py                  ← SHA256 hash + web3.py TX to Polygon Amoy
│   ├── contract_abi.json         ← FloatChatAudit.sol ABI (deployed)
│   └── __init__.py
│
├── rag/
│   ├── graph.py                  ← LangGraph workflow (StateGraph)
│   ├── nodes.py                  ← retrieve / generate_sql / validate / execute / summarize
│   ├── state.py                  ← AgentState TypedDict
│   ├── retriever.py              ← FAISS semantic search
│   ├── prompts.py                ← SQL gen + fix + summary prompts
│   ├── llm_provider.py           ← Groq provider setup
│   ├── utils.py                  ← Schema markdown loader
│   ├── build_index.py            ← One-time FAISS index builder
│   ├── corpus/                   ← Knowledge base (schema.md, qc_rules.md)
│   └── faiss_index/              ← Pre-built semantic index (committed)
│
├── frontend/                     ← ⚛️ React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── ChatWindow.jsx    ← Main chat UI, sends /query, handles blockchain response
│       │   ├── MessageBubble.jsx ← Per-message component with SQL reveal + TX badge
│       │   ├── Sidebar.jsx       ← Conversation history
│       │   ├── OceanLoader.jsx   ← Loading animation
│       │   └── UsernameModal.jsx
│       ├── pages/
│       │   ├── LandingPage.jsx   ← Public landing
│       │   ├── AuthPage.jsx      ← Supabase Auth (email + OAuth)
│       │   └── ChatPage.jsx      ← Protected chat experience
│       └── context/
│           └── AuthContext.jsx   ← Global auth state
│
├── ingestion/
│   └── load_single_argo.py       ← NetCDF → PostgreSQL ETL
│
├── db/
│   └── schema.sql                ← Table definitions (argo_profiles, argo_measurements)
│
├── data/                         ← Argo float NetCDF files
├── sql_examples/                 ← Canonical query examples
├── streamlit_app.py              ← Legacy UI (kept as fallback)
├── start.bat / stop.bat          ← One-command start/stop for Windows
└── requirements.txt
```

---

## ⛓️ Blockchain Audit Trail (This Branch)

### What We Built

Every successful FloatChat query is **permanently recorded on the Polygon Amoy blockchain**. This means:

- A researcher can **cite a TX hash in a paper** — the query is permanently on-chain
- Proves FloatChat **didn't hallucinate** — the result hash is immutable
- Nobody can claim data was manipulated — the audit trail can never be edited
- **Real problem in ocean science**: reproducibility is everything

### Smart Contract — `FloatChatAudit.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FloatChatAudit {
    struct QueryRecord {
        bytes32 queryHash;   // SHA256 of question + sql + result
        uint256 timestamp;
        address submitter;
    }

    QueryRecord[] public records;
    event QueryLogged(bytes32 indexed queryHash, uint256 timestamp);

    function logQuery(bytes32 queryHash) external {
        records.push(QueryRecord(queryHash, block.timestamp, msg.sender));
        emit QueryLogged(queryHash, block.timestamp);
    }

    function getRecordCount() external view returns (uint256) {
        return records.length;
    }
}
```

**Deployed at:** `0xa30Af03B660e97AEaE67f73e31f5eBEdB224Df88` on Polygon Amoy Testnet

### What Gets Hashed

```python
SHA256( user_question + generated_sql + JSON(query_result) )
```

This hash is **independently reproducible** — any researcher can verify it without trusting FloatChat.

### API Response (with blockchain fields)

```json
{
  "summary": "The average salinity in the Bay of Bengal is 33.7 PSU...",
  "sql_query": "SELECT AVG(m.psal_adjusted) FROM ...",
  "data": [...],
  "audit_hash": "sha256:3f4a9b2c...",
  "tx_hash": "0x5749d9df6d...",
  "polygonscan_url": "https://amoy.polygonscan.com/tx/0x5749d9df6d..."
}
```

### Frontend TX Badge

Every AI response renders an **On-Chain Verified** panel:

- ⛓️ Animated "On-Chain Verified" header with live green pulse dot
- Short TX hash pill with one-click copy
- "View on PolygonScan ↗" button linking to Amoy explorer
- Expandable section showing full TX hash + full SHA-256 audit hash
- Copy buttons on both hashes with ✓ confirmation feedback

---

## 🔐 Authentication (Supabase Auth)

Full auth flow with Supabase:

- **Email + Password** sign up / sign in
- **Google OAuth** button
- JWT session management via Supabase client SDK
- Protected routes via `ProtectedRoute.jsx` — unauthenticated users bounced to `/auth`
- User ID stored on all conversations and messages for multi-tenancy

---

## 💬 Chat History

All conversations and messages are persisted in Supabase:

```
conversations
  ├── id (UUID)
  ├── user_id → auth.users
  ├── title (first 58 chars of first question)
  └── created_at

messages
  ├── id (UUID)
  ├── conversation_id → conversations
  ├── role ('user' | 'assistant')
  ├── content (text)
  ├── sql_generated (nullable)
  ├── tx_hash (nullable)        ← blockchain TX
  ├── audit_hash (nullable)     ← SHA-256 for verification
  └── created_at
```

The sidebar shows all past conversations. Clicking one loads full message history from Supabase.

---

## 🗄️ Database Schema

### `argo_profiles` — One row per Argo float profile (measurement cycle)

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | Internal ID |
| `wmo_id` | INTEGER | World Meteorological Organization float ID |
| `cycle_number` | INTEGER | Float's dive cycle number |
| `profile_datetime` | TIMESTAMP | When the profile was recorded |
| `latitude` | DOUBLE | Geographic position |
| `longitude` | DOUBLE | Geographic position |
| `data_mode` | CHAR(1) | `R` = real-time, `D` = delayed (quality-controlled) |
| `source_file` | TEXT | Original NetCDF filename |

### `argo_measurements` — Vertical measurements at multiple depths

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | Internal ID |
| `profile_id` | FK → argo_profiles | Links to parent profile |
| `pressure` | DOUBLE | Depth in decibars (higher = deeper) |
| `temp_adjusted` | DOUBLE | Temperature °C — **always use this, not raw TEMP** |
| `psal_adjusted` | DOUBLE | Salinity PSU — **always use this, not raw PSAL** |
| `temp_qc` | CHAR(1) | Quality flag. `'1'` = good data |
| `psal_qc` | CHAR(1) | Quality flag. `'1'` = good data |

> ⚠️ **Schema Rule**: The RAG validator enforces `TEMP_ADJUSTED` and `PSAL_ADJUSTED`. Raw `TEMP` and `PSAL` are banned — they're uncorrected sensor data and scientifically invalid.

---

## 🚀 Running the Stack

### Prerequisites

- Python 3.10+
- Node.js 22.12+ (Required for Vite 8 Beta)
- Git

### 1. Clone & Install

```bash
git clone <repo_url>
cd FloatChat-AI

# Python backend
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Mac/Linux
pip install -r requirements.txt

# React frontend
cd frontend
npm install
cd ..
```

### 2. Configure `.env`

```env
# ── Core ──────────────────────────────────────────────────────────
DATABASE_URL=postgresql://...supabase...
GROQ_API_KEY=gsk_...

# ── Supabase Auth (frontend) ───────────────────────────────────────
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# ── Blockchain (Polygon Amoy Testnet) ─────────────────────────────
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
FLOATCHAT_CONTRACT_ADDRESS=0xa30Af03B660e97AEaE67f73e31f5eBEdB224Df88
BLOCKCHAIN_WALLET_ADDRESS=0x...your wallet...
BLOCKCHAIN_PRIVATE_KEY=...your private key (no 0x prefix)...

# ── Redis (when Docker container is ready) ────────────────────────
# REDIS_URL=redis://redis:6379
```

> 🔒 `.env` is in `.gitignore` — **never commit your private key**.

### 3. Build the FAISS Index (one-time)

```bash
python rag/build_index.py
```

### 4. Start Everything

**Option A — Quick start (Windows)**
```bash
start.bat
```

**Option B — Manual (two terminals)**
```bash
# Terminal 1 — FastAPI backend
python -m uvicorn api.main:app --reload --port 8000

# Terminal 2 — React frontend
cd frontend
npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

---

## 🔌 API Reference

### `POST /query` — Main RAG endpoint

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the average temperature at 200m depth in the Indian Ocean?"}'
```

**Response:**
```json
{
  "summary": "The average temperature at 200m depth in the Indian Ocean is 14.3°C...",
  "sql_query": "SELECT AVG(m.temp_adjusted) FROM argo_measurements m JOIN argo_profiles p ON ...",
  "data": [{"avg": 14.32}],
  "validation_error": null,
  "audit_hash": "sha256:abc123...",
  "tx_hash": "0xdef456...",
  "polygonscan_url": "https://amoy.polygonscan.com/tx/0xdef456...",
  "blockchain_error": null
}
```

### `POST /query/sql` — Raw SQL execution

```bash
curl -X POST http://localhost:8000/query/sql \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT COUNT(*) FROM argo_profiles"}'
```

### `GET /health` — Backend health check

```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

---

## 🧑‍💻 Team Argonauts — Who Owns What

| Lakshya | Java Guy | AI Guy 1 | Docker Guy |
|---|---|---|---|
| Orchestrator & Presenter | FastAPI Backend | SSE Streaming | Smart Contract |
| Auto-Ingestion DAG | Supabase Auth | Chat History | web3.py integration |
| **React Frontend** | Redis Sessions | RAG improvements | Redis setup |
| This README | Java Spring (if needed) | Groq optimisation | Docker Compose |

---

## 🗺️ What's Left (Before HackIndia Mar 13)

| Task | Owner | Urgency |
|---|---|---|
| SSE Streaming responses | AI Guy 1 | 🔴 CRITICAL |
| Get Amoy testnet MATIC (faucet cooldown) | Lakshya | 🔴 Blocking blockchain |
| Auto-ingestion APScheduler | Lakshya | 🟡 HIGH |
| Redis container + `slowapi` rate limiting | Docker Guy | 🟡 HIGH |
| Docker Compose for all services | Docker Guy | 🟡 HIGH |
| Full end-to-end test + break it | All | 🟡 Day 9 |
| Demo rehearsal × 5 | Lakshya | 🔴 Day 10 |

---

## 🎤 The 30-Second Demo Pitch

> *"3.9 billion people depend on oceans. The data exists. But it's locked in formats that need a PhD to open. FloatChat lets any researcher, student, or policymaker just… ask. In plain English. And every answer is cryptographically logged on-chain — immutable, citable, verifiable. This is what democratized ocean science looks like."*

**Then you demo. Live. Streaming response. Blockchain TX appears. Silence. Applause.**

---

## 🔧 Troubleshooting

| Error | Fix |
|---|---|
| `FAISS index not found` | Run `python rag/build_index.py` |
| `Connection refused` on frontend | Start backend: `uvicorn api.main:app --reload --port 8000` |
| Groq `413` token limit | Large result set — query returned too many rows. Add `LIMIT` to the question |
| Blockchain `out of gas` | Gas limit set to 300k. Get MATIC from [alchemy.com/faucets/polygon-amoy](https://www.alchemy.com/faucets/polygon-amoy) |
| `Blockchain env vars not configured` | Fill in contract address + wallet + private key in `.env` |
| Supabase SSL error | Use `sslmode='require'` in psycopg2 connection string |

---

## 📄 License

See `LICENSE` in the repository root.

---

*If it's not on the Non-Neg doc, it can wait. If it's on the Non-Neg doc, it ships. — Team Argonauts*
