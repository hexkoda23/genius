import os
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer

QDRANT_DIR  = os.path.join(os.path.dirname(__file__), '..', '..', 'qdrant_db')
COLLECTION  = 'mathgenius_books'
EMBED_MODEL = 'all-MiniLM-L6-v2'

_client = None
_model  = None

def _get_client_and_model():
    global _client, _model
    if _client is not None and _model is not None:
        return _client, _model
    if not os.path.exists(QDRANT_DIR):
        return None, None
    try:
        _client = QdrantClient(path=QDRANT_DIR)
        _model  = SentenceTransformer(EMBED_MODEL)
        collections = [c.name for c in _client.get_collections().collections]
        if COLLECTION not in collections:
            return None, None
        # Check if collection actually has points
        info = _client.get_collection(COLLECTION)
        if info.points_count == 0:
            print("⚠️  RAG collection is empty — no books ingested yet.")
            return None, None
        print(f"✅ Qdrant RAG loaded — {info.points_count} chunks available.")
        return _client, _model
    except Exception as e:
        print(f"⚠️  Qdrant not available: {e}")
        return None, None

def retrieve_context(query: str, n_results: int = 4) -> str:
    client, model = _get_client_and_model()
    if client is None or model is None:
        return ""
    try:
        query_vector = model.encode(query).tolist()

        # New Qdrant API — query_points instead of search
        results = client.query_points(
            collection_name=COLLECTION,
            query=query_vector,
            limit=n_results,
            with_payload=True
        )

        if not results.points:
            return ""

        context_parts = []
        for hit in results.points:
            source = hit.payload.get('source', 'Unknown')
            text   = hit.payload.get('text',   '').strip()
            score  = hit.score
            if text and score > 0.3:
                context_parts.append(
                    f"[Source: {source}  |  Relevance: {score:.0%}]\n{text}"
                )

        if not context_parts:
            return ""

        return (
            "RELEVANT TEXTBOOK CONTENT — use this to ground your answer:\n\n"
            + "\n\n---\n\n".join(context_parts)
            + "\n\n---\n"
        )

    except Exception as e:
        print(f"Retrieval error: {e}")
        return ""