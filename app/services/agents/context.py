import asyncio
import openai
import tiktoken
from uuid import UUID

from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    VectorParams,
    Filter,
    FieldCondition,
    MatchValue,
)
from sqlalchemy.orm import Session as DBSession

from app.core.config import settings
from app.models.chat_message import ChatMessage, MessageRole


"""
Claude-style context window builder for the RAG agent.

Three-layer context window (assembled in this order):
  [summary]           ← compressed history of older messages (if exists)
  [semantic_messages] ← older messages relevant to current query (Qdrant)
  [recent_messages]   ← last KEEP_RECENT messages verbatim (always included)

Flow per request:
  1. Fetch ALL messages from DB for this session
  2. Fetch existing summary (if any) from DB
  3. Split: older_messages = all[:-KEEP_RECENT], recent = all[-KEEP_RECENT:]
  4. Estimate total tokens: summary + recent + system_prompt_budget
  5. If total > AVAILABLE_CONTEXT → summarize(older_messages), persist/update
  6. Semantic search older messages in Qdrant (session-filtered, budget-capped)
  7. Assemble: [summary] + [semantic] + [recent]

Qdrant — shared collection:
  All session messages share ONE collection: "chat_messages"
  Every point carries `chat_id` in payload for session-scoped filtering.
  This avoids Qdrant collection-per-session proliferation.

Token budgeting — dynamic from settings:
  MAX_CONTEXT          = MODEL_MAX_TOKENS * CONTEXT_SAFE_RATIO
  AVAILABLE_CONTEXT    = MAX_CONTEXT - RESERVED_FOR_RAG - RESERVED_FOR_RESPONSE
  Summarization fires when: summary_tokens + recent_tokens + system_budget > AVAILABLE_CONTEXT

Summarization:
  Only older_messages are summarized — recent_messages are NEVER touched.
  Summary is stored as a ChatMessage (role=system, content="[SUMMARY]...")
  On subsequent requests the existing summary is fetched instead of re-generating.
  When new summarization is needed, the OLD summary is updated in-place (no duplicates).
"""


# ─────────────────────────────────────────────────────────────────────────
# Shared Qdrant collection for all session message history
# ─────────────────────────────────────────────────────────────────────────

CHAT_MESSAGES_COLLECTION = "chat_messages"

# Budget reserved for the system prompt (tool descriptions + session context block)
# This is NOT configurable per-request — it's a fixed overhead estimate.
_SYSTEM_PROMPT_BUDGET = 1_000


# ─────────────────────────────────────────────────────────────────────────
# Clients (module-level singletons)
# ─────────────────────────────────────────────────────────────────────────

_qdrant = QdrantClient(
    url=settings.QDRANT_URL,
    # api_key=settings.QDRANT_API_KEY,
)

_embeddings = OpenAIEmbeddings(
    model=settings.OPENAI_EMBEDDING_MODEL,
    openai_api_key=settings.OPENAI_API_KEY,
)

_openai = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

_tokenizer = tiktoken.get_encoding("cl100k_base")


# ─────────────────────────────────────────────────────────────────────────
# Dynamic token budget (derived from settings — no hardcoded values)
# ─────────────────────────────────────────────────────────────────────────

def _get_available_context() -> int:
    """
    Compute available token budget for context window at call time.
    Reading from settings means changes to env vars take effect on restart
    without code changes.
    """
    max_context = int(settings.MODEL_MAX_TOKENS * settings.CONTEXT_SAFE_RATIO)
    return (
        max_context
        - settings.CONTEXT_RESERVED_FOR_RAG
        - settings.CONTEXT_RESERVED_FOR_RESPONSE
    )


# ─────────────────────────────────────────────────────────────────────────
# Token counting
# ─────────────────────────────────────────────────────────────────────────

def _count_tokens(text: str) -> int:
    """Accurate token count via tiktoken (cl100k_base — works for all OpenAI models)."""
    return len(_tokenizer.encode(text))


def _count_messages_tokens(messages: list[dict]) -> int:
    """
    Sum token count across all messages.
    Adds 4 tokens per message for OpenAI role/content separator overhead.
    """
    total = 0
    for m in messages:
        total += _count_tokens(m.get("role", ""))
        total += _count_tokens(m.get("content", ""))
        total += 4  # per-message overhead
    return total


