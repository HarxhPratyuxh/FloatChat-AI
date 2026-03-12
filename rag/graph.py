from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes import rewrite_question, generate_sql, validate_sql, execute_sql, summarize, retrieve, route_question, general_qa

def condition_check(state: AgentState):
    """
    Decides the next node based on validation error.
    """
    if state.get("validation_error"):
        if state["retry_count"] > 3:  # Max retries
            return "end" # Or handle failure gracefully
        return "retry"
    return "continue"

def route_decision(state: AgentState):
    """
    Routes to general QA or SQL generation based on classification.
    """
    if state.get("route") == "general_question":
        return "general_qa"
    return "rewrite_question"

def generate_sql_decision(state: AgentState):
    if state.get("fallback_route") == "general_qa":
        return "general_qa"
    return "validate_sql"

def general_qa_decision(state: AgentState):
    if state.get("fallback_route") == "rewrite_question":
        return "rewrite_question"
    return "end"


# Define the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("rewrite_question", rewrite_question)
workflow.add_node("retrieve", retrieve)
workflow.add_node("route_question", route_question)
workflow.add_node("general_qa", general_qa)
workflow.add_node("generate_sql", generate_sql)
workflow.add_node("validate_sql", validate_sql)
workflow.add_node("execute_sql", execute_sql)
workflow.add_node("summarize", summarize)

# Add edges
workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "route_question")

# Conditional routing
workflow.add_conditional_edges(
    "route_question",
    route_decision,
    {
        "general_qa": "general_qa",
        "rewrite_question": "rewrite_question"
    }
)

workflow.add_edge("rewrite_question", "generate_sql")

workflow.add_conditional_edges(
    "generate_sql",
    generate_sql_decision,
    {
        "general_qa": "general_qa",
        "validate_sql": "validate_sql"
    }
)

# Conditional edge from validate
workflow.add_conditional_edges(
    "validate_sql",
    condition_check,
    {
        "retry": "generate_sql",
        "continue": "execute_sql",
        "end": END
    }
)

workflow.add_conditional_edges(
    "execute_sql",
    condition_check,
    {
        "retry": "generate_sql",
        "continue": "summarize",
        "end": "summarize"
    }
)

workflow.add_edge("summarize", END)
workflow.add_conditional_edges(
    "general_qa",
    general_qa_decision,
    {
        "rewrite_question": "rewrite_question",
        "end": END
    }
)

# Compile
app = workflow.compile()
