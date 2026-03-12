import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import glob
from typing import List

# Config
CORPUS_DIR = "rag/corpus"
INDEX_DIR = "rag/faiss_index"
INDEX_FILE = os.path.join(INDEX_DIR, "index.bin")
DOCS_FILE = os.path.join(INDEX_DIR, "docs.txt") # Store raw text mapping
MODEL_NAME = "all-MiniLM-L6-v2"

def load_documents() -> List[str]:
    """Reads all Markdown files from the corpus directory."""
    documents = []
    file_paths = glob.glob(os.path.join(CORPUS_DIR, "*.md"))

    print(f"Loading {len(file_paths)} files from {CORPUS_DIR}...")
    for path in file_paths:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            # Basic chunking: For now, treat whole file (small) or split by headers if needed.
            # Given the files are small manuals, using full file or large chunks is fine.
            # Let's clean newlines for better embedding.
            documents.append(content)
            print(f" - Loaded: {os.path.basename(path)}")

    return documents

def build_index():
    if not os.path.exists(INDEX_DIR):
        os.makedirs(INDEX_DIR)

    documents = load_documents()
    if not documents:
        print("No documents found! Check rag/corpus/")
        return

    print(f"Encoding {len(documents)} documents...")
    model = SentenceTransformer(MODEL_NAME)
    embeddings = model.encode(documents)

    # Create FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings).astype('float32'))

    # Save index and doc mapping
    faiss.write_index(index, INDEX_FILE)

    # Save the text content relative to ID
    with open(DOCS_FILE, "w", encoding="utf-8") as f:
        # Use a simple delimiter schema
        for doc in documents:
            # Replace newlines with space to make it one line per doc in storage (simple format)
            # Or use a separator. Let's use a separator string
            f.write(doc.replace("\n", " ") + "\n")

    print(f"Index built and saved to {INDEX_FILE}")

if __name__ == "__main__":
    build_index()
