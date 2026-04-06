import streamlit as st
import requests
import pandas as pd
import json
import os

st.set_page_config(page_title="FloatChat RAG", layout="wide")

st.title("⚓ FloatChat: Oceanographic Data RAG")

# Sidebar configuration
with st.sidebar:
    st.header("Configuration")
    api_url = st.text_input("API URL", value="http://localhost:8000/query")
    st.info("Ensure the FastAPI backend is running on port 8000.")

# Main Interface
question = st.text_area("Ask a question about Argo float data:", height=100)

if st.button("Generate Answer"):
    if not question:
        st.warning("Please enter a question.")
    else:
        with st.spinner("Processing... (Retrieving -> Generating SQL -> Validating -> Executing)"):
            try:
                payload = {"question": question}
                response = requests.post(api_url, json=payload)

                if response.status_code == 200:
                    data = response.json()

                    # 1. Summary Section
                    st.subheader("📝 Summary")
                    st.markdown(data.get("summary", "No summary provided."))

                    # 2. Data Section
                    st.subheader("📊 Data Results")
                    raw_data = data.get("data")
                    if raw_data:
                        df = pd.DataFrame(raw_data)
                        st.dataframe(df)
                    else:
                        st.info("No table data returned.")

                    # 3. Technical Details (Expandable)
                    with st.expander("🛠️ Technical Details (SQL & Debug)"):
                        st.markdown("**Generated SQL:**")
                        st.code(data.get("sql_query"), language="sql")

                        if data.get("validation_error"):
                            st.error(f"Validation Error: {data['validation_error']}")

                else:
                    st.error(f"API Error {response.status_code}: {response.text}")

            except requests.exceptions.ConnectionError:
                st.error("Could not connect to API. Is 'python api/main.py' running?")
            except Exception as e:
                st.error(f"An error occurred: {str(e)}")

# Footer
st.markdown("---")
st.markdown("*Powered by LangGraph, Supabase, and Auto-Correcting SQL Agents.*")
