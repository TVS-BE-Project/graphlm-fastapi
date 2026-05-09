"""
Chat Session repository for database access operations.

Provides reusable query functions for ChatSession model using SQLAlchemy ORM.
Handles all session-related CRUD operations while keeping business logic
separated in the service layer.

Functions in this repository:
- Query operations return None if session not found (no exceptions)
- Create/update/delete operations perform db.commit()
- Services/routes are responsible for validation and error handling
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage, MessageRole
from app.utils.logger import logger


def get_session_by_id(db: Session, session_id: UUID) -> Optional[ChatSession]:
    """
    Get a chat session by ID.

    Args:
        db: SQLAlchemy database session
        session_id: The session's UUID

    Returns:
        ChatSession object if found, None otherwise
    """
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()


def get_sessions_by_user(db: Session, user_id: UUID, skip: int = 0, limit: int = 10) -> tuple[List[ChatSession], int]:
    """
    Get all sessions for a user with pagination.

    Args:
        db: SQLAlchemy database session
        user_id: The user's UUID
        skip: Number of records to skip
        limit: Maximum records to return

    Returns:
        Tuple of (sessions list, total count)
    """
    query = db.query(ChatSession).filter(ChatSession.user_id == user_id)
    total = query.count()
    sessions = query.order_by(desc(ChatSession.created_at)).offset(skip).limit(limit).all()
    return sessions, total


def create_session(db: Session, user_id: UUID, title: str = "Untitled") -> ChatSession:
    """
    Create a new chat session.

    Args:
        db: SQLAlchemy database session
        user_id: The user's UUID
        title: Session title (defaults to "Untitled")

    Returns:
        The created ChatSession object

    Note:
        This function calls db.commit() and db.refresh()
    """
    session = ChatSession(user_id=user_id, title=title)
    db.add(session)
    db.commit()
    db.refresh(session)
    logger.info(f"Created new chat session: {session.id} for user: {user_id}")
    return session


def update_session_title(db: Session, session_id: UUID, title: str) -> Optional[ChatSession]:
    """
    Update a session's title.

    Args:
        db: SQLAlchemy database session
        session_id: The session's UUID
        title: New title

    Returns:
        Updated ChatSession object if found, None otherwise
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        return None
    
    session.title = title
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, session_id: UUID) -> bool:
    """
    Delete a session (cascade deletes all messages).

    Args:
        db: SQLAlchemy database session
        session_id: The session's UUID

    Returns:
        True if session was deleted, False if not found
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        return False
    
    db.delete(session)
    db.commit()
    logger.info(f"Deleted chat session: {session_id}")
    return True


def get_message_count(db: Session, session_id: UUID) -> int:
    """
    Get the number of messages in a session.

    Args:
        session_id: Session UUID
        db: SQLAlchemy database session

    Returns:
        Total message count for the session
    """
    return db.query(func.count(ChatMessage.id)).filter(
        ChatMessage.chat_id == session_id
    ).scalar() or 0


def add_user_message(db: Session, chat_id: UUID, content: str) -> ChatMessage:
    """
    Create and persist a user message in a chat session.

    Args:
        db: SQLAlchemy database session
        chat_id: The session's UUID
        content: Message content from user

    Returns:
        Created ChatMessage object with user role

    Note:
        This function calls db.commit() and db.refresh()
    """
    message = ChatMessage(
        chat_id=chat_id,
        role=MessageRole.user,
        content=content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def add_assistant_message(db: Session, chat_id: UUID, content: str) -> ChatMessage:
    """
    Create and persist an assistant message in a chat session.

    Args:
        db: SQLAlchemy database session
        chat_id: The session's UUID
        content: Message response from assistant/RAG pipeline

    Returns:
        Created ChatMessage object with assistant role

    Note:
        This function calls db.commit() and db.refresh()
    """
    message = ChatMessage(
        chat_id=chat_id,
        role=MessageRole.assistant,
        content=content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


# ─────────────────────────────────────────────────────────────────────────
# Context Control Plane Queries
# ─────────────────────────────────────────────────────────────────────────

def update_session_context_state(
    db: Session,
    session_id: UUID,
    **kwargs,
) -> Optional[ChatSession]:
    """
    Bulk-update context control plane fields on a ChatSession.

    Accepts any subset of context fields as keyword arguments:
      rolling_summary, last_compacted_message_id, needs_compaction,
      last_compacted_at, recent_window_size, estimated_token_usage,
      compaction_threshold

    Args:
        db: SQLAlchemy database session
        session_id: The session's UUID
        **kwargs: Fields to update

    Returns:
        Updated ChatSession if found, None otherwise
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        return None

    allowed_fields = {
        "rolling_summary", "last_compacted_message_id", "needs_compaction",
        "last_compacted_at", "recent_window_size", "estimated_token_usage",
        "compaction_threshold",
    }

    for key, value in kwargs.items():
        if key in allowed_fields:
            setattr(session, key, value)

    db.commit()
    db.refresh(session)
    return session


