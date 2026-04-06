import os
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

def get_llm(provider: str = "groq", model_name: str = None):
    """
    Factory to get the LLM instance based on provider.
    """
    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment")
        return ChatGroq(
            temperature=0,
            model_name=model_name or "groq/compound-mini",
            groq_api_key=api_key,
            streaming=True
        )

    elif provider == "openrouter":
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not found in environment")

        return ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            model=model_name or "meta-llama/llama-3.3-70b-instruct",
            temperature=0,
            streaming=True
        )

    else:
        raise ValueError(f"Unknown provider: {provider}")