# ─────────────────────────────────────────────────────────────────────────
# Qdrant collection management
# ─────────────────────────────────────────────────────────────────────────

def _ensure_collection() -> None:
    """
    Create the shared chat_messages Qdrant collection if it doesn't exist.
    text-embedding-3-small produces 1536-dimensional vectors.
    Called once per embed_message call — idempotent.
    """
    existing = [c.name for c in _qdrant.get_collections().collections]
    if CHAT_MESSAGES_COLLECTION not in existing:
        _qdrant.create_collection(
            collection_name=CHAT_MESSAGES_COLLECTION,
            vectors_config=VectorParams(
                size=1536,
                distance=Distance.COSINE,
            ),
        )


# ─────────────────────────────────────────────────────────────────────────
# Message embedding — called as background task after each turn
# ─────────────────────────────────────────────────────────────────────────

async def embed_message(
    session_id: str,
    message_id: str,
    role: str,
    content: str,
) -> None:
    """
    Embed a single message into the shared chat_messages Qdrant collection.

    Uses message_id as the Qdrant point ID (deterministic → idempotent re-runs).
    Payload carries chat_id for session-scoped filtering on retrieval.

    Short messages (below MIN_EMBED_CHARS) are skipped — they carry no
    semantic signal worth retrieving ("ok", "thanks", etc.)

    Non-fatal: failures are logged, the message remains in PostgreSQL.
    DO NOT pass a DB session here — this runs as a FastAPI BackgroundTask
    that outlives the request. It creates no DB writes (is_embedded flag
    was removed from the model patch to avoid a stale-session write).

    Args:
        session_id:  UUID string of the chat session (used as chat_id payload)
        message_id:  UUID string of the ChatMessage record (used as Qdrant point ID)
        role:        "user" or "assistant"
        content:     The message text to embed
    """
    if len(content) < settings.MIN_EMBED_CHARS:
        return  # too short to be semantically useful

    try:
        _ensure_collection()

        doc = Document(
            page_content=content,
            metadata={
                "message_id": message_id,
                "chat_id":    session_id,   # ← session filter key
                "role":       role,
                "content":    content,      # stored for reconstruction on retrieval
            },
        )

        vector_store = QdrantVectorStore(
            client=_qdrant,
            collection_name=CHAT_MESSAGES_COLLECTION,
            embedding=_embeddings,
        )

        await asyncio.to_thread(
            vector_store.add_documents,
            [doc],
            ids=[message_id],  # deterministic ID → no duplicate points on retry
        )

    except Exception as e:
        print(f"[Context] embed_message failed for {message_id}: {e}")
        # Non-fatal — PostgreSQL is source of truth, Qdrant is search index only


# ─────────────────────────────────────────────────────────────────────────
# Summarization
# ─────────────────────────────────────────────────────────────────────────

async def _call_summarizer(messages: list[dict]) -> str:
    """
    Call OpenAI to produce a compact bullet-point summary of a message list.
    Returns text prefixed with [SUMMARY] for easy identification in DB queries.
    """
    conversation_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in messages
    )

    response = await _openai.chat.completions.create(
        model=settings.OPENAI_LLM_MODEL,
        max_tokens=600,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a conversation summarizer. "
                    "Summarize the conversation below into a concise bullet-point list "
                    "of key facts, decisions, preferences, and topics. "
                    "Preserve all technical details, entity names, and specifics. "
                    "Output only the bullet list — no preamble."
                ),
            },
            {
                "role": "user",
                "content": f"Conversation to summarize:\n\n{conversation_text}",
            },
        ],
    )

    return "[SUMMARY]\n" + response.choices[0].message.content


