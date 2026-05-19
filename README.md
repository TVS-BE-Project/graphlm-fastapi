# GraphLM

**GraphLM** is a full-stack AI research assistant that connects your documents and repositories into a dual knowledge store. By leveraging both a **vector database** (Qdrant) for semantic search and a **knowledge graph** (Neo4j) for entity traversal, GraphLM enables real-time, context-aware AI chat over your data.

This project was developed as a BE (Bachelor of Engineering) Final Exam project, Semester 8, AISSMS IOIT.

---

## 🌟 Key Features

- **Dual RAG Architecture**: Retrieves from both a Vector Database (Qdrant) and a Knowledge Graph (Neo4j) for precise answers.
- **Multi-Format Ingestion**: Upload PDF, DOCX, TXT, MD files or connect GitHub repositories directly.
- **Interactive Knowledge Graph**: Visualise relationships between entities extracted from your documents in real time using the built-in Studio panel.
- **Smart Context Management**: Automatically compacts older conversation history into rolling summaries to prevent LLM context limits from being exceeded.
- **Real-Time Streaming**: Uses Server-Sent Events (SSE) for both live AI response streaming and real-time document indexing status updates.
- **Long-Term Memory**: Integrates Mem0 cloud API to remember user facts across sessions.
- **OAuth Integration**: Sign in or ingest private repositories securely with GitHub.

---

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.13) + Uvicorn
- **Database**: PostgreSQL (SQLAlchemy + asyncpg + Alembic)
- **AI & Retrieval**: LangChain, OpenAI Agents SDK, `LLMGraphTransformer`
- **Infrastructure**: Qdrant (Vector DB), Neo4j (Graph DB), Mem0 (Memory), Cloudinary (File storage)
- **Real-Time**: PostgreSQL LISTEN/NOTIFY via asyncpg for indexing status over SSE

### Frontend
- **Framework**: React 19 + Vite 7
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand 5
- **Graph Visualization**: `vis-network`
- **Markdown & Code**: `react-markdown` + `remark-gfm`

---

## 🚀 Getting Started

### Prerequisites
- Docker Desktop
- Python 3.11+
- Node.js 18+

### Step 1: Clone and Configure
Clone the repository and set up your environment variables:
```bash
git clone <repository-url> graphlm-fastapi
cd graphlm-fastapi
cp .env.sample .env
```
Fill in your API keys in the `.env` file (`OPENAI_API_KEY`, `MEM0_API_KEY`, `CLOUDINARY_API_KEY`, etc.). Make sure your `NEO4J_PASSWORD` matches the one in the `docker-compose.yml`.

### Step 2: Start Infrastructure
Spin up PostgreSQL, Neo4j, and Qdrant using Docker Compose:
```bash
docker compose up -d
```

### Step 3: Setup the Backend
Create a virtual environment, install dependencies, and run migrations:
```bash
python -m venv .venv
source .venv/bin/activate        # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
```

Start the FastAPI server:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 4000 --reload
```
The backend API will be available at `http://localhost:4000` (Swagger docs at `/docs`).

### Step 4: Setup the Frontend
Open a new terminal window, install dependencies, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
The React application will be available at `http://localhost:5173`.

---

## 🏗 Architecture Overview

GraphLM utilizes an event-driven, decoupled indexing pipeline.

1. **Ingestion**: Documents and Repos are parsed and chunked via LangChain.
2. **Phase 1 (Vector Indexing)**: Chunks are embedded (`text-embedding-3-small`) and stored in Qdrant. This phase is blocking; once complete, the user can start chatting immediately.
3. **Phase 2 (Graph Indexing)**: Chunks are processed by `LLMGraphTransformer` to extract entities/relationships and pushed to Neo4j. This runs entirely in the background as a non-fatal process.

The AI Agent dynamically queries these stores based on the user's intent, using semantic search, explicit Neo4j entity lookups, or full subgraph visualisations for the frontend canvas.

## 📚 Documentation

For a deep dive into the system architecture, database schema, and pipeline designs, see the **[Knowledge Transfer Document (`docs/kt.md`)](./docs/kt.md)**.