def get_recent_messages_windowed(
    db: Session,
    session_id: UUID,
    last_compacted_message_id: Optional[UUID] = None,
    window_size: int = 20,
) -> List[ChatMessage]:
    """
    Fetch only the recent message window for a session.

    If last_compacted_message_id is set, fetches only messages AFTER
    the compaction boundary. Otherwise fetches the latest N messages.

    Filters to user/assistant roles only (no system messages).
    Ordered by created_at ASC (chronological).

    Complexity: O(window_size) instead of O(full_history).

    Args:
        db: SQLAlchemy database session
        session_id: Chat session UUID
        last_compacted_message_id: Compact boundary message ID (or None)
        window_size: Maximum messages to return

    Returns:
        List of ChatMessage objects in chronological order
    """
    query = db.query(ChatMessage).filter(
        ChatMessage.chat_id == session_id,
        ChatMessage.role.in_([MessageRole.user, MessageRole.assistant]),
    )

    if last_compacted_message_id:
        # Get the created_at of the boundary message
        boundary_msg = db.query(ChatMessage.created_at).filter(
            ChatMessage.id == last_compacted_message_id,
        ).first()

        if boundary_msg:
            # Only fetch messages AFTER the compaction boundary
            query = query.filter(
                ChatMessage.created_at > boundary_msg.created_at,
            )

    # Order by newest first, limit, then reverse for chronological order
    messages = (
        query.order_by(ChatMessage.created_at.desc())
        .limit(window_size)
        .all()
    )

    # Return in chronological order (oldest first)
    return list(reversed(messages))


def get_messages_before_boundary(
    db: Session,
    session_id: UUID,
    boundary_message_id: Optional[UUID] = None,
    after_previous_boundary_id: Optional[UUID] = None,
) -> List[ChatMessage]:
    """
    Load messages BEFORE the compact boundary for compaction.

    Used only during background compaction — NOT in the hot request path.

    If after_previous_boundary_id is provided, only loads messages between
    the previous boundary and the current boundary (incremental compaction).

    Args:
        db: SQLAlchemy database session
        session_id: Chat session UUID
        boundary_message_id: Current compact boundary (load messages before this)
        after_previous_boundary_id: Previous boundary (optional, for incremental)

    Returns:
        List of ChatMessage objects in chronological order
    """
    query = db.query(ChatMessage).filter(
        ChatMessage.chat_id == session_id,
        ChatMessage.role.in_([MessageRole.user, MessageRole.assistant]),
    )

    if boundary_message_id:
        boundary_msg = db.query(ChatMessage.created_at).filter(
            ChatMessage.id == boundary_message_id,
        ).first()

        if boundary_msg:
            query = query.filter(
                ChatMessage.created_at <= boundary_msg.created_at,
            )

    if after_previous_boundary_id:
        prev_boundary_msg = db.query(ChatMessage.created_at).filter(
            ChatMessage.id == after_previous_boundary_id,
        ).first()

        if prev_boundary_msg:
            query = query.filter(
                ChatMessage.created_at > prev_boundary_msg.created_at,
            )

    return query.order_by(ChatMessage.created_at.asc()).all()

