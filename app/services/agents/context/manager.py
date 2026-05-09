"""
Pipeline manager: orchestrates the rolling conversation runtime.

Main entry point: build_context_window()

Pipeline stages:
  1. Load state (summary + recent messages from ChatSession + windowed query)
  2. Estimate token budget
  3. Mark for background compaction if threshold exceeded (NO synchronous wait)
  4. Assemble final context
  5. Return to agent

Key architectural change:
  Compaction is NEVER synchronous in the request path.
  If threshold is exceeded, the session is MARKED for compaction
  and background compaction is scheduled. Agent runs immediately.
"""

from uuid import UUID
from sqlalchemy.orm import Session as DBSession

from app.utils.logger import logger
from app.core.config import settings
from app.repositories import session_repo

# Pipeline components
from .events import PipelineEventType, emit_pipeline_event
from .state import ConversationState
from .budgeting import estimate_tokens, should_compact
from .assembler import assemble_context_window
from .optional_retrieval import retrieve_semantic_messages


async def build_context_window(
    session_id: UUID,
    current_user_message: str,
    db: DBSession,
) -> list[dict]:
    """
    Build context window for the agent (rolling conversation runtime).

    Implements the lightweight request-path architecture:
      - Load session context state (windowed, O(recent_window_size))
      - Estimate token budget
      - Mark for background compaction if needed (NO WAIT)
      - Assemble final context
      - Return to agent

    Key behaviors:
      - Summary is loaded from ChatSession (not ChatMessage)
      - Recent messages are windowed (not full transcript)
      - Compaction is NEVER synchronous
      - Semantic search is optional (disabled by default)

    Args:
        session_id: Chat session UUID
        current_user_message: User's current message (used for semantic query)
        db: SQLAlchemy session

    Returns:
        Final context list: [{role, content}, ...]
        Ready to pass directly to the agent runner

    Raises:
        Exception: On unrecoverable failures (will be caught upstream)
    """
    session_id_str = str(session_id)

    # ──────────────────────────────────────────────────────────────────
    # Stage 1: Load state (windowed — O(recent_window_size))
    # ──────────────────────────────────────────────────────────────────
    await emit_pipeline_event(PipelineEventType.LOADING_STATE, session_id_str)

    state = await ConversationState.load_from_db(session_id, db)

    # ──────────────────────────────────────────────────────────────────
    # Stage 2: Estimate budget
    # ──────────────────────────────────────────────────────────────────
    await emit_pipeline_event(PipelineEventType.ESTIMATING_BUDGET, session_id_str)

    token_estimate = estimate_tokens(
        state.rolling_summary,
        state.recent_messages,
    )

    state.token_usage = token_estimate

    # Update estimated token usage on session
    session_repo.update_session_context_state(
        db=db,
        session_id=session_id,
        estimated_token_usage=token_estimate["total"],
    )

    # ──────────────────────────────────────────────────────────────────
    # Stage 3: Mark for background compaction if needed (NO WAIT)
    # ──────────────────────────────────────────────────────────────────
    if should_compact(token_estimate):
        await emit_pipeline_event(
            PipelineEventType.COMPACTING_CONTEXT,
            session_id_str,
            {"action": "marked_for_background_compaction"}
        )

        # Mark session for background compaction — do NOT wait
        session_repo.update_session_context_state(
            db=db,
            session_id=session_id,
            needs_compaction=True,
        )
        state.needs_compaction = True

        logger.info(
            f"[ContextManager] session={session_id_str} | "
            f"MARKED for background compaction | "
            f"tokens={token_estimate['total']}/{token_estimate['available']} | "
            f"usage={token_estimate['total']/max(token_estimate['available'],1)*100:.1f}%"
        )

    # ──────────────────────────────────────────────────────────────────
    # Stage 4: Optional semantic retrieval (disabled by default)
    # ──────────────────────────────────────────────────────────────────
    semantic_messages = []

    if getattr(settings, "ENABLE_SEMANTIC_CHAT_RETRIEVAL", False):
        semantic_budget = (
            token_estimate["available"]
            - token_estimate["recent_tokens"]
            - token_estimate["summary_tokens"]
            - token_estimate["system_budget"]
        )

        if semantic_budget > 0:
            # Exclude messages already in the recent window to avoid duplicates
            # Note: we don't have message IDs in the dict format, so we use
            # content-based dedup inside retrieve_semantic_messages instead
            semantic_messages = await retrieve_semantic_messages(
                session_id_str=session_id_str,
                query=current_user_message,
                exclude_ids=set(),
                token_budget=semantic_budget,
            )

    # ──────────────────────────────────────────────────────────────────
    # Stage 5: Assemble final context
    # ──────────────────────────────────────────────────────────────────
    await emit_pipeline_event(PipelineEventType.ASSEMBLING_CONTEXT, session_id_str)

    final_context = assemble_context_window(
        summary=state.rolling_summary,
        recent_messages=state.recent_messages,
        semantic_messages=semantic_messages if semantic_messages else None,
    )

    # ──────────────────────────────────────────────────────────────────
    # Decision logging
    # ──────────────────────────────────────────────────────────────────
    summary_status = (
        "needs_compaction" if state.needs_compaction
        else "active" if state.rolling_summary
        else "none"
    )

    logger.info(
        f"[ContextManager] session={session_id_str} | "
        f"msgs={len(final_context)} | "
        f"tokens≈{token_estimate['total']}/{token_estimate['available']} | "
        f"recent={len(state.recent_messages)} | "
        f"semantic={len(semantic_messages)} | "
        f"summary={summary_status} | "
        f"headroom={token_estimate['headroom']}"
    )

    return final_context
