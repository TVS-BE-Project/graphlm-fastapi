"""
Context pipeline package: rolling conversation runtime.

Public API:
  - build_context_window()           Main entry point for context building
  - embed_message()                  Background task for message embedding
  - delete_session_messages()        Background task for message deletion
  - emit_pipeline_event()            Event emission (for streaming integration)
  - PipelineEventType                Event type enum

Session Context Service (infrastructure layer):
  - get_context_state()              Debug/observability
  - evaluate_compaction()            Check compaction threshold
  - compact_session_context()        Background compaction workflow
  - get_context_summary()            Summary + metadata
  - rebuild_session_context()        Recovery/admin

Internal modules (not typically imported directly):
  - manager                    Pipeline orchestrator
  - state                      Session state management
  - budgeting                  Token estimation
  - summarizer                 Summary generation
  - assembler                  Context assembly
  - embeddings                 Message embedding + deletion
  - optional_retrieval         Semantic search (disabled by default)
  - events                     Event types and emitter
  - session_context_service    Context lifecycle management
"""

# Public API exports
from .manager import build_context_window
from .embeddings import embed_message, delete_session_messages
from .events import PipelineEventType, emit_pipeline_event
from .session_context_service import (
    get_context_state,
    evaluate_compaction,
    compact_session_context,
    get_context_summary,
    rebuild_session_context,
)

__all__ = [
    "build_context_window",
    "embed_message",
    "delete_session_messages",
    "PipelineEventType",
    "emit_pipeline_event",
    "get_context_state",
    "evaluate_compaction",
    "compact_session_context",
    "get_context_summary",
    "rebuild_session_context",
]