async def _get_or_update_summary(
    session_id: UUID,
    older_messages: list[dict],
    db: DBSession,
) -> str:
    """
    Fetch an existing summary for this session, or create and persist one.

    Summary is stored as a ChatMessage with role=system so it:
      - is excluded from normal message queries (which filter role IN [user, assistant])
      - is easily retrievable with a targeted role=system query
      - never appears in the user-facing chat history

    If a summary already exists it is UPDATED in-place (no new row) to avoid
    accumulating duplicate summaries over a long conversation.

    Args:
        session_id:      Chat session UUID
        older_messages:  The older_messages slice to summarize
        db:              SQLAlchemy session

    Returns:
        Summary text string (prefixed with [SUMMARY])
    """
    existing = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.chat_id == session_id,
            ChatMessage.role == MessageRole.system,
            ChatMessage.content.like("[SUMMARY]%"),
        )
        .order_by(ChatMessage.created_at.desc())
        .first()
    )

    summary_text = await _call_summarizer(older_messages)

    if existing:
        # Update in-place → no duplicate summary rows
        existing.content = summary_text
        db.commit()
    else:
        # First time — create the summary record
        db.add(ChatMessage(
            chat_id=session_id,
            role=MessageRole.system,
            content=summary_text,
        ))
        db.commit()

    return summary_text


# ─────────────────────────────────────────────────────────────────────────
# Semantic retrieval from Qdrant
# ─────────────────────────────────────────────────────────────────────────

