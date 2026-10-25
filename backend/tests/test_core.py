"""
tests/test_core.py — Unit tests for the core logic.

Tests:
  1. Precision@5 calculation with known values
  2. Recall@5 calculation with known values
  3. MRR when first relevant is at rank 2
  4. Chunks never cross page boundaries
  5. Hybrid search ranks a chunk that is high in both lists first

Run with:  pytest tests/  (from the backend/ folder)
"""

import sys
import os

# Make sure we can import from the backend folder
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from evaluate import precision_at_k, recall_at_k, reciprocal_rank
from ingest import split_into_chunks
from retrieval import search_hybrid


# ── Metric tests ──────────────────────────────────────────────────────────────

def test_precision_at_5():
    """
    Top 5 results: hits at positions 1, 2.
    3 total relevant (one not retrieved).
    Precision@5 = 2/5 = 0.40
    """
    retrieved = [("paper.pdf", 1), ("paper.pdf", 2), ("paper.pdf", 3),
                 ("paper.pdf", 4), ("paper.pdf", 5)]
    relevant = {("paper.pdf", 1), ("paper.pdf", 2), ("paper.pdf", 10)}
    result = precision_at_k(retrieved, relevant, 5)
    assert abs(result - 0.4) < 0.001, f"Expected 0.40, got {result}"


def test_recall_at_5():
    """
    Top 5 results: 2 hits found out of 3 total relevant.
    Recall@5 = 2/3 ≈ 0.667
    """
    retrieved = [("paper.pdf", 1), ("paper.pdf", 2), ("paper.pdf", 3),
                 ("paper.pdf", 4), ("paper.pdf", 5)]
    relevant = {("paper.pdf", 1), ("paper.pdf", 2), ("paper.pdf", 10)}
    result = recall_at_k(retrieved, relevant, 5)
    assert abs(result - 0.6667) < 0.001, f"Expected 0.667, got {result}"


def test_mrr_first_relevant_at_rank_2():
    """
    The first relevant result is at rank 2.
    Reciprocal Rank = 1/2 = 0.50
    """
    retrieved = [("paper.pdf", 3), ("paper.pdf", 1), ("paper.pdf", 5)]
    relevant = {("paper.pdf", 1)}
    result = reciprocal_rank(retrieved, relevant)
    assert abs(result - 0.5) < 0.001, f"Expected 0.50, got {result}"


# ── Chunking test ─────────────────────────────────────────────────────────────

def test_chunks_stay_on_same_page():
    """
    Chunks produced from page 1 text must all have page=1,
    and chunks from page 2 text must all have page=2.
    They must never mix.
    """
    page1_chunks = split_into_chunks("word " * 300, page_num=1, paper_title="test.pdf")
    page2_chunks = split_into_chunks("word " * 300, page_num=2, paper_title="test.pdf")

    for c in page1_chunks:
        assert c["page"] == 1, f"Chunk from page 1 has page={c['page']}"
    for c in page2_chunks:
        assert c["page"] == 2, f"Chunk from page 2 has page={c['page']}"


# ── Hybrid ranking test ───────────────────────────────────────────────────────

def test_hybrid_puts_best_match_first():
    """
    Chunk c0 is clearly about machine learning (matches the query perfectly).
    It should rank #1 in hybrid search because it scores high in both BM25 and dense.
    """
    chunks = [
        {
            "chunk_id": "c0",
            "paper_title": "ml.pdf",
            "page": 1,
            "text": (
                "machine learning neural network deep learning classification "
                "training model accuracy gradient descent backpropagation "
                "machine learning neural network deep learning classification"
            )
        },
        {
            "chunk_id": "c1",
            "paper_title": "cooking.pdf",
            "page": 2,
            "text": "pasta tomato sauce recipe Italian cooking garlic olive oil"
        },
        {
            "chunk_id": "c2",
            "paper_title": "sports.pdf",
            "page": 3,
            "text": "football game score tournament championship league players"
        },
    ]

    results = search_hybrid("machine learning neural network classification", chunks, k=3)
    assert results[0]["chunk"]["chunk_id"] == "c0", (
        f"Expected c0 at rank 1, got {results[0]['chunk']['chunk_id']}"
    )
