"""
Semantic retrieval over chat messages.

DISABLED BY DEFAULT.

This module is kept separate because:
  1. For most conversations, rolling summary + recent messages is sufficient
  2. Qdrant semantic search adds latency and complexity
  3. Source RAG (documents/GitHub) is more valuable than chat-message semantics
  4. Long-term memory (Mem0) handles persistent patterns
  5. Simpler architecture is easier to reason about

To enable semantic chat retrieval:
  Set ENABLE_SEMANTIC_CHAT_RETRIEVAL=true in .env
  The manager will then call retrieve_semantic_messages() after state loading

Otherwise, the system runs with summary + recent only, which is fast and clean.

Architecture note (post-refactor):
  Recency re-ranking uses Qdrant payload timestamps instead of scanning
  older_messages_db. This is compatible with the session-owned context
  architecture where older messages are NOT loaded in the request path.
"""

import asyncio
from typing import Optional

from app.core.config import settings

# Conditional import: only if explicitly enabled
_semantic_enabled = getattr(settings, "ENABLE_SEMANTIC_CHAT_RETRIEVAL", False)

if _semantic_enabled:
    import tiktoken
    from qdrant_client import QdrantClient
    from qdrant_client.http.models import Filter, FieldCondition, MatchValue
    from langchain_openai import OpenAIEmbeddings

    _qdrant = QdrantClient(url=settings.QDRANT_URL)
    _embeddings = OpenAIEmbeddings(
        model=settings.OPENAI_EMBEDDING_MODEL,
        openai_api_key=settings.OPENAI_API_KEY,
    )
    _tokenizer = tiktoken.get_encoding("cl100k_base")
    CHAT_MESSAGES_COLLECTION = "chat_messages"

    def _count_tokens(text: str) -> int:
        return len(_tokenizer.encode(text))

    async def retrieve_semantic_messages(
        session_id_str: str,
        query: str,
        exclude_ids: set[str],
        token_budget: int,
    ) -> list[dict]:
        """
        Search the shared Qdrant collection for messages semantically related
        to the current query, scoped to this session.

        Compatible with session-owned context architecture:
          - Does NOT require older_messages_db (no full history scan)
          - Uses Qdrant similarity score directly for ranking
          - Excludes message IDs already in the recent window

        Args:
            session_id_str: Used in Qdrant payload filter (chat_id field)
            query: The current user message text (query vector source)
            exclude_ids: message_ids already in recent window (skip these)
            token_budget: Max tokens to spend on semantic results

        Returns:
            List of {role, content} dicts, ranked by similarity and budget-capped
        """
        try:
            # Embed query
            query_vector = await asyncio.to_thread(
                _embeddings.embed_query,
                query,
            )

            # Session-scoped filter
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="chat_id",
                        match=MatchValue(value=session_id_str),
                    )
                ]
            )

            # Raw Qdrant search
            results = await asyncio.to_thread(
                _qdrant.search,
                collection_name=CHAT_MESSAGES_COLLECTION,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=settings.SEMANTIC_TOP_K,
                with_payload=True,
            )

            # ── Rank by similarity, exclude recent window, cap budget ─────
            semantic_msgs: list[dict] = []
            tokens_used = 0

            for point in results:
                payload = point.payload or {}
                message_id = payload.get("message_id", "")
                content = payload.get("content", "")
                role = payload.get("role", "user")

                if not content or message_id in exclude_ids:
                    continue

                # Skip if content already substantially represented
                if any(content in m["content"] for m in semantic_msgs):
                    continue

                msg_tokens = _count_tokens(content) + 4

                if tokens_used + msg_tokens > token_budget:
                    break

                semantic_msgs.append({
                    "role": role,
                    "content": f"[Related earlier context]\n{content}",
                })
                exclude_ids.add(message_id)
                tokens_used += msg_tokens

            return semantic_msgs

        except Exception as e:
            print(f"[Retrieval] Semantic search failed, skipping: {e}")
            return []

else:
    # Semantic search disabled: stub out the function
    async def retrieve_semantic_messages(
        session_id_str: str,
        query: str,
        exclude_ids: set[str],
        token_budget: int,
    ) -> list[dict]:
        """Semantic search disabled — returns empty list."""
        return []
