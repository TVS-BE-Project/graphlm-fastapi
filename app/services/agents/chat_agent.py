from agents import Agent, Runner
from app.core.config import Settings
from app.services.agents.tools import AgentPromptContext


def _build_system_prompt(chat_context=None):
    if chat_context is None:
        chat_context = {}

    collection_names = chat_context.get("collection_names", [])
    source_ids = chat_context.get("source_ids", [])
    user_id = chat_context.get("user_id", None)
    chat_id = chat_context.get("chat_id", None)

    prompt = """You are a helpful research assistant with access to the user's indexed documents and memory.

Your capabilities:
- You can search through uploaded PDFs and GitHub repositories using semantic similarity (vector_search tool)
- You can search structured knowledge graphs for entities and relationships (graph_search tool)
- You can search past conversations and user context using the search_memory tool
- You can save important information for later recall using the save_memory tool
- You can update existing memories when information changes using the update_memory tool
- You can delete memories that are no longer relevant using the delete_memory tool
- You provide accurate, well-sourced answers based on indexed content and memory
- You cite sources when providing information

You have access to search tools:
1. vector_search – for finding relevant text passages and content-based queries. Searches all attached sources automatically in a single call — do NOT call it once per source.
2. graph_search – for understanding entities, relationships, dependencies, and structure.
   CRITICAL: graph_search uses name matching (CONTAINS/STARTS WITH on entity names). Always
   extract the specific entity, class, or function name from the user's question — never pass
   the full question text. Example: for "how does auth work?" pass "auth" or "AuthController",
   not the full question.

Response guidelines:
- Be concise but comprehensive in your responses
- If information is not found in sources or memory, clearly state that
- Provide specific references when quoting or paraphrasing from sources
- When updating/deleting memories, confirm the action to the user
"""

    # Attach context info
    if collection_names or source_ids:
        prompt += "\nAvailable data in this chat:\n"

        if user_id:
            prompt += f"- User ID: {user_id}\n"

        if collection_names:
            prompt += "- Collections:\n"
            for idx, name in enumerate(collection_names):
                prompt += f"  {idx + 1}. {name}\n"

        if source_ids:
            prompt += "- Source IDs:\n"
            for idx, sid in enumerate(source_ids):
                prompt += f"  {idx + 1}. {sid}\n"
        
        if chat_id:
            prompt += f"- Chat ID: {chat_id}\n"

    else:
        prompt += "\nNote: No collections or sources are attached to this chat session. Inform the user they need to attach sources first."

    return prompt

async def run_agent(
    user_id: str,
    messages: list[dict],
    collection_names: list[str],
    source_ids: list[str],
    chat_id: str
) -> str:
    """
    Run the RAG agent with access to memory, vector, and graph tools.

    The agent decides when to call each tool based on the user's question.

    Args:
        user_id:          User UUID string (scopes Mem0)
        messages:         Sliding window of recent messages [{role, content}]
        collection_names: Qdrant collection names for session's indexed sources
        source_ids:       Neo4j source_id strings for session's indexed sources
        chat_id:          Chat session ID for memory scoping
    Returns:
        Final assistant reply string
    """
    loop_messages = messages.copy()

    try:
        system_prompt = _build_system_prompt({
            "collection_names": collection_names,
            "source_ids": source_ids,
            "user_id": user_id,
            "chat_id": chat_id
        })

        agent = Agent[AgentPromptContext](
            name="RAG Agent",
            model=settings.OPENAI_LLM_MODEL,
            instructions=system_prompt,
            tools=[]
        )

        result = await Runner.run(
            agent,
            loop_messages,
            context=AgentPromptContext(
                collection_names=collection_names,
                source_ids=source_ids,
                user_id=user_id,
                chat_id=chat_id
            )
        )

        return result.final_output

    except Exception as e:
        print(f"[Agent] Unexpected error in agent execution for user {user_id}: {e}")
        raise ApiError(status_code=500, detail="Internal server error")                     