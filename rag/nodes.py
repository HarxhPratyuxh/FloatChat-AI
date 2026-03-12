import pandas as pd
import re
import os
import psycopg2
import sqlglot
from sqlglot import exp
from typing import Dict, Any
from .state import AgentState
from .llm_provider import get_llm
from .prompts import sql_gen_prompt, sql_fix_prompt, summary_prompt, route_prompt, general_qa_prompt, rewrite_prompt
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI

# Initialize LLM (default to OpenRouter for generic logic, can be swapped)
# For prototype, we default to OpenRouter but user can change via env
llm = get_llm(provider="groq")

from typing import Literal
from pydantic import BaseModel, Field
from .utils import get_schema_markdown

# Define Pydantic Model for Structured Output
class SQLOutput(BaseModel):
    sql_query: str = Field(description="The valid SQL query to execute")
    validation_thought: str = Field(description="Step by step reasoning for why this SQL is valid and safe")
    fallback: Literal["none", "general_qa"] = Field(description="If the question is a general concept query inappropriately routed here, set to general_qa. Else none.", default="none")
    
class GeneralQAOutput(BaseModel):
    answer: str = Field(description="The natural language answer to the user's question.")
    fallback: Literal["none", "rewrite_question"] = Field(description="If the question requires pulling raw data from SQL instead of answering from definitions, set to rewrite_question. Else none.", default="none")

from .retriever import get_retrieved_context, get_sql_examples

def format_chat_history(history: list) -> str:
    if not history:
        return "No previous context."
    return "\n".join([f"{msg.get('role', 'user').capitalize()}: {msg.get('content', '')}" for msg in history])

