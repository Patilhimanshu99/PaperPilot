
"""
ingest.py — Extract text from PDFs and split it into overlapping chunks.

Each chunk contains:
    chunk_id
    paper_title
    page
    text
"""

import os
import re

import pymupdf as fitz


def clean_text(text):
    """Normalize whitespace in extracted PDF text."""
    if not text:
        return ""

    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def split_into_chunks(
    text,
    page_num,
    paper_title,
    chunk_size=200,
    overlap=40,
):
    """Split page text into overlapping word-based chunks."""
    text = clean_text(text)

    if not text:
        return []

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be non-negative and smaller than chunk_size."
        )

    words = text.split()
    chunks = []

    step = chunk_size - overlap

    for chunk_index, start in enumerate(
        range(0, len(words), step)
    ):
        chunk_words = words[start:start + chunk_size]

        if not chunk_words:
            continue

        chunk_text = " ".join(chunk_words)

        chunks.append({
            "chunk_id": (
                f"{paper_title}_p{page_num}_c{chunk_index}"
            ),
            "paper_title": paper_title,
            "page": page_num,
            "text": chunk_text,
        })

    return chunks


def ingest_pdf(pdf_path):
    """Extract readable text from a PDF and return its chunks."""
    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(
            f"PDF file does not exist: {pdf_path}"
        )

    paper_title = os.path.basename(pdf_path)
    all_chunks = []

    try:
        doc = fitz.open(pdf_path)
    except Exception as exc:
        raise ValueError(
            f"Could not open PDF '{paper_title}': {exc}"
        ) from exc

    try:
        if doc.is_encrypted:
            raise ValueError(
                f"PDF '{paper_title}' is encrypted and may require a password."
            )

        for page_num, page in enumerate(doc, start=1):
            # Extract ordinary selectable text.
            text = page.get_text("text")
            text = clean_text(text)

            # Ignore blank pages and pages with very little text.
            if len(text.split()) < 10:
                continue

            page_chunks = split_into_chunks(
                text=text,
                page_num=page_num,
                paper_title=paper_title,
                chunk_size=200,
                overlap=40,
            )

            all_chunks.extend(page_chunks)

    finally:
        doc.close()

    if not all_chunks:
        print(
            f"[Ingestion] WARNING: No readable text found in "
            f"'{paper_title}'. If it is a scanned PDF, OCR may be needed."
        )
    else:
        print(
            f"[Ingestion] {paper_title}: "
            f"{len(all_chunks)} chunks extracted."
        )

    return all_chunks


def ingest_all(pdf_paths):
    """Ingest multiple PDF files and combine their chunks."""
    all_chunks = []

    if not pdf_paths:
        print("[Ingestion] No PDF files were provided.")
        return all_chunks

    for path in pdf_paths:
        try:
            chunks = ingest_pdf(path)
            all_chunks.extend(chunks)
        except Exception as exc:
            # Keep processing other papers if one file fails.
            print(
                f"[Ingestion] Failed to process '{path}': "
                f"{type(exc).__name__}: {exc}"
            )

    print(
        f"[Ingestion] Total chunks extracted: {len(all_chunks)}"
    )

    return all_chunks
