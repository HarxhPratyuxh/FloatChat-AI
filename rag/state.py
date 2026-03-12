from typing import TypedDict, Optional, List, Any
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    """
    State for the FloatChat RAG pipeline.
    """
    question: str
    original_question: Optional[str]
    fallback_route: Optional[str]
    chat_history: List[dict]  # Conversational memory passed from frontend
    context: str  # Retrieved context from vector DB (mocked for now)
    sql_query: Optional[str]
    validation_error: Optional[str]
    query_result: Optional[List[dict]]  # Result from SQL execution
    summary: Optional[str]
    route: Optional[str]  # e.g., 'data_query' or 'general_question'
    retry_count: int
    failsafe_count: int
