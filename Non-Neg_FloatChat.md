**NON-NEG**

*FloatChat --- What Gets Built. No Exceptions.*

HackIndia: Mar 13-14 \| TECHआरंभ 2.0: Mar 20-21 \| Team Argonauts

**⚡ The Non-Negotiable Stack**

These 6 things ship. Period. No excuses. No \'we ran out of time\'.

  --------------------------------------------------------------------------
  **TASK**                    **STATUS**    **OWNER**         **PRIORITY**
  --------------------------- ------------- ----------------- --------------
  **Streaming Responses       **TODO**      You + AI Guy 1    **CRITICAL**
  (SSE)**                                                     

  **Chat History / Memory**   **TODO**      AI Guy 1          **CRITICAL**

  **Login (Supabase Auth)**   **TODO**      Java Guy          **CRITICAL**

  **Auto Ingestion Pipeline** **IN          You (Lakshya)     **CRITICAL**
                              PROGRESS**                      

  **Blockchain Query Audit    **TODO**      Docker Guy        **HIGH**
  Trail**                                                     

  **Redis Rate Limiting +     **TODO**      Docker Guy        **HIGH**
  Cache**                                                     

  **React Frontend (Kill      **TODO**      You + All         **CRITICAL**
  Streamlit)**                                                
  --------------------------------------------------------------------------

**🔗 Blockchain --- The Wow Moment**

**What We\'re Building: On-Chain Query Audit Trail**

Every query a researcher runs on FloatChat gets cryptographically logged
on Polygon testnet. Immutable. Timestamped. Verifiable forever.

**Why this matters:**

-   Scientific reproducibility --- researchers can cite a TX hash in
    their papers

-   Proves FloatChat didn\'t hallucinate --- result hash is on-chain

-   Nobody can claim data was manipulated --- immutable audit trail

-   Real problem in ocean science. Real solution.

**What goes on-chain:**

-   SHA256 hash of (user query + generated SQL + result)

-   Timestamp of query

-   Transaction ID returned to user for verification

**Implementation:**

-   1 smart contract --- \~20 lines of Solidity

-   web3.py hooked into FastAPI --- fires after every successful query

-   Polygon Mumbai testnet --- free, fast, judges can verify live

Owner: Docker Guy \| Time: 1-2 days max

**🛡️ Redis --- One Setup, Three Wins**

**Distributed Rate Limiting (RLaaS)**

Don\'t just do boring rate limiting. Do DISTRIBUTED rate limiting so you
say:

> *\"FloatChat is built to scale. Whether 1 user or 10,000 researchers
> hit it simultaneously, our distributed rate limiter ensures fair
> access and API safety.\"*

**3 things Redis gives us for the price of 1 Docker container:**

-   Rate Limiting --- slowapi library, 10 lines on FastAPI. Judges
    can\'t spam-break the demo

-   Query Cache --- same question = instant answer, zero Groq API call

-   Session Store --- login sessions for Supabase Auth

Owner: Docker Guy \| Time: 1 day

**📅 10-Day War Plan (HackIndia: Mar 13-14)**

Every day has a clear owner. No ambiguity. No overlap.

+---------+-----------------------------------------+-----------------+
| **DAY** | **TASKS**                               | **OWNER**       |
+=========+=========================================+=================+
| **Day   | -   Streaming via SSE on FastAPI + Groq | You + AI Guy 1  |
| 1-2**   |                                         |                 |
|         | -   Chat history added to AgentState    |                 |
|         |                                         |                 |
|         | -   Feels like ChatGPT --- this is the  |                 |
|         |     #1 demo moment                      |                 |
+---------+-----------------------------------------+-----------------+
| **Day   | -   Supabase Auth login flow            | Java Guy        |
| 3**     |                                         |                 |
|         | -   Protected API routes                |                 |
|         |                                         |                 |
|         | -   Session management via Redis        |                 |
+---------+-----------------------------------------+-----------------+
| **Day   | -   Auto ingestion --- Airflow DAG or   | You (Lakshya)   |
| 4-5**   |     APScheduler                         |                 |
|         |                                         |                 |
|         | -   Scheduled pulls from Argo GDACs     |                 |
|         |                                         |                 |
|         | -   Auto-sync to Supabase + FAISS       |                 |
|         |     rebuild                             |                 |
+---------+-----------------------------------------+-----------------+
| **Day   | -   Kill Streamlit                      | All hands       |
| 6-7**   |                                         |                 |
|         | -   React frontend with proper chat UI  |                 |
|         |                                         |                 |
|         | -   Streaming bubbles, auth pages,      |                 |
|         |     clean design                        |                 |
+---------+-----------------------------------------+-----------------+
| **Day   | -   Smart contract deploy on Polygon    | Docker Guy      |
| 8**     |     Mumbai                              |                 |
|         |                                         |                 |
|         | -   web3.py integration in FastAPI      |                 |
|         |                                         |                 |
|         | -   Test audit trail end to end         |                 |
+---------+-----------------------------------------+-----------------+
| **Day   | -   Redis container setup               | Docker Guy      |
| 8**     |                                         |                 |
|         | -   slowapi rate limiting on all        |                 |
|         |     endpoints                           |                 |
|         |                                         |                 |
|         | -   Query caching layer                 |                 |
+---------+-----------------------------------------+-----------------+
| **Day   | -   End-to-end full flow test           | All hands       |
| 9**     |                                         |                 |
|         | -   Break it before judges do           |                 |
|         |                                         |                 |
|         | -   Fix everything that breaks          |                 |
+---------+-----------------------------------------+-----------------+
| **Day   | -   Demo rehearsal x5                   | You (Lakshya)   |
| 10**    |                                         |                 |
|         | -   Backup video recorded               |                 |
|         |                                         |                 |
|         | -   Pitch deck locked --- 3 slides max  |                 |
+---------+-----------------------------------------+-----------------+

**🎤 The 30-Second Pitch**

> *\"3.9 billion people depend on oceans. The data exists. But it\'s
> locked in formats that need a PhD to open. FloatChat lets any
> researcher, student, or policymaker just\... ask. In plain English.
> And every answer is cryptographically logged on-chain --- immutable,
> citable, verifiable. This is what democratized ocean science looks
> like.\"*

Then you demo. Live. Streaming response. Blockchain TX appears. Silence.
Applause.

**👥 Team Argonauts --- Who Owns What**

+-----------------+-----------------+-----------------+-----------------+
| **LAKSHYA**     | **JAVA GUY**    | **AI GUY 1**    | **DOCKER GUY**  |
+=================+=================+=================+=================+
| -               | -   FastAPI     | -   Streaming   | -   Smart       |
|    Orchestrator |     Backend     |     (SSE)       |     Contract    |
|                 |                 |                 |                 |
| -   Auto        | -   Supabase    | -   Chat        | -   web3.py     |
|     Ingestion   |     Auth        |     History     |     integration |
|     DAG         |                 |                 |                 |
|                 | -   Redis       | -   RAG         | -   Redis setup |
| -   React       |     Sessions    |                 |                 |
|     Frontend    |                 |    improvements | -   Docker      |
|                 | -   Java Spring |                 |     Compose all |
| -   Presenter + |     if needed   | -   Groq        |                 |
|     Glue        |                 |                 |                 |
|                 |                 |    optimization |                 |
+-----------------+-----------------+-----------------+-----------------+

***If it\'s not on this doc, it can wait. If it\'s on this doc, it
ships. --- Team Argonauts***
