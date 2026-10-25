
"""
rag.py — Retrieval-Augmented Generation pipeline.

Retrieves relevant paper passages, builds an evidence-grounded prompt,
calls the LLM, and returns the answer with source references.
"""

from retrieval import retrieve
from llm import call_llm


INSUFFICIENT_EVIDENCE = "Insufficient evidence in the provided papers."


def build_prompt(query, top_chunks):
    """Build a prompt with numbered passages and source metadata."""
    context_lines = []

    for i, result in enumerate(top_chunks, start=1):
        chunk = result["chunk"]
        title = chunk.get("paper_title", "Unknown paper")
        page = chunk.get("page", "Unknown")
        text = chunk.get("text", "").strip()

        if text:
            context_lines.append(
                f"[{i}] Paper: {title}, Page: {page}\n{text}"
            )

    context = "\n\n".join(context_lines)

    return f"""You are PaperPilot, a research assistant that answers
questions using uploaded research papers.

STRICT RULES:
1. Use only the evidence in the passages below.
2. Cite factual claims using passage labels such as [1] and [2].
3. Never invent paper contents, results, statistics, or citations.
4. If evidence partially answers the question, explain what is known
   and explicitly identify what is missing.
5. If the passages do not contain evidence that answers the question,
   respond exactly:
   "{INSUFFICIENT_EVIDENCE}"
6. Do not use outside knowledge to fill evidence gaps.
7. Answer clearly and directly.

UPLOADED PAPER PASSAGES:
{context}

QUESTION:
{query}

ANSWER:"""


def answer_question(query, chunks, method="hybrid"):
    """
    Retrieve passages and generate an evidence-grounded answer.

    Returns:
        answer: Generated answer or an insufficient-evidence message.
        sufficient: Whether the answer contains a substantive response.
        sources: Retrieved passages with their scores and metadata.
    """
    if not isinstance(query, str) or not query.strip():
        return {
            "answer": "Please enter a question.",
            "sufficient": False,
            "sources": [],
        }

    if not chunks:
        return {
            "answer": INSUFFICIENT_EVIDENCE,
            "sufficient": False,
            "sources": [],
        }

    # Ignore malformed or empty chunks before retrieval.
    valid_chunks = [
        chunk for chunk in chunks
        if isinstance(chunk, dict)
        and isinstance(chunk.get("text"), str)
        and chunk["text"].strip()
    ]

    if not valid_chunks:
        return {
            "answer": (
                "No readable text was extracted from the uploaded papers. "
                "Try a text-based PDF or OCR for scanned PDFs."
            ),
            "sufficient": False,
            "sources": [],
        }

    try:
        top_chunks = retrieve(
            query=query.strip(),
            chunks=valid_chunks,
            k=5,
            method=method,
        )
    except Exception as exc:
        # Log the real error in the backend terminal for debugging.
        print(f"[RAG] Retrieval failed: {type(exc).__name__}: {exc}")
        raise

    if not top_chunks:
        return {
            "answer": INSUFFICIENT_EVIDENCE,
            "sufficient": False,
            "sources": [],
        }

    # TF-IDF and BM25 can return zero-score results when no query
    # terms match. Do not send those results to the LLM as evidence.
    if method in ("tfidf", "bm25"):
        if not any(result["score"] > 0 for result in top_chunks):
            return {
                "answer": INSUFFICIENT_EVIDENCE,
                "sufficient": False,
                "sources": [],
            }

    # IMPORTANT:
    # Do not apply the old 0.10 threshold to hybrid RRF scores.
    # RRF scores are normally around 0.01–0.03, even for top-ranked
    # results. Let the LLM assess whether the retrieved passages answer
    # the question rather than rejecting them using an incompatible scale.
    prompt = build_prompt(query.strip(), top_chunks)

    try:
        answer = call_llm(prompt)
    except Exception as exc:
        print(f"[RAG] LLM call failed: {type(exc).__name__}: {exc}")
        raise

    if not isinstance(answer, str) or not answer.strip():
        answer = INSUFFICIENT_EVIDENCE

    answer = answer.strip()

    # Check the standard fallback phrase without depending on case.
    insufficient = INSUFFICIENT_EVIDENCE.lower() in answer.lower()

    sources = []
    for result in top_chunks:
        chunk = result["chunk"]
        sources.append({
            "paper_title": chunk.get("paper_title", "Unknown paper"),
            "page": chunk.get("page", "Unknown"),
            "text": chunk.get("text", ""),
            "score": float(result.get("score", 0.0)),
        })

    return {
        "answer": answer,
        "sufficient": not insufficient,
        "sources": sources,
    }