async def _semantic_search(
    session_id_str: str,
    query: str,
    exclude_ids: set[str],
    token_budget: int,
) -> list[dict]:
    """
    Search the shared Qdrant collection for messages semantically related
    to the current query, scoped to this session.

    Ranking: results come back ordered by Qdrant score (descending).
    No score threshold — we trust ranking + token budget cap instead.
    A low-score result that fits the budget is better than nothing.

    Args:
        session_id_str: Used in the Qdrant payload filter (chat_id field)
        query:          The current user message text (query vector source)
        exclude_ids:    message_ids already in the recent window (skip these)
        token_budget:   Max tokens to spend on semantic results

    Returns:
        List of {role, content} dicts in order of descending relevance,
        capped to token_budget.
    """
    try:
        # Embed the query vector
        query_vector = await asyncio.to_thread(
            _embeddings.embed_query,
            query,
        )

        # Session-scoped filter — MUST match chat_id in point payload
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="chat_id",
                    match=MatchValue(value=session_id_str),
                )
            ]
        )

        # Raw Qdrant search (not via LangChain wrapper) so we get the filter param
        results = await asyncio.to_thread(
            _qdrant.search,
            collection_name=CHAT_MESSAGES_COLLECTION,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=settings.SEMANTIC_TOP_K,
            with_payload=True,
        )

        semantic_msgs: list[dict] = []
        tokens_used = 0

        for point in results:
            payload    = point.payload or {}
            message_id = payload.get("message_id", "")
            content    = payload.get("content", "")
            role       = payload.get("role", "user")

            if not content or message_id in exclude_ids:
                continue

            msg_tokens = _count_tokens(content) + 4  # +4 overhead

            if tokens_used + msg_tokens > token_budget:
                break  # budget exhausted — stop (results are ranked, best come first)

            semantic_msgs.append({
                "role":    role,
                "content": f"[Related earlier context]\n{content}",
            })
            exclude_ids.add(message_id)
            tokens_used += msg_tokens

        return semantic_msgs

    except Exception as e:
        print(f"[Context] Semantic search failed, skipping: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────
# Main: build_context_window
# ─────────────────────────────────────────────────────────────────────────

async def build_context_window(
    session_id: UUID,
    current_user_message: str,
    db: DBSession,
) -> list[dict]:
    """
    Build the full context window for the agent.

    Returns [{role, content}, ...] in chronological order, ready to pass
    directly to the OpenAI Agents SDK Runner.

    Final structure (top → bottom = oldest → newest context):
    ┌─────────────────────────────────────────────────────────────────┐
    │  {"role": "system", "content": "[SUMMARY]..."}  (if exists)    │
    │  {"role": ..., "content": "[Related earlier context]\n..."}     │
    │   ... more semantic results ...                                  │
    │  {"role": "user",      "content": "..."}  ← recent verbatim    │
    │  {"role": "assistant", "content": "..."}                        │
    │   ... last KEEP_RECENT messages ...                              │
    └─────────────────────────────────────────────────────────────────┘

    Args:
        session_id:           Chat session UUID
        current_user_message: The user's current message (used as semantic query)
        db:                   SQLAlchemy session

    Returns:
        List of message dicts for the agent
    """
    session_id_str   = str(session_id)
    available_budget = _get_available_context()

    # ── Step 1: Fetch ALL real messages from DB ───────────────────────────
    # Exclude system-role summary records — those are fetched separately.
    all_messages_db = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.chat_id == session_id,
            ChatMessage.role.in_([MessageRole.user, MessageRole.assistant]),
        )
        .order_by(ChatMessage.created_at.asc())  # chronological
        .all()
    )

    # ── Step 2: Fetch existing summary (if any) ───────────────────────────
    existing_summary_record = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.chat_id == session_id,
            ChatMessage.role == MessageRole.system,
            ChatMessage.content.like("[SUMMARY]%"),
        )
        .order_by(ChatMessage.created_at.desc())
        .first()
    )

    existing_summary_text: str | None = (
        existing_summary_record.content if existing_summary_record else None
    )

    # ── Step 3: Split older / recent ─────────────────────────────────────
    keep_recent = settings.CONTEXT_KEEP_RECENT

    if len(all_messages_db) <= keep_recent:
        # Not enough messages to split — everything is "recent"
        older_messages_db = []
        recent_messages_db = all_messages_db
    else:
        older_messages_db  = all_messages_db[:-keep_recent]
        recent_messages_db = all_messages_db[-keep_recent:]

    recent_msgs = [
        {"role": msg.role.value, "content": msg.content}
        for msg in recent_messages_db
    ]

    older_msgs = [
        {"role": msg.role.value, "content": msg.content}
        for msg in older_messages_db
    ]

    # ── Step 4: Token estimation ──────────────────────────────────────────
    recent_tokens  = _count_messages_tokens(recent_msgs)
    summary_tokens = _count_tokens(existing_summary_text) if existing_summary_text else 0
    # System prompt overhead is not passed here but reserved in AVAILABLE_CONTEXT already
    total_estimated = summary_tokens + recent_tokens + _SYSTEM_PROMPT_BUDGET

    # ── Step 5: Summarize older messages if over budget ───────────────────
    summary_msg: dict | None = None

    if older_msgs:
        if total_estimated > available_budget:
            # Budget exceeded — (re)generate summary from older_messages
            # recent_messages are NEVER touched or summarized
            summary_text = await _get_or_update_summary(session_id, older_msgs, db)
            summary_msg  = {"role": "system", "content": summary_text}
        elif existing_summary_text:
            # Budget is fine but a summary exists from a previous turn — keep using it
            # (summary already covers what older_msgs contains)
            summary_msg = {"role": "system", "content": existing_summary_text}

    # ── Step 6: Semantic retrieval from Qdrant ────────────────────────────
    # Budget available for semantic results = total available minus what recent+summary consume
    current_summary_tokens = (
        _count_tokens(summary_msg["content"]) if summary_msg else 0
    )
    semantic_budget = available_budget - recent_tokens - current_summary_tokens - _SYSTEM_PROMPT_BUDGET

    # IDs already committed to recent window — skip these in semantic results
    recent_ids = {str(msg.id) for msg in recent_messages_db}

    semantic_msgs: list[dict] = []
    if semantic_budget > 0 and older_messages_db:
        semantic_msgs = await _semantic_search(
            session_id_str=session_id_str,
            query=current_user_message,
            exclude_ids=recent_ids,
            token_budget=semantic_budget,
        )

    # ── Step 7: Assemble final context window ─────────────────────────────
    final_context: list[dict] = []

    if summary_msg:
        final_context.append(summary_msg)

    final_context.extend(semantic_msgs)
    final_context.extend(recent_msgs)

    # ── Logging ───────────────────────────────────────────────────────────
    total_tokens = _count_messages_tokens(final_context)
    print(
        f"[Context] session={session_id_str} | "
        f"messages={len(final_context)} | "
        f"tokens≈{total_tokens} / {available_budget} | "
        f"recent={len(recent_msgs)} | "
        f"semantic={len(semantic_msgs)} | "
        f"summary={'updated' if older_msgs and total_estimated > available_budget else 'reused' if summary_msg else 'none'}"
    )

    return final_context