async def rewrite_question(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Rewrites the user's question to be perfectly standalone based on Chat History.
    """
    question = state["question"]
    original_question = state.get("original_question") or question
    history_str = format_chat_history(state.get("chat_history", []))
    
    # If there is no chat history, the question is already standalone.
    if not state.get("chat_history"):
         return {"question": question, "original_question": original_question, "chat_history": state.get("chat_history", [])}
         
    print(f"DEBUG: Original Question -> {question}")
    
    # Use hyper-fast Llama 3 for the rewrite
    rewrite_llm = get_llm(provider="groq", model_name="llama-3.1-8b-instant")
    chain = rewrite_prompt | rewrite_llm | StrOutputParser()
    
    new_question = await chain.ainvoke({
        "question": question,
        "chat_history": history_str
    }, config=config)
    
    new_question = new_question.strip()
    print(f"DEBUG: Rewritten Question -> {new_question}")
    
    return {"question": new_question, "original_question": original_question, "chat_history": state.get("chat_history", [])}
def retrieve(state: AgentState) -> AgentState:
    """
    Retrieves relevant context from the vector store.
    """
    question = state["question"]
    context = get_retrieved_context(question)
    return {"context": context}

def route_question(state: AgentState) -> AgentState:
    """
    Classifies the user question as either a database query or a general question.
    """
    question = state["question"]
    history_str = format_chat_history(state.get("chat_history", []))
    
    # We use a lightning fast and cheap LLM for this binary classification task
    route_llm = get_llm(provider="groq", model_name="qwen/qwen3-32b")
    chain = route_prompt | route_llm | StrOutputParser()
    
    classification = chain.invoke({
        "question": question,
        "chat_history": history_str
    }).strip().lower()
    
    # Clean up output in case LLM is chatty
    if "data_query" in classification:
        route = "data_query"
    elif "general_question" in classification:
        route = "general_question"
    else:
        # Default to data_query if it's ambiguous
        route = "data_query"
        
    print(f"DEBUG: Question classified as -> {route}")
    return {"route": route}

async def general_qa(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Answers a general domain question using only the retrieved context, bypassing SQL.
    Writes the answer directly to the summary field.
    """
    question = state["question"]
    original_question = state.get("original_question", question)
    context = state.get("context", "")
    history_str = format_chat_history(state.get("chat_history", []))
    
    print("DEBUG: Executing General QA Node")
    
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if google_api_key:
         qa_llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite-preview", google_api_key=google_api_key, streaming=False)
    else:
         qa_llm = llm # Fallback to default
         
    structured_qa_llm = qa_llm.with_structured_output(GeneralQAOutput)
    chain = general_qa_prompt | structured_qa_llm
    
    response = await chain.ainvoke({
        "question": original_question,
        "context": context,
        "chat_history": history_str,
        "failsafe_count": state.get("failsafe_count", 0)
    }, config=config)
    
    if response.fallback == "rewrite_question":
        failsafe_count = state.get("failsafe_count", 0)
        if failsafe_count >= 1:
            print("DEBUG: General QA disobeyed Loop Instruction -> Executing hard fallback routing")
            return {
                "summary": "I'm sorry, I don't have enough information in my database or context documentation to confidently answer that question.",
                "sql_query": None,
                "query_result": [],
                "fallback_route": "end"
            }
        print("DEBUG: General QA Pydantic Failsafe Triggered -> Routing to SQL")
        return {"summary": "", "fallback_route": "rewrite_question", "failsafe_count": failsafe_count + 1}
    
    return {"summary": response.answer, "sql_query": None, "query_result": [], "fallback_route": "none"}

def generate_sql(state: AgentState) -> AgentState:
    """
    Generates an SQL query based on the question and context.
    Uses Structured Output for robustness.
    """
    question = state["question"]
    context = state.get("context", "")
    retry_count = state.get("retry_count", 0)
    history_str = format_chat_history(state.get("chat_history", []))

    # Load Schema dynamically
    schema_text = get_schema_markdown()

    try:
        if state.get("validation_error"):
            # Fix mode - For fix, we simplify to string output for now or could force structure too
            # Let's keep fix simple string-based for robustness in case validation error is about structure
            chain = sql_fix_prompt | llm | StrOutputParser()
            response = chain.invoke({
                "question": question,
                "sql_query": state.get("sql_query", ""),
                "error": state["validation_error"],
                "schema": schema_text
            })
            sql = response.replace("```sql", "").replace("```", "").strip()
        else:
            # Generation mode - USE STRUCTURED OUTPUT
            structured_llm = llm.with_structured_output(SQLOutput)
            chain = sql_gen_prompt | structured_llm
            
            # Retrieve similar canonical SQL examples dynamically using FAISS
            sql_examples = get_sql_examples(question)

            response = chain.invoke({
                "question": question,
                "context": context,
                "schema": schema_text,
                "examples": sql_examples
            })
            
            if response.fallback == "general_qa":
                failsafe_count = state.get("failsafe_count", 0)
                print("DEBUG: SQL Gen Pydantic Failsafe Triggered -> Routing to General QA")
                return {"sql_query": "", "validation_error": None, "fallback_route": "general_qa", "failsafe_count": failsafe_count + 1}

            sql = response.sql_query

        return {"sql_query": sql, "validation_error": None, "fallback_route": "none"}

    except Exception as e:
        return {
            "sql_query": state.get("sql_query", ""),
            "validation_error": f"LLM Generation Error: {str(e)}",
            "retry_count": retry_count + 1
        }

def validate_sql(state: AgentState) -> AgentState:
    """
    Validates the generated SQL for safety and schema compliance using AST parsing.
    Guarantees no false positives from comments or strings.
    """
    sql = state["sql_query"]

    # 1. Parse into Abstract Syntax Tree (AST)
    try:
        parsed_list = sqlglot.parse(sql, read="postgres")
        if len(parsed_list) > 1:
            return {
                "validation_error": "Syntax Error: Multiple SQL statements detected. Please return ONLY ONE single query.",
                "retry_count": state.get("retry_count", 0) + 1
            }
        parsed = parsed_list[0] if parsed_list else None
    except Exception as e:
        return {
            "validation_error": f"Syntax Error: Could not parse SQL. {str(e)}",
            "retry_count": state.get("retry_count", 0) + 1
        }
        
    if parsed is None:
        return {
            "validation_error": "Syntax Error: Empty query.",
            "retry_count": state.get("retry_count", 0) + 1
        }

    # 2. Safety check: Ensure no DML or DDL commands anywhere in the tree
    forbidden_types = (exp.Delete, exp.Drop, exp.Insert, exp.Update, exp.Alter, exp.Command)
    for node_type in forbidden_types:
        if list(parsed.find_all(node_type)):
            return {
                "validation_error": f"Security Error: Forbidden operation '{node_type.__name__}' detected.",
                "retry_count": state.get("retry_count", 0) + 1
            }

    # 3. Schema Logic: Ensure exact column name usage
    # We ban the use of raw "TEMP" or "PSAL", forcing the LLM to use the _adjusted versions
    for col in parsed.find_all(exp.Column):
        col_name = col.name.upper()
        if col_name == "TEMP":
            return {
                "validation_error": "Schema Error: Must use TEMP_ADJUSTED, not raw TEMP.",
                 "retry_count": state.get("retry_count", 0) + 1
            }
        if col_name == "PSAL":
            return {
                "validation_error": "Schema Error: Must use PSAL_ADJUSTED, not raw PSAL.",
                 "retry_count": state.get("retry_count", 0) + 1
            }

    # 4. Strict QC Error Enforcement (Llama 8B Hallucination Prevention)
    # The prompt says: "temp_qc = '1'", but smaller models often output "temp_qc = 'GOOD'"
    for eq in parsed.find_all(exp.EQ):
        left, right = eq.this, eq.expression
        if isinstance(left, exp.Column) and isinstance(right, exp.Literal):
            col_name = left.name.lower()
            if col_name in ['temp_qc', 'psal_qc']:
                val = right.name
                if val != '1':
                    return {
                        "validation_error": f"Schema QC Error: You used {col_name} = '{val}'. This is strictly forbidden. The database schema ONLY uses the string literal '1' to represent good data. You must rewrite the query using {col_name} = '1'.",
                        "retry_count": state.get("retry_count", 0) + 1
                    }

    return {"validation_error": None}

def execute_sql(state: AgentState) -> AgentState:
    """
    Executes the valid SQL against the PostgreSQL database.
    """
    sql = state["sql_query"]
    print(f"DEBUG: Executing SQL: {sql}")

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return {
            "validation_error": "Configuration Error: DATABASE_URL not found in .env.",
            "retry_count": state["retry_count"] + 1
        }

    try:
        # Connect to the database
        conn = psycopg2.connect(db_url, sslmode='require')
        
        # EXPERT SAFETY: Enforce Read-Only session at the Postgres Driver level!
        # Even if a malicious query bypasses AST parsing, the database will strictly reject it.
        conn.set_session(readonly=True, autocommit=True)
        
        cursor = conn.cursor()

        # Execute
        cursor.execute(sql)

        # Fetch results with a hard 15k cap to prevent memory exhaustion
        if cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchmany(15000)

            # Convert to list of dicts for the state
            results = []
            for row in rows:
                results.append(dict(zip(columns, row)))
        else:
            # For non-SELECT queries (though we validated against them, just in case)
            results = [{"status": "success", "rows_affected": cursor.rowcount}]

        cursor.close()
        conn.close()

        return {"query_result": results}

    except Exception as e:
        # We catch actual PostgreSQL errors (like syntax typos or missing columns) 
        # and feed them back to the state so the LLM graph loops and fixes them!
        error_msg = str(e).strip()
        print(f"DEBUG: DB Execution Error Caught: {error_msg}")
        return {
            "validation_error": f"PostgreSQL Execution Error:\n{error_msg}\nPlease rewrite the query to fix this error.",
            "retry_count": state.get("retry_count", 0) + 1,
            "query_result": []
        }

async def summarize(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Summarizes the results into natural language using Gemini with fallbacks.
    """
    question = state["question"]
    results = state.get("query_result")
    history_str = format_chat_history(state.get("chat_history", []))

    if not results:
        return {"summary": "I could not generate a summary because the database execution failed or returned no results."}

    # Data Science Summarization Logic for Large Payloads
    # If the user asks for 15,000 rows, sending that as JSON to an LLM will blow the token limit and cost 10+ seconds.
    # Instead, we use pandas to crunch a mathematical description (min, max, mean, quartiles) 
    # of the data, and send *that tiny mathematical summary* to the LLM to write its essay.
    if len(results) > 30:
        try:
            df = pd.DataFrame(results)
            # Find numeric columns to describe
            numeric_cols = df.select_dtypes(include=['number']).columns
            
            if len(numeric_cols) > 0:
                stats = df[numeric_cols].describe().to_string()
            else:
                stats = "No continuous numeric data found to aggregate."
            
            # Grab a tiny 10-row sample to show the LLM the structure of the data
            sample_df = df.head(10).to_string(index=False)
            
            
            # Check if this query was downsampled so we can warn the LLM
            sql_query = state.get("sql_query", "").upper()
            sample_warning = ""
            if "TABLESAMPLE" in sql_query:
                sample_warning = (
                    f"\n[CRITICAL SYSTEM WARNING: The data below is a RANDOM DOWN-SAMPLED SUBSET of the database (e.g., 5%) to prevent map rendering crashes. "
                    f"You MUST explicitly state to the user that these {len(results)} points are a *sample* representing the region, NOT the absolute total number of floats.]\n"
                )

            data_str = (
                f"[SYSTEM WARNING: The database returned a massive dataset containing {len(results)} rows. "
                "You are only seeing a summary. Do NOT attempt to list every row.]\n"
                f"{sample_warning}\n"
                f"-- Statistical Summary of Data --\n{stats}\n\n"
                f"-- 10-Row Sample --\n{sample_df}"
            )
        except Exception as e:
            # Fallback if pandas fails for some weird reason
            print(f"DEBUG: Pandas summarization failed: {e}")
            data_str = f"[SYSTEM WARNING: massive dataset returned ({len(results)} rows). First 10 rows shown]:\n" + str({results[:10]})
    else:
        # For small datasets, just drop the raw markdown table into the LLM context
        df = pd.DataFrame(results)
        
        sql_query = state.get("sql_query", "").upper()
        sample_warning = ""
        if "TABLESAMPLE" in sql_query:
            sample_warning = (
                f"\n[CRITICAL SYSTEM WARNING: The data below is a RANDOM DOWN-SAMPLED SUBSET of the database (e.g., 5%) to prevent map rendering crashes. "
                f"You MUST explicitly state to the user that these {len(results)} points are a *sample* representing the region, NOT the absolute total number of floats.]\n"
            )
            
        data_str = sample_warning + df.to_markdown()

    try:
        # Get the API key from environment
        google_api_key = os.getenv("GOOGLE_API_KEY")

        if not google_api_key:
            # Fallback to the original generic LLM if no Google key exists
            print("WARNING: GOOGLE_API_KEY not found. Falling back to default LLM for summarization.")
            summarize_llm = llm
        else:
            # a fallback chain
            # 1. Primary: Gemini 3.1 Flash Lite (Fastest, newest, but 250k TPM limit on free)
            # 2. Fallback A: Gemini 2.0 Flash Lite
            # 3. Fallback B: Gemini 2.5 Flash (1M TPM limit safety net)
            fallback_1 = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite-preview", google_api_key=google_api_key, streaming=True)
            #primary_llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=google_api_key, streaming=True)
            fallback_2 = get_llm(provider="openrouter")
            primary_llm = ChatGoogleGenerativeAI(model="gemini-3-flash-preview", google_api_key=google_api_key, streaming=True)
            
            # Combine into a resilient chain
            summarize_llm = primary_llm.with_fallbacks([fallback_1, fallback_2])

        chain = summary_prompt | summarize_llm | StrOutputParser()
        summary = await chain.ainvoke({
            "question": question,
            "results": data_str,
            "chat_history": history_str
        }, config=config)
        return {"summary": summary}

    except Exception as e:
        return {"summary": f"Error generating summary: {str(e)}"}
