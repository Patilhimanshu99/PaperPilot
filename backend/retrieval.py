
"""
retrieval.py — TF-IDF, BM25, dense and hybrid retrieval.

Methods:
    tfidf  : Keyword-frequency matching
    bm25   : BM25 keyword ranking
    dense  : Sentence-transformer semantic search with FAISS
    hybrid : Reciprocal Rank Fusion of BM25 and dense rankings
"""

import numpy as np
import faiss

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer


EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

print(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
print("Embedding model loaded.")


def _prepare_chunks(chunks):
    """Remove malformed or empty text chunks."""
    if not chunks:
        return []

    return [
        chunk for chunk in chunks
        if isinstance(chunk, dict)
        and isinstance(chunk.get("text"), str)
        and chunk["text"].strip()
    ]


def _rank_results(chunks, scores, k):
    """Return the top-k chunks ordered by descending score."""
    if not chunks or len(scores) == 0:
        return []

    k = max(1, min(int(k), len(chunks)))
    indices = np.argsort(scores)[::-1][:k]

    return [
        {
            "chunk": chunks[int(i)],
            "score": float(scores[int(i)]),
        }
        for i in indices
    ]


def search_tfidf(query, chunks, k=5):
    """Find passages with strong keyword overlap."""
    chunks = _prepare_chunks(chunks)

    if not chunks or not query.strip():
        return []

    texts = [chunk["text"] for chunk in chunks]

    try:
        vectorizer = TfidfVectorizer(
            lowercase=True,
            strip_accents="unicode",
        )
        matrix = vectorizer.fit_transform(texts)
        query_vector = vectorizer.transform([query.strip()])
        scores = cosine_similarity(query_vector, matrix)[0]
    except ValueError as exc:
        # For example, all documents contain only stop words.
        print(f"[Retrieval:TF-IDF] Cannot vectorize text: {exc}")
        return []

    return _rank_results(chunks, scores, k)


def search_bm25(query, chunks, k=5):
    """Rank passages using BM25 keyword relevance."""
    chunks = _prepare_chunks(chunks)

    if not chunks or not query.strip():
        return []

    tokenized_corpus = [
        chunk["text"].lower().split()
        for chunk in chunks
    ]

    query_tokens = query.lower().split()

    if not query_tokens:
        return []

    bm25 = BM25Okapi(tokenized_corpus)
    scores = bm25.get_scores(query_tokens)

    return _rank_results(chunks, scores, k)


import hashlib

# Cache mappings: chunk content hash -> normalized numpy embeddings
_EMBEDDING_CACHE = {}
_FAISS_INDEX_CACHE = {}


def _get_chunks_hash(chunks):
    """Compute a lightweight deterministic hash for the given chunk list."""
    hasher = hashlib.md5()
    for c in chunks:
        cid = str(c.get("chunk_id", ""))
        text = str(c.get("text", ""))
        hasher.update(cid.encode("utf-8", errors="ignore"))
        hasher.update(text[:100].encode("utf-8", errors="ignore"))
        hasher.update(str(len(text)).encode("ascii"))
    return hasher.hexdigest()


def get_cached_embeddings_and_index(chunks):
    """Retrieve or compute normalized embeddings and FAISS index for chunks."""
    cache_key = _get_chunks_hash(chunks)
    
    if cache_key in _FAISS_INDEX_CACHE and cache_key in _EMBEDDING_CACHE:
        return _EMBEDDING_CACHE[cache_key], _FAISS_INDEX_CACHE[cache_key]
        
    texts = [chunk["text"] for chunk in chunks]
    embeddings = embedding_model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    embeddings = np.asarray(embeddings, dtype=np.float32)
    
    if embeddings.ndim != 2 or len(embeddings) == 0:
        return None, None
        
    if not np.isfinite(embeddings).all():
        raise ValueError("Embedding model returned invalid document vectors.")

    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings)
    
    _EMBEDDING_CACHE[cache_key] = embeddings
    _FAISS_INDEX_CACHE[cache_key] = index
    return embeddings, index


def search_dense(query, chunks, k=5):
    """Find semantically similar passages using cached embeddings and FAISS."""
    chunks = _prepare_chunks(chunks)

    if not chunks or not query.strip():
        return []

    embeddings, index = get_cached_embeddings_and_index(chunks)
    if index is None or embeddings is None:
        return []

    query_embedding = embedding_model.encode(
        [query.strip()],
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    query_embedding = np.asarray(query_embedding, dtype=np.float32)

    search_k = min(max(1, int(k)), len(chunks))
    scores, indices = index.search(query_embedding, search_k)

    results = []

    for score, idx in zip(scores[0], indices[0]):
        idx = int(idx)

        # FAISS can use -1 to indicate a missing result.
        if idx < 0 or idx >= len(chunks):
            continue

        results.append({
            "chunk": chunks[idx],
            "score": float(score),
        })

    return results


def search_hybrid(query, chunks, k=5):
    """
    Combine BM25 and dense rankings using Reciprocal Rank Fusion.

    RRF uses ranks, not the raw score scales from the two methods.
    Results are tracked by their positions in the chunk list so duplicate
    chunk_id values cannot overwrite each other.
    """
    chunks = _prepare_chunks(chunks)

    if not chunks or not query.strip():
        return []

    bm25_results = search_bm25(
        query, chunks, k=len(chunks)
    )
    dense_results = search_dense(
        query, chunks, k=len(chunks)
    )

    # Map each result back to its original position.
    # Object identity avoids collisions between duplicate chunk IDs.
    positions = {id(chunk): i for i, chunk in enumerate(chunks)}

    bm25_ranks = {
        positions[id(result["chunk"])]: rank
        for rank, result in enumerate(bm25_results)
    }
    dense_ranks = {
        positions[id(result["chunk"])]: rank
        for rank, result in enumerate(dense_results)
    }

    rrf_constant = 60
    fused_results = []

    for i, chunk in enumerate(chunks):
        score = 0.0

        if i in bm25_ranks:
            score += 1.0 / (
                rrf_constant + bm25_ranks[i] + 1
            )

        if i in dense_ranks:
            score += 1.0 / (
                rrf_constant + dense_ranks[i] + 1
            )

        if score > 0:
            fused_results.append({
                "chunk": chunk,
                "score": score,
            })

    fused_results.sort(
        key=lambda result: result["score"],
        reverse=True,
    )

    return fused_results[:max(1, int(k))]


def retrieve(query, chunks, k=5, method="hybrid"):
    """Single entry point for all supported retrieval methods."""
    if not isinstance(query, str) or not query.strip():
        return []

    chunks = _prepare_chunks(chunks)

    if not chunks:
        return []

    method = (method or "hybrid").lower().strip()

    if method == "tfidf":
        return search_tfidf(query, chunks, k)
    elif method == "bm25":
        return search_bm25(query, chunks, k)
    elif method == "dense":
        return search_dense(query, chunks, k)
    elif method == "hybrid":
        return search_hybrid(query, chunks, k)

    raise ValueError(
        f"Unsupported retrieval method: {method!r}. "
        "Choose tfidf, bm25, dense, or hybrid."
    )
