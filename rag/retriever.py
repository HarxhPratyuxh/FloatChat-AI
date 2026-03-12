import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import re

# Config
INDEX_DIR = "rag/faiss_index"
INDEX_FILE = os.path.join(INDEX_DIR, "index.bin")
DOCS_FILE = os.path.join(INDEX_DIR, "docs.txt")
MODEL_NAME = "all-MiniLM-L6-v2"
SQL_EXAMPLES_FILE = "sql_examples/canonical_queries.sql"

class Retriever:
    def __init__(self):
        try:
            self.model = SentenceTransformer(MODEL_NAME)
        except Exception as e:
            print(f"Error loading embedding model: {e}")
            self.model = None

        # Load standard doc index
        try:
            self.index = faiss.read_index(INDEX_FILE)
            with open(DOCS_FILE, "r", encoding="utf-8") as f:
                self.docs = f.readlines()
        except Exception as e:
            print(f"Error loading retrieval index: {e}. Retrieval will be empty.")
            self.index = None
            self.docs = []
            
        # Load SQL Examples index
        self.sql_examples = []
        self.sql_index = None
        try:
            if os.path.exists(SQL_EXAMPLES_FILE) and self.model:
                with open(SQL_EXAMPLES_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                
                blocks = re.split(r'sql\s*Copy code', content)
                for block in blocks:
                    block = block.strip()
                    if not block: continue
                    lines = block.split('\n')
                    questions = []
                    sql_lines = []
                    for line in lines:
                        if line.startswith('--'):
                            q = line.strip('- ').strip()
                            q = re.sub(r'^\d+\.\s*', '', q)
                            questions.append(q)
                        elif line.strip():
                            sql_lines.append(line)
                    
                    if questions and sql_lines:
                        q_text = " ".join(questions)
                        sql_text = "\n".join(sql_lines).strip()
                        self.sql_examples.append({
                            "question": q_text,
                            "sql": sql_text
                        })
                
                if self.sql_examples:
                    # Build FAISS index for SQL queries
                    embeddings = self.model.encode([ex["question"] for ex in self.sql_examples])
                    dimension = embeddings.shape[1]
                    self.sql_index = faiss.IndexFlatL2(dimension)
                    self.sql_index.add(np.array(embeddings).astype('float32'))
                    print(f"Loaded {len(self.sql_examples)} canonical SQL examples into Semantic FAISS store.")
        except Exception as e:
            print(f"Error loading SQL examples index: {e}")

    def retrieve(self, query: str, k: int = 2) -> str:
        if not self.index or not self.model:
            return ""

        embedding = self.model.encode([query])
        distances, indices = self.index.search(np.array(embedding).astype('float32'), k)

        results = []
        for idx in indices[0]:
            if idx < len(self.docs):
                results.append(self.docs[idx].strip())

        return "\n\n".join(results)

    def retrieve_sql_examples(self, query: str, k: int = 2) -> str:
        if not self.sql_index or not self.model or not self.sql_examples:
            return ""
            
        embedding = self.model.encode([query])
        distances, indices = self.sql_index.search(np.array(embedding).astype('float32'), k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.sql_examples):
                ex = self.sql_examples[idx]
                results.append(f"Example {i+1}:\nQuestion: {ex['question']}\nQuery:\n{ex['sql']}")
                
        return "\n\n".join(results)

# Singleton instance
retriever = Retriever()

def get_retrieved_context(query: str) -> str:
    return retriever.retrieve(query)

def get_sql_examples(query: str, k: int = 2) -> str:
    return retriever.retrieve_sql_examples(query, k)
