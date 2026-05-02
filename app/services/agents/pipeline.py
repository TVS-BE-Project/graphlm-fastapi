from app.db.session import get_db_session
from app.models.chat_session import ChatSession
from app.utils.api_error import ApiError
from app.services.agents.chat_agent import run_agent

async def run_agent_pipeline(user_id: str, session: ChatSession, chat_id: UUID, user_message: str) -> str:
    """
    Run the agent pipeline with the given input data.

    Args:
        user_id: The ID of the user.
        session: The chat session.
        chat_id: The ID of the chat.
        user_message: The message from the user.

    Returns:
        The output from the agent pipeline.
    """
    try:
        with get_db_session() as db:
            recent = (
                db.query(ChatMessage)
                .filter(ChatMessage.chat_id == chat_id)
                .order_by(ChatMessage.created_at.desc())
                .limit(40)
                .all()
            )
            recent.reverse() 
            context_messages = [    
                {"role": msg.role.value, "content": msg.content} for msg in recent
            ]
        
        source_ids: list[str] = []
        collection_names: list[str] = []

        with get_db_session() as db:
            for source in session.sources:
                index = (
                    db.query(SourceIndex)
                    .filter(SourceIndex.source_id == source.id)
                    .first()
                )
                if index and index.vector_indexed:
                    collection_names.append(index.collection_name)
                
                if index and index.vector_indexed:
                    source_ids.append(str(source.id))

        response = await run_agent(
            user_id=user_id,
            messages=context_messages,
            collection_names=collection_names,
            source_ids=source_ids,
            chat_id=chat_id,
        )

        return response 
    except Exception as e:
        print(f"[Pipeline] Unexpected error in pipeline for chatSession {session.id}: {e}")
        raise ApiError(status_code=500, detail="Internal server error")
