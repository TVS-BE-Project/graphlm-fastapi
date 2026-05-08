"""
Session Context Service — infrastructure layer for context lifecycle management.

Separated from the request-path manager.py to keep /message route fast.

Provides:
  - get_context_state()           Debug/observability of session context
  - evaluate_compaction()         Check if compaction is needed, mark if so
  - compact_session_context()     Background compaction workflow
  - get_context_summary()         Return summary + metadata
  - rebuild_session_context()     Recovery: rebuild context state from transcript

Reuses existing services:
  - budgeting.py (token estimation, budget calculations)
  - summarizer.py (LLM summarization)
  - session_repo (DB queries)
  - state.py (windowed message loading)
"""

from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session as DBSession

from app.core.config import settings
from app.repositories import session_repo
from app.models.chat_message import ChatMessage, MessageRole

from .budgeting import (
    estimate_tokens,
    get_available_context_budget,
    count_tokens,
    count_messages_tokens,
)
from .summarizer import compact_and_merge_summary
from .state import load_older_messages_for_compaction


# ─────────────────────────────────────────────────────────────────────────
# Context State (Debug/Observability)
# ─────────────────────────────────────────────────────────────────────────

async def get_context_state(
    session_id: UUID,
    db: DBSession,
) -> dict:
    """
    Return context metadata for debug/observability.

    Returns:
        Dict with context state including token usage, compaction state,
        threshold, window size, etc.
    """
    session = session_repo.get_session_by_id(db, session_id)
    if not session:
        return {"error": "session_not_found"}

    available_budget = get_available_context_budget()
    usage_pct = (
        session.estimated_token_usage / max(available_budget, 1) * 100
    )

    return {
        "session_id": str(session_id),
        "estimated_token_usage": session.estimated_token_usage,
        "available_budget": available_budget,
        "usage_percent": round(usage_pct, 2),
        "compaction_threshold": session.compaction_threshold,
        "needs_compaction": session.needs_compaction,
        "has_summary": session.rolling_summary is not None,
        "recent_window_size": session.recent_window_size,
        "last_compacted_at": (
            session.last_compacted_at.isoformat()
            if session.last_compacted_at else None
        ),
        "last_compacted_message_id": (
            str(session.last_compacted_message_id)
            if session.last_compacted_message_id else None
        ),
    }


# ─────────────────────────────────────────────────────────────────────────
# Compaction Evaluation
# ─────────────────────────────────────────────────────────────────────────

async def evaluate_compaction(
    session_id: UUID,
    db: DBSession,
) -> dict:
    """
    Evaluate whether compaction is needed for a session.

    Loads recent messages, estimates tokens, compares against threshold.
    If exceeded, marks session.needs_compaction = True.

    Reuses budgeting.py for token estimation.

    Returns:
        Dict with evaluation result
    """
    session = session_repo.get_session_by_id(db, session_id)
    if not session:
        return {"error": "session_not_found"}

    # Load recent messages (windowed)
    recent_messages_db = session_repo.get_recent_messages_windowed(
        db=db,
        session_id=session_id,
        last_compacted_message_id=session.last_compacted_message_id,
        window_size=session.recent_window_size,
    )

    recent_msgs = [
        {"role": msg.role.value, "content": msg.content}
        for msg in recent_messages_db
    ]

    # Estimate tokens
    token_estimate = estimate_tokens(
        summary=session.rolling_summary,
        recent_messages=recent_msgs,
    )

    available = token_estimate["available"]
    total = token_estimate["total"]
    threshold = session.compaction_threshold
    usage_ratio = total / max(available, 1)
    needs_compaction = usage_ratio >= threshold

    # Update session state
    update_fields = {
        "estimated_token_usage": total,
    }
    if needs_compaction:
        update_fields["needs_compaction"] = True

    session_repo.update_session_context_state(
        db=db,
        session_id=session_id,
        **update_fields,
    )

    return {
        "session_id": str(session_id),
        "estimated_tokens": total,
        "available_budget": available,
        "usage_ratio": round(usage_ratio, 4),
        "threshold": threshold,
        "needs_compaction": needs_compaction,
        "recent_message_count": len(recent_msgs),
        "summary_tokens": token_estimate["summary_tokens"],
        "recent_tokens": token_estimate["recent_tokens"],
    }


# ─────────────────────────────────────────────────────────────────────────
# Background Compaction Workflow
# ─────────────────────────────────────────────────────────────────────────

async def compact_session_context(
    session_id: UUID,
    db: DBSession,
) -> dict:
    """
    Compact session context: summarize old messages, update rolling summary.

    Workflow:
      1. Load all messages in the recent window
      2. Determine compaction boundary (keep recent N, compact the rest)
      3. Load messages to compact
      4. Generate/update rolling summary via summarizer.py
      5. Update ChatSession metadata
      6. Recent messages remain untouched

    Reuses:
      - summarizer.py for LLM summarization
      - budgeting.py for token estimation
      - session_repo for DB operations

    Returns:
        Dict with compaction result
    """
    session = session_repo.get_session_by_id(db, session_id)
    if not session:
        return {"error": "session_not_found", "compacted": False}

    # ── Step 1: Determine boundary ──────────────────────────────────────
    # Get ALL user/assistant messages (only during compaction, not request path)
    all_messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.chat_id == session_id,
            ChatMessage.role.in_([MessageRole.user, MessageRole.assistant]),
        )
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    if len(all_messages) <= session.recent_window_size:
        # Not enough messages to compact
        session_repo.update_session_context_state(
            db=db,
            session_id=session_id,
            needs_compaction=False,
        )
        return {
            "session_id": str(session_id),
            "compacted": False,
            "reason": "not_enough_messages",
            "total_messages": len(all_messages),
            "window_size": session.recent_window_size,
        }

    # Keep recent N, compact everything before
    keep_recent = session.recent_window_size
    compact_boundary_msg = all_messages[-(keep_recent)]  # First message in recent window
    messages_to_compact = all_messages[:-(keep_recent)]

    if not messages_to_compact:
        session_repo.update_session_context_state(
            db=db,
            session_id=session_id,
            needs_compaction=False,
        )
        return {
            "session_id": str(session_id),
            "compacted": False,
            "reason": "no_messages_to_compact",
        }

    # ── Step 2: Build message dicts for summarizer ──────────────────────
    # Only compact messages NOT already covered by existing summary
    if session.last_compacted_message_id:
        # Find incremental messages (between old boundary and new boundary)
        old_boundary_time = None
        for msg in all_messages:
            if msg.id == session.last_compacted_message_id:
                old_boundary_time = msg.created_at
                break

        if old_boundary_time:
            messages_to_compact = [
                msg for msg in messages_to_compact
                if msg.created_at > old_boundary_time
            ]

    if not messages_to_compact:
        session_repo.update_session_context_state(
            db=db,
            session_id=session_id,
            needs_compaction=False,
        )
        return {
            "session_id": str(session_id),
            "compacted": False,
            "reason": "no_new_messages_to_compact",
        }

    older_msgs_dicts = [
        {"role": msg.role.value, "content": msg.content}
        for msg in messages_to_compact
    ]

    # ── Step 3: Generate new summary (reuse summarizer.py) ──────────────
    new_summary = await compact_and_merge_summary(
        session_id=session_id,
        older_messages=older_msgs_dicts,
        previous_summary=session.rolling_summary,
        db=db,
    )

    # ── Step 4: Re-estimate tokens after compaction ─────────────────────
    recent_msgs = [
        {"role": msg.role.value, "content": msg.content}
        for msg in all_messages[-(keep_recent):]
    ]

    new_token_estimate = estimate_tokens(
        summary=new_summary,
        recent_messages=recent_msgs,
    )

    # ── Step 5: Boundary message = last message BEFORE the recent window
    # This is the last message that was compacted
    boundary_msg = messages_to_compact[-1]

    # ── Step 6: Update ChatSession metadata ─────────────────────────────
    session_repo.update_session_context_state(
        db=db,
        session_id=session_id,
        rolling_summary=new_summary,
        last_compacted_message_id=boundary_msg.id,
        last_compacted_at=datetime.utcnow(),
        needs_compaction=False,
        estimated_token_usage=new_token_estimate["total"],
    )

    print(
        f"[Compaction] session={session_id} | "
        f"compacted={len(messages_to_compact)} msgs | "
        f"summary_tokens={new_token_estimate['summary_tokens']} | "
        f"total_tokens={new_token_estimate['total']}/{new_token_estimate['available']} | "
        f"headroom={new_token_estimate['headroom']}"
    )

    return {
        "session_id": str(session_id),
        "compacted": True,
        "messages_compacted": len(messages_to_compact),
        "summary_tokens": new_token_estimate["summary_tokens"],
        "recent_tokens": new_token_estimate["recent_tokens"],
        "total_tokens": new_token_estimate["total"],
        "available_budget": new_token_estimate["available"],
        "headroom": new_token_estimate["headroom"],
    }


