"""
Conversation state management.

Represents the runtime state of a chat session:
  - rolling summary (loaded from ChatSession, NOT ChatMessage)
  - recent messages (windowed, O(window_size))
  - token usage (computed)
  - compaction markers

Key architectural change:
  Summary is stored on ChatSession (context control plane),
  NOT as a role=system ChatMessage row.
"""

from dataclasses import dataclass, field
from uuid import UUID
from sqlalchemy.orm import Session as DBSession

from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage, MessageRole
from app.repositories import session_repo


@dataclass
class ConversationState:
    """
    Runtime state for a conversation session.

    Persistent state (loaded from ChatSession):
      - rolling_summary: Compressed history of old messages
      - last_compacted_message_id: Boundary marker for compaction
      - needs_compaction: Whether session is marked for compaction
      - recent_window_size: How many recent messages to fetch
      - estimated_token_usage: Last known token estimate
      - compaction_threshold: Threshold ratio for triggering compaction

    Transient state (computed this request):
      - recent_messages: Current recent message window
      - token_usage: Token estimate breakdown
    """
    session_id: UUID

    # Persistent state (from ChatSession)
    rolling_summary: str | None = None
    last_compacted_message_id: UUID | None = None
    needs_compaction: bool = False
    recent_window_size: int = 20
    estimated_token_usage: int = 0
    compaction_threshold: float = 0.85

    # Transient state (computed this request)
    recent_messages: list[dict] = field(default_factory=list)
    token_usage: dict = field(default_factory=dict)

    @classmethod
    async def load_from_db(
        cls,
        session_id: UUID,
        db: DBSession,
    ) -> "ConversationState":
        """
        Load conversation state from database using windowed loading.

        Steps:
          1. Load ChatSession metadata (summary, compaction state)
          2. Fetch ONLY recent messages after compact boundary
          3. Return state object

        Complexity: O(recent_window_size) instead of O(full_history)

        Args:
            session_id: Chat session UUID
            db: SQLAlchemy session

        Returns:
            ConversationState instance
        """
        # ── Load session metadata ────────────────────────────────────────
        session = session_repo.get_session_by_id(db, session_id)

        rolling_summary = None
        last_compacted_message_id = None
        needs_compaction = False
        recent_window_size = 20
        estimated_token_usage = 0
        compaction_threshold = 0.85

        if session:
            rolling_summary = session.rolling_summary
            last_compacted_message_id = session.last_compacted_message_id
            needs_compaction = session.needs_compaction
            recent_window_size = session.recent_window_size
            estimated_token_usage = session.estimated_token_usage
            compaction_threshold = session.compaction_threshold

        # ── Fetch ONLY recent messages (windowed) ────────────────────────
        recent_messages_db = session_repo.get_recent_messages_windowed(
            db=db,
            session_id=session_id,
            last_compacted_message_id=last_compacted_message_id,
            window_size=recent_window_size,
        )

        # Convert to dict format for agent
        recent_msgs = [
            {"role": msg.role.value, "content": msg.content}
            for msg in recent_messages_db
        ]

        return cls(
            session_id=session_id,
            rolling_summary=rolling_summary,
            last_compacted_message_id=last_compacted_message_id,
            needs_compaction=needs_compaction,
            recent_window_size=recent_window_size,
            estimated_token_usage=estimated_token_usage,
            compaction_threshold=compaction_threshold,
            recent_messages=recent_msgs,
        )

    def update_summary(
        self,
        new_summary: str,
        db: DBSession,
        last_compacted_message_id: UUID | None = None,
    ) -> None:
        """
        Update the rolling summary on the ChatSession record.

        Writes to ChatSession (context control plane),
        NOT to a ChatMessage system row.

        Args:
            new_summary: The new summary text
            db: SQLAlchemy session
            last_compacted_message_id: Optional new boundary marker
        """
        from datetime import datetime

        update_fields = {
            "rolling_summary": new_summary,
            "needs_compaction": False,
            "last_compacted_at": datetime.utcnow(),
        }

        if last_compacted_message_id:
            update_fields["last_compacted_message_id"] = last_compacted_message_id

        session_repo.update_session_context_state(
            db=db,
            session_id=self.session_id,
            **update_fields,
        )

        self.rolling_summary = new_summary
        self.needs_compaction = False
        if last_compacted_message_id:
            self.last_compacted_message_id = last_compacted_message_id


async def load_older_messages_for_compaction(
    session_id: UUID,
    db: DBSession,
    boundary_message_id: UUID | None = None,
    after_previous_boundary_id: UUID | None = None,
) -> list[dict]:
    """
    Load older messages for compaction/summarization.

    Only called during background compaction — NOT in the hot request path.

    Args:
        session_id: Chat session UUID
        db: SQLAlchemy session
        boundary_message_id: Load messages up to this boundary
        after_previous_boundary_id: Start from after this boundary (incremental)

    Returns:
        List of {"role": str, "content": str} dicts in chronological order
    """
    messages = session_repo.get_messages_before_boundary(
        db=db,
        session_id=session_id,
        boundary_message_id=boundary_message_id,
        after_previous_boundary_id=after_previous_boundary_id,
    )

    return [
        {"role": msg.role.value, "content": msg.content}
        for msg in messages
    ]
