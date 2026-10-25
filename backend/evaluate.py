"""
evaluate.py — Command-line script to measure retrieval quality.

Run:  python evaluate.py
      (from the backend/ folder with the venv active)

Reads data/questions.json, runs all 4 retrieval methods, computes
Precision@5, Recall@5 and MRR, prints a table, and saves results.csv.

Metric functions are written by hand so we can understand them clearly.
"""

import csv
import json
import os
import sys

from ingest import ingest_all
from retrieval import retrieve

PAPERS_DIR = "data/papers"
QUESTIONS_FILE = "data/questions.json"


# ── Metric functions (no libraries, plain Python) ─────────────────────────────

def precision_at_k(retrieved, relevant, k):
    """
    Precision@k = (relevant items in top-k) / k

    Example: top-5 has 2 relevant out of 5 → 2/5 = 0.40
    """
    top_k = retrieved[:k]
    hits = sum(1 for r in top_k if r in relevant)
    return hits / k if k > 0 else 0.0


def recall_at_k(retrieved, relevant, k):
    """
    Recall@k = (relevant items found in top-k) / (total relevant items)

    Example: top-5 finds 2 out of 3 total relevant → 2/3 = 0.67
    """
    if not relevant:
        return 0.0
    top_k = retrieved[:k]
    hits = sum(1 for r in top_k if r in relevant)
    return hits / len(relevant)


def reciprocal_rank(retrieved, relevant):
    """
    Reciprocal Rank = 1 / (rank of first relevant result)

    Example: first relevant is at rank 2 → 1/2 = 0.50
    Returns 0 if no relevant result is found.
    """
    for rank, item in enumerate(retrieved, start=1):
        if item in relevant:
            return 1.0 / rank
    return 0.0


# ── Main evaluation loop ──────────────────────────────────────────────────────

def evaluate():
    """Load questions, run retrieval, print metrics table, save results.csv."""

    # Check questions file exists
    if not os.path.exists(QUESTIONS_FILE):
        print(f"ERROR: {QUESTIONS_FILE} not found. Create it first.")
        sys.exit(1)

    with open(QUESTIONS_FILE) as f:
        questions = json.load(f)

    # Load all PDFs from the papers folder
    pdf_paths = [
        os.path.join(PAPERS_DIR, fname)
        for fname in os.listdir(PAPERS_DIR)
        if fname.lower().endswith(".pdf")
    ]
    if not pdf_paths:
        print(f"ERROR: No PDFs found in {PAPERS_DIR}/")
        sys.exit(1)

    print(f"Loaded {len(pdf_paths)} PDF(s). Ingesting...")
    all_chunks = ingest_all(pdf_paths)
    print(f"Total chunks: {len(all_chunks)}")

    methods = ["tfidf", "bm25", "dense", "hybrid"]
    # Store per-question scores for averaging later
    scores = {m: {"precision": [], "recall": [], "mrr": []} for m in methods}

    for i, q in enumerate(questions, start=1):
        print(f"\nQ{i}: {q['question'][:60]}...")

        # Build the set of (paper_title, page) pairs that count as relevant
        relevant = set()
        for rp in q["relevant_pages"]:
            relevant.add((rp["paper"], rp["page"]))

        for method in methods:
            top_k = retrieve(q["question"], all_chunks, k=5, method=method)
            # Each retrieved item is a (paper_title, page) tuple
            retrieved = [(r["chunk"]["paper_title"], r["chunk"]["page"]) for r in top_k]

            p = precision_at_k(retrieved, relevant, 5)
            r = recall_at_k(retrieved, relevant, 5)
            mrr = reciprocal_rank(retrieved, relevant)

            scores[method]["precision"].append(p)
            scores[method]["recall"].append(r)
            scores[method]["mrr"].append(mrr)

    # ── Print results table ───────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print(f"{'Method':<12} {'Precision@5':>12} {'Recall@5':>10} {'MRR':>8}")
    print("-" * 50)

    csv_rows = []
    for method in methods:
        n = len(scores[method]["precision"])
        avg_p = sum(scores[method]["precision"]) / n
        avg_r = sum(scores[method]["recall"]) / n
        avg_mrr = sum(scores[method]["mrr"]) / n

        print(f"{method:<12} {avg_p:>12.4f} {avg_r:>10.4f} {avg_mrr:>8.4f}")
        csv_rows.append({"method": method, "precision@5": avg_p, "recall@5": avg_r, "mrr": avg_mrr})

    # ── Save CSV ──────────────────────────────────────────────────────────────
    with open("results.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["method", "precision@5", "recall@5", "mrr"])
        writer.writeheader()
        writer.writerows(csv_rows)

    print("\nResults saved to results.csv")


if __name__ == "__main__":
    evaluate()