# ─────────────────────────────────────────────────────────────────────────
# Context Summary (Debug)
# ─────────────────────────────────────────────────────────────────────────

async def get_context_summary(
    session_id: UUID,
    db: DBSession,
) -> dict:
    """
    Return the rolling summary and its metadata.

    Returns:
        Dict with summary text, token count, and metadata
    """
    session = session_repo.get_session_by_id(db, session_id)
    if not session:
        return {"error": "session_not_found"}

    summary_tokens = count_tokens(session.rolling_summary) if session.rolling_summary else 0

    return {
        "session_id": str(session_id),
        "rolling_summary": session.rolling_summary,
        "summary_tokens": summary_tokens,
        "last_compacted_at": (
            session.last_compacted_at.isoformat()
            if session.last_compacted_at else None
        ),
        "last_compacted_message_id": (
            str(session.last_compacted_message_id)
            if session.last_compacted_message_id else None
        ),
    }


# ─────────────────────────────────────────────────────────────────────────
# Context Rebuild (Recovery/Admin)
# ─────────────────────────────────────────────────────────────────────────

async def rebuild_session_context(
    session_id: UUID,
    db: DBSession,
) -> dict:
    """
    Rebuild session context state from transcript.

    Recovery/admin route — NOT used during normal operation.
    Useful if session metadata becomes corrupted or inconsistent.

    Workflow:
      1. Load all messages from transcript
      2. Reset context state
      3. Re-estimate tokens
      4. Optionally trigger compaction if needed

    Returns:
        Dict with rebuild result
    """
    session = session_repo.get_session_by_id(db, session_id)
    if not session:
        return {"error": "session_not_found"}

    # Count all user/assistant messages
    all_messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.chat_id == session_id,
            ChatMessage.role.in_([MessageRole.user, MessageRole.assistant]),
        )
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    total_count = len(all_messages)

    # Reset context state
    session_repo.update_session_context_state(
        db=db,
        session_id=session_id,
        rolling_summary=None,
        last_compacted_message_id=None,
        needs_compaction=False,
        last_compacted_at=None,
        estimated_token_usage=0,
    )

    # Re-estimate current token usage with all messages as recent
    recent_msgs = [
        {"role": msg.role.value, "content": msg.content}
        for msg in all_messages[-session.recent_window_size:]
    ]

    token_estimate = estimate_tokens(
        summary=None,
        recent_messages=recent_msgs,
    )

    needs_compaction = total_count > session.recent_window_size

    session_repo.update_session_context_state(
        db=db,
        session_id=session_id,
        estimated_token_usage=token_estimate["total"],
        needs_compaction=needs_compaction,
    )

    return {
        "session_id": str(session_id),
        "rebuilt": True,
        "total_messages": total_count,
        "estimated_tokens": token_estimate["total"],
        "needs_compaction": needs_compaction,
        "summary_cleared": True,
    }
