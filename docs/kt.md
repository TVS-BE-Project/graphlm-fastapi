# GraphLM — Knowledge Transfer Document

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Schema](#5-database-schema)
6. [Backend — API Routes](#6-backend--api-routes)
7. [Indexing Pipeline](#7-indexing-pipeline)
8. [Agent Pipeline](#8-agent-pipeline)
9. [Context Window Management](#9-context-window-management)
10. [Real-Time Features (SSE)](#10-real-time-features-sse)
11. [Authentication & Security](#11-authentication--security)
12. [Frontend Structure](#12-frontend-structure)
13. [Configuration Reference](#13-configuration-reference)
14. [Running the Project](#14-running-the-project)
15. [Key Design Decisions](#15-key-design-decisions)

---

## 1. Project Overview

**GraphLM** is a full-stack AI research assistant. Users upload documents (PDF, DOCX, TXT, MD) or connect GitHub repositories, which get indexed into a dual knowledge store — a **vector database** (Qdrant) for semantic search and a **knowledge graph** (Neo4j) for entity/relationship traversal. Users then chat with an AI agent that retrieves from both stores in real time.

The name reflects the core idea: **Graph** + **Language Model**.

This is a BE (Bachelor of Engineering) Final Exam project, Semester 8, AISSMS IOIT.

---

## 2. Tech Stack

### Backend
| Category | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| Language | Python 3.13 |
| ORM | SQLAlchemy (sync) |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Rate Limiting | slowapi (NoOpLimiter in dev) |
| Real-time | PostgreSQL LISTEN/NOTIFY via asyncpg |

### AI / Indexing
| Category | Technology |
|---|---|
| LLM | OpenAI (`gpt-4o-mini` by default) |
| Embeddings | OpenAI (`text-embedding-3-small`) |
| Agent SDK | OpenAI Agents SDK (`openai-agents`) |
| Vector DB | Qdrant |
| Graph DB | Neo4j (with APOC plugin) |
| Graph Construction | LangChain experimental `LLMGraphTransformer` |
| Long-term Memory | Mem0 (`mem0ai` cloud API) |
| RAG Framework | LangChain + langchain-qdrant + langchain-neo4j |

### External Services
| Service | Purpose |
|---|---|
| Cloudinary | Document file storage (fallback for indexing, avatar storage) |
| Mailtrap | Transactional email (verification, password reset) |
| GitHub OAuth | Social login + repo ingestion |
| PostgreSQL | Primary relational database |

### Frontend
| Category | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Styling | TailwindCSS 4 |
| State | Zustand 5 |
| Routing | React Router 7 |
| Graph Visualization | vis-network + vis-data |
| Chat Rendering | react-markdown + remark-gfm |
| Notifications | sonner |
| HTTP Client | axios |

---

## 3. Repository Structure

```
graphlm-fastapi/
├── app/
│   ├── api/
│   │   ├── routes/           # Route handlers (auth, users, sessions, sources, health)
│   │   ├── deps.py           # FastAPI dependency injectors (get_current_user, etc.)
│   │   └── limiter.py        # Rate limiter setup (NoOpLimiter in dev)
│   ├── core/
│   │   ├── config.py         # Pydantic settings + Neo4j driver singleton
│   │   ├── error_codes.py    # Application-level error code constants
│   │   └── security.py       # JWT token creation/verification
│   ├── db/
│   │   ├── database.py       # SQLAlchemy engine + Base + get_db
│   │   ├── session.py        # get_db_session() context manager (for background tasks)
│   │   ├── listeners/        # PostgreSQL LISTEN/NOTIFY async listener
│   │   └── sql/              # Raw SQL for PG trigger creation/teardown
│   ├── models/               # SQLAlchemy ORM models
│   ├── repositories/         # DB query helpers (user_repo, session_repo, source_repo)
│   ├── schemas/              # Pydantic request/response schemas
│   ├── services/
│   │   ├── agents/           # AI agent logic
│   │   │   ├── chat_agent.py         # OpenAI Agents SDK runner (streaming + non-streaming)
│   │   │   ├── graph_query_agent.py  # Standalone graph query (for Studio panel)
│   │   │   ├── pipeline.py           # Agent pipeline orchestrator
│   │   │   ├── tools.py              # Agent tools (vector_search, graph_search, memory tools)
│   │   │   ├── context/              # Context window management (rolling summary, budgeting)
│   │   │   └── streaming/            # SSE streaming response handler
│   │   ├── indexing/
│   │   │   ├── pipeline.py     # Indexing pipeline orchestrator (two-phase)
│   │   │   ├── ingestion.py    # Document loading + chunking
│   │   │   ├── vector_index.py # Qdrant collection creation + embedding
│   │   │   └── graph_index.py  # Neo4j knowledge graph construction
│   │   ├── auth_service.py
│   │   ├── cloudinary_service.py
│   │   ├── github_oauth_service.py
│   │   └── health_service.py
│   ├── templates/email/      # Jinja2 HTML email templates
│   ├── utils/                # Helpers (logger, api_error, token_utils, etc.)
│   └── main.py               # FastAPI app + lifespan + CORS + route registration
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios service modules per resource
│   │   ├── Components/       # Reusable UI components
│   │   │   ├── Chat/         # ChatPanel, SourcesPanel, StudioPanel, Canvas (GraphView)
│   │   │   ├── Auth/         # Login/Register forms
│   │   │   ├── Common/       # Shared UI primitives
│   │   │   └── Layout/
│   │   ├── pages/            # Page-level components (Landing, Dashboard, Chat, Auth, etc.)
│   │   ├── store/            # Zustand stores (authStore, chatStore, sourceStore, themeStore)
│   │   ├── routes/           # React Router route definitions
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── migrations/               # Alembic migration versions
├── docker-compose.yml        # PostgreSQL, Neo4j, Qdrant
├── requirements.txt
├── alembic.ini
└── .env.sample
```

---

## 4. Architecture Overview

```
                         ┌─────────────────────────────────┐
                         │        React Frontend           │
                         │  (Vite, Zustand, vis-network)   │
                         └────────────┬────────────────────┘
                                      │ HTTP / SSE
                         ┌────────────▼────────────────────┐
                         │      FastAPI Backend            │
                         │   (Uvicorn, port 4000)          │
                         │                                 │
                         │  ┌──────────┐  ┌────────────┐  │
                         │  │  Routes  │  │  Services  │  │
                         │  └────┬─────┘  └─────┬──────┘  │
                         └───────┼──────────────┼─────────┘
                                 │              │
              ┌──────────────────┼──────────────┼───────────────────┐
              │                  │              │                   │
   ┌──────────▼───┐  ┌───────────▼──┐  ┌───────▼──────┐  ┌────────▼──────┐
   │  PostgreSQL  │  │    Qdrant    │  │    Neo4j     │  │     Mem0      │
   │  (port 5433) │  │ (port 6333)  │  │ (port 7687)  │  │  (cloud API)  │
   │  Primary DB  │  │ Vector Store │  │ Graph Store  │  │ Long-term Mem │
   └──────────────┘  └──────────────┘  └──────────────┘  └───────────────┘
```

### Request lifecycle for a chat message

```
User sends message
      │
      ▼
POST /sessions/{id}/messages
      │
      ├─ Persist user message to PostgreSQL
      │
      ├─ Open DB session → resolve sources + build context window
      │       └─ Load rolling summary + recent messages
      │       └─ Estimate token budget → mark for compaction if needed
      │       └─ Assemble context list [{role, content}, ...]
      │
      ├─ Close DB session  ← no held connections during LLM inference
      │
      ├─ Run OpenAI Agents SDK (streaming)
      │       └─ Tools: vector_search, graph_search, memory tools, subgraph_query
      │
      ├─ Stream SSE events to frontend (text chunks, tool_call, tool_output)
      │
      ├─ Persist assistant message to PostgreSQL
      │
      └─ Background: embed both messages into Qdrant (non-blocking)
```

---

## 5. Database Schema

### Models

**User**
- `id` (UUID PK), `email`, `username`, `hashed_password`
- `is_verified` (bool), `avatar_url`, `github_id`, `refresh_token`
- `created_at`, `updated_at`

**Source**
- `id` (UUID PK), `user_id` (FK → users)
- `title`, `type` (enum: `document` | `github`), `status` (enum: `uploaded` | `indexing` | `indexed` | `failed`)
- `metadata` (JSON) — stores `filename`, `file_type`, `temp_file_path`, `cloudinary_url`, `repo_url`, `branch`, etc.
- `created_at`

**SourceIndex** (1:1 with Source)
- `id`, `source_id` (FK → sources)
- `collection_name` — Qdrant collection name (`document_{uuid}` or `github_{uuid}`)
- `vector_indexed` (bool), `vector_indexed_at`
- `graph_indexed` (bool), `graph_indexed_at`, `entity_count`, `relation_count`
- `error_message` — captures graph indexing failures
- `provider`, `embedding_model`, `chunk_size`, `chunk_overlap`

**ChatSession**
- `id`, `user_id` (FK → users), `title`, `created_at`
- Context control fields:
  - `rolling_summary` (Text) — compressed older conversation history
  - `last_compacted_message_id` — boundary marker for compaction
  - `needs_compaction` (bool), `last_compacted_at`
  - `recent_window_size` (default 20), `estimated_token_usage`
  - `compaction_threshold` (default 0.85)
- Many-to-many with Source via `chat_session_sources` join table

**ChatMessage**
- `id`, `chat_id` (FK → chat_sessions), `role` (enum: `user` | `assistant`)
- `content` (Text), `created_at`

### Relationships

```
User ──< Source ──1 SourceIndex
User ──< ChatSession >──< Source   (many-to-many via chat_session_sources)
ChatSession ──< ChatMessage
```

---

## 6. Backend — API Routes

All responses are wrapped in `ApiResponse { statusCode, success, message, data }`.

### Auth — `/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register with email + password |
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |
| GET | `/auth/verify-email` | Verify email via token link |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password via token |
| GET | `/auth/github` | Initiate GitHub OAuth flow |
| GET | `/auth/github/callback` | GitHub OAuth callback |

### Users — `/users`
| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update profile (username, etc.) |
| POST | `/users/me/avatar` | Upload avatar (Cloudinary) |
| DELETE | `/users/me/avatar` | Remove avatar |

### Sessions — `/sessions`
| Method | Path | Description |
|---|---|---|
| POST | `/sessions/` | Create new chat session |
| GET | `/sessions/` | List all sessions (newest first) |
| GET | `/sessions/{id}` | Get session details + sources |
| PATCH | `/sessions/{id}/title` | Rename session |
| DELETE | `/sessions/{id}` | Delete session (cascades messages + Qdrant cleanup) |
| PATCH | `/sessions/{id}/sources` | Attach sources (only if 0 messages) |
| DELETE | `/sessions/{id}/sources/{src_id}` | Detach source (only if 0 messages) |
| POST | `/sessions/{id}/messages` | Send message → SSE streaming response |
| GET | `/sessions/{id}/messages` | Paginated message history |
| POST | `/sessions/{id}/graph/query` | Query knowledge graph (natural language) |
| GET | `/sessions/{id}/graph` | Get full graph (all nodes/edges, capped 500) |
| GET | `/sessions/{id}/context/state` | Context window debug info |
| POST | `/sessions/{id}/context/evaluate` | Evaluate if compaction is needed |
| POST | `/sessions/{id}/context/compact` | Manually trigger compaction |
| GET | `/sessions/{id}/context/summary` | Get rolling summary |
| POST | `/sessions/{id}/context/rebuild` | Rebuild context from transcript (admin only) |

### Sources — `/sources`
| Method | Path | Description |
|---|---|---|
| POST | `/sources/upload` | Upload document (PDF/DOCX/TXT/MD) → triggers indexing |
| POST | `/sources/github` | Add GitHub repo → triggers indexing |
| GET | `/sources/` | List all sources (paginated) |
| GET | `/sources/{id}` | Get source details |
| GET | `/sources/{id}/status` | SSE stream: live indexing progress |
| DELETE | `/sources/{id}` | Delete source + cleanup Qdrant + Neo4j |

### Health — `/health`
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Application health check |

---

## 7. Indexing Pipeline

Located in `app/services/indexing/`.

### Trigger
Both `POST /sources/upload` and `POST /sources/github` set the source status to `indexing` and register `run_indexing_pipeline(source_id)` as a FastAPI `BackgroundTask`. The 202 response is returned immediately.

### Phase 1 — Document Loading & Chunking (`ingestion.py`)
- Documents: loaded via LangChain loaders (`PyPDFLoader`, `Docx2txtLoader`, `TextLoader`) → split into chunks (`RecursiveCharacterTextSplitter`, chunk_size=1000, overlap=200)
- GitHub repos: cloned via LangChain `GithubFileLoader` → split similarly, filtered by file extension

### Phase 2 — Vector Indexing (`vector_index.py`) — blocking
- Creates a Qdrant collection named `{type}_{source_id}` (e.g., `document_abc-123`)
- Embeds all chunks via OpenAI `text-embedding-3-small`
- Stores vectors + metadata in Qdrant
- On success: sets `SourceIndex.vector_indexed = True`
- On failure: sets `Source.status = failed` and stops — vector failure is fatal

After vector indexing completes successfully:
- `Source.status` is set to `indexed` → **chat is unblocked immediately**

### Phase 3 — Graph Indexing (`graph_index.py`) — async background, non-fatal
- Runs `LLMGraphTransformer` (LangChain experimental) on document chunks
- Extracts entities (nodes) and relationships (edges) using the LLM
- Writes to Neo4j with `source_id` property on every node for session scoping
- On success: sets `SourceIndex.graph_indexed = True`, stores `entity_count` and `relation_count`
- On failure: logs error, records `error_message` on `SourceIndex` — does NOT revert `indexed` status

### Cleanup
Temp files and directories are deleted in the `finally` block after the pipeline completes (or fails).

### Source Deletion Cleanup
Deleting a source cascades to:
1. Delete the Qdrant collection
2. Delete all Neo4j nodes/edges where `source_id` matches
3. Delete `SourceIndex` record (SQLAlchemy cascade)
4. Delete `Source` record
5. Delete Cloudinary backup file

---

## 8. Agent Pipeline

Located in `app/services/agents/`.

### Tools (`tools.py`)

All tools receive context via `RunContextWrapper[AgentPromptContext]` (no global state).

| Tool | What it does |
|---|---|
| `vector_search` | Semantic search across all attached Qdrant collections |
| `graph_search` | Neo4j entity/relationship lookup by entity name |
| `search_memory` | Query Mem0 long-term user memory |
| `save_memory` | Persist a user fact to Mem0 (agent-decided, not every turn) |
| `update_memory` | Update an existing Mem0 fact by memory_id |
| `delete_memory` | Remove a Mem0 fact by memory_id |
| `subgraph_query` | Query Neo4j for a subgraph (only active in subgraph_mode) |

**Memory strategy:** The agent is the sole writer to Mem0. No manual `mem0.add()` calls anywhere else in the codebase. This prevents duplicate writes and memory bloat.

### Agent (`chat_agent.py`)

- Uses OpenAI Agents SDK `Agent[AgentPromptContext]`
- A fresh `Agent` instance is created per request — stateless by design
- System prompt is dynamically built per request with session context (which collections, which source IDs, subgraph mode status)
- `run_agent()` — non-streaming, returns full reply string
- `run_agent_stream()` — streaming, yields typed tuples: `("text", chunk)`, `("tool_call", {...})`, `("tool_output", {...})`

### Subgraph Mode

When the user enables the graph panel in the UI:
- `subgraph_mode=True` is sent with each message
- `subgraph_query` tool is added to the agent's tool list
- System prompt directs the agent to call `subgraph_query` on every message, in parallel with other tools
- The subgraph query result (JSON of nodes/edges) is returned to the frontend via the SSE stream so the graph panel updates in real time
- Source scoping: if the user has selected specific sources in the UI, `subgraph_query` is restricted to the intersection of graph-indexed source IDs and user-selected IDs

### Pipeline Orchestrator (`pipeline.py`)

```
run_agent_pipeline_stream()
  │
  ├─ Open DB session
  │     ├─ _resolve_sources()  → collection_names (vector) + source_ids (graph)
  │     └─ build_context_window()  → [{role, content}, ...]
  │
  ├─ Close DB session  ← before LLM call
  │
  └─ run_agent_stream()  → yields typed SSE events
```

---

## 9. Context Window Management

Located in `app/services/agents/context/`.

### Problem it solves
Long conversations eventually exceed the LLM's context window (128K tokens for gpt-4o). The context manager implements a **rolling conversation runtime** inspired by Claude's compaction approach.

### Pipeline stages (`manager.py`)

1. **Load state** — load `rolling_summary` from `ChatSession` + last N messages (windowed, `recent_window_size` default 20)
2. **Estimate budget** — count tokens in summary + recent messages; compute available headroom after reserving space for RAG results and agent reply
3. **Mark for compaction** — if token usage exceeds `compaction_threshold` (85%), set `needs_compaction = True` on the session. Compaction is **never synchronous** in the request path — the agent runs immediately.
4. **Optional semantic retrieval** — disabled by default (`ENABLE_SEMANTIC_CHAT_RETRIEVAL=False`). When enabled, searches Qdrant for semantically relevant older messages.
5. **Assemble context** — combine summary (as a system message) + recent messages + optional semantic hits into the final `[{role, content}]` list passed to the agent.

### Context compaction (`summarizer.py`)
When triggered manually (`POST /sessions/{id}/context/compact`) or detected:
- Takes all messages before the compaction boundary
- Calls the LLM to generate/update a rolling summary
- Stores the summary in `ChatSession.rolling_summary`
- Updates `last_compacted_message_id` marker

### Token budget config
```
MODEL_MAX_TOKENS         = 128000    # total model context
CONTEXT_SAFE_RATIO       = 0.75      # use only 75% → 96000 tokens
CONTEXT_RESERVED_FOR_RAG = 15000     # headroom for retrieval results
CONTEXT_RESERVED_FOR_RESPONSE = 5000 # headroom for agent reply
SYSTEM_PROMPT_BUDGET     = 1000      # system prompt + tool descriptions
CONTEXT_KEEP_RECENT      = 6         # always include last 6 messages verbatim
COMPACTION_THRESHOLD     = 0.85      # trigger at 85% of available budget
COMPACTION_TARGET_RATIO  = 0.50      # compact down to 50% of budget
```

---

## 10. Real-Time Features (SSE)

GraphLM uses Server-Sent Events in two places:

### 1. Indexing Status (`GET /sources/{id}/status`)
- Frontend opens an `EventSource` connection when a source starts indexing
- Backend registers a per-source `asyncio.Queue` with the global `SourceStatusListener`
- PostgreSQL triggers fire `NOTIFY source_status_channel, '<JSON>'` when `sources.status` or `source_indexes` rows change
- The `asyncpg` listener picks up notifications and routes them to the correct queue
- Two-condition state machine: stream closes only when BOTH `status=indexed` AND graph is resolved (success or error)
- Heartbeat comment (`: heartbeat`) sent every 20s to prevent proxy timeouts

**Event types:** `snapshot`, `source_status_changed`, `source_index_changed`, `complete`

### 2. Chat Streaming (`POST /sessions/{id}/messages`)
- Returns a `StreamingResponse` with `media_type="text/event-stream"`
- Events are formatted as plain text chunks (not standard SSE `event:` framing)
- Event prefixes in the data stream:
  - `[PIPELINE] ...` — context building progress
  - `[TOOL] tool_name:arguments` — tool being called
  - `[TOOL_OUTPUT] tool_name:result` — tool completed
  - Raw text chunks — agent response tokens
  - `[DONE]` — stream complete
  - `[ERROR] ...` — on failure

---

## 11. Authentication & Security

### JWT Strategy
- **Access token**: short-lived (15 hours by default), stored in `localStorage` on the frontend
- **Refresh token**: longer-lived (7 days), stored in the `User.refresh_token` DB column (single active refresh token per user)
- Token verification in `app/core/security.py`, dependency injection in `app/api/deps.py`

### Auth flows
- **Email/password**: register → receive verification email → verify → login
- **GitHub OAuth**: redirect to GitHub → callback → create/link user → issue tokens
- **Password reset**: forgot password → email with reset link → token-verified reset

### Ownership enforcement
Every resource-mutating endpoint calls `verify_ownership(resource.user_id, current_user.id, resource_type)` from `app/utils/db_queries.py`. This raises `ApiError(403)` if the IDs don't match.

### Rate limiting
`slowapi` is configured on key endpoints. In development, `NoOpLimiter` is used so limits are not enforced. Limits per endpoint:
- `5/minute` — create/send message/upload/add github/delete/attach sources
- `20/minute` — list/read endpoints
- `10/minute` — evaluate compaction, get source status

---

## 12. Frontend Structure

### Pages
| Page | Path | Description |
|---|---|---|
| `Landing` | `/` | Marketing / entry page |
| `AuthPage` | `/auth` | Login / Register forms |
| `EmailVerifiedPage` | `/email-verified` | Post-verification confirmation |
| `VerifyEmailPage` | `/verify-email` | Email verification in progress |
| `ForgotPasswordPage` | `/forgot-password` | Request password reset |
| `ResetPasswordPage` | `/reset-password` | Enter new password |
| `Dashboard` | `/dashboard` | Source library + session list |
| `Chat` | `/chat/:sessionId` | Main chat interface |
| `NotFoundPage` | `*` | 404 |

### Chat Page Layout
The Chat page is divided into resizable panels:
- **SourcesPanel** — sidebar showing attached sources with their indexing status
- **ChatPanel** — conversation thread, message input, streaming rendering; has a header menu for session actions (rename, etc.)
- **StudioPanel** — knowledge graph studio (query input, graph visualization via vis-network)
- **Canvas / GraphView** — interactive `vis-network` graph that updates in real time during subgraph_mode chat

### Zustand Stores
| Store | Manages |
|---|---|
| `authStore` | User session, login/logout, token refresh |
| `chatStore` | Sessions list, active session, messages, streaming state |
| `sourceStore` | Sources list, indexing status, SSE connections |
| `themeStore` | Light/dark theme preference |

### API Modules (`src/api/`)
Each file wraps axios calls for one resource:
`authService`, `userService`, `chatSessionService`, `chatMessageService`, `sourceService`, `healthService`, `githubOAuthService`

---

## 13. Configuration Reference

All settings are loaded from `.env` via `pydantic-settings` (`app/core/config.py`).

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (psycopg2) |
| `ASYNC_DATABASE_URL` | auto-derived | PostgreSQL connection string (asyncpg) |
| `ACCESS_TOKEN_SECRET` | — | JWT access token signing secret |
| `REFRESH_TOKEN_SECRET` | — | JWT refresh token signing secret |
| `ACCESS_TOKEN_EXPIRE_HOURS` | 15 | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | Refresh token lifetime |
| `PORT` | 4000 | Backend server port |
| `HOST` | 127.0.0.1 | Backend server host |
| `ENVIRONMENT` | development | `development` / `production` |
| `BASE_URL` | http://localhost:4000 | Used in email links |
| `CLIENT_URL` | http://localhost:5173 | Frontend URL (for OAuth redirects) |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_LLM_MODEL` | gpt-4o-mini | LLM model name |
| `OPENAI_EMBEDDING_MODEL` | text-embedding-3-small | Embedding model |
| `NEO4J_URI` | bolt://localhost:7687 | Neo4j connection |
| `NEO4J_USERNAME` | neo4j | Neo4j username |
| `NEO4J_PASSWORD` | — | Neo4j password |
| `QDRANT_URL` | http://localhost:6333 | Qdrant endpoint |
| `QDRANT_API_KEY` | (empty) | Qdrant API key (blank for local) |
| `MEM0_API_KEY` | — | Mem0 cloud API key |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API secret |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth app secret |
| `GITHUB_REDIRECT_URI` | — | GitHub OAuth callback URL |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | — | PAT for private repo ingestion |
| `MODEL_MAX_TOKENS` | 128000 | LLM context size |
| `CONTEXT_SAFE_RATIO` | 0.75 | Use 75% of model context |
| `CONTEXT_RESERVED_FOR_RAG` | 15000 | Token headroom for retrieval |
| `CONTEXT_RESERVED_FOR_RESPONSE` | 5000 | Token headroom for reply |
| `CONTEXT_KEEP_RECENT` | 6 | Always include last N messages verbatim |
| `COMPACTION_THRESHOLD` | 0.85 | Trigger compaction at this usage % |
| `COMPACTION_TARGET_RATIO` | 0.50 | Compact down to this % |
| `ENABLE_SEMANTIC_CHAT_RETRIEVAL` | False | Enable semantic search over chat history |
| `CHUNK_SIZE` | 1000 | Document chunk size for indexing |
| `CHUNK_OVERLAP` | 200 | Chunk overlap |

---

## 14. Running the Project

### Prerequisites
- Docker Desktop
- Python 3.11+
- Node.js 18+

### Step 1 — Environment setup
```bash
cd "graphlm-fastapi"
cp .env.sample .env
# Fill in: OPENAI_API_KEY, MEM0_API_KEY, ACCESS_TOKEN_SECRET,
#          REFRESH_TOKEN_SECRET, NEO4J_PASSWORD
# NEO4J_PASSWORD must match docker-compose.yml: reform-william-center-vibrate-press-5829
```

### Step 2 — Start infrastructure
```bash
docker compose up -d
docker compose ps   # verify all 3 services are Up
```

### Step 3 — Python environment
```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Step 4 — Database migrations
```bash
alembic upgrade head
```

### Step 5 — Start backend
```bash
uvicorn app.main:app --host 127.0.0.1 --port 4000 --reload
# Swagger UI: http://localhost:4000/docs
```

### Step 6 — Start frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

### Service URLs
| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Swagger Docs | http://localhost:4000/docs |
| Qdrant Dashboard | http://localhost:6333/dashboard |
| Neo4j Browser | http://localhost:7474 |

---

## 15. Key Design Decisions

### DB session closed before LLM inference
The SQLAlchemy DB session is opened, used to resolve sources and build the context window, then **explicitly closed** before the agent is invoked. LLM calls can take 5–30 seconds; holding a DB connection open during that time would exhaust the connection pool under load.

### Two-phase indexing (vector first, then graph)
Vector indexing is blocking (via `asyncio.to_thread`) and must complete before the source is usable for chat. Graph indexing is always async and non-fatal — if Neo4j fails, the user can still chat using vector search alone. This design avoids making graph (which is much slower and more error-prone) a blocker for the user.

### Sources are immutable once a session starts chatting
Sources can only be attached or detached from a session if the message count is zero. This prevents mid-conversation RAG context changes that would make the conversation incoherent.

### Agent-only memory writes
No code outside the agent tools calls `mem0.add()`. This single-writer rule prevents duplicate memory entries and ensures the agent retains full control over what is worth remembering.

### Subgraph mode source scoping
When the user selects specific sources in the Canvas panel, the `subgraph_query` tool is restricted to the intersection of graph-indexed source IDs and user-selected IDs. Other tools (`vector_search`, `graph_search`) always use all session sources — only the graph visualization panel is scoped.

### PG LISTEN/NOTIFY for indexing status
Rather than polling a REST endpoint for indexing progress, the backend uses PostgreSQL triggers + `asyncpg` LISTEN/NOTIFY to push real-time status updates to the frontend over SSE. The two-condition state machine (both `status=indexed` AND `graph_resolved`) prevents the SSE stream from closing before the graph indexing notification arrives.

### Context compaction is never synchronous
Even when the token budget threshold is exceeded, compaction is only **marked** for background execution — never run inline in the request path. The agent always runs immediately against the current (possibly over-budget) window. This keeps chat latency predictable.
