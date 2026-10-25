
"""
main.py — PaperPilot FastAPI backend.

Features:
- React/Vite CORS support
- PDF upload, ingestion, and startup reload
- List and delete uploaded papers
- RAG question answering
- Compare TF-IDF, BM25, Dense, and Hybrid retrieval
- Friendly API and Gemini error handling
"""

import logging
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ingest import ingest_pdf
from rag import answer_question
from retrieval import retrieve

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paperpilot")

app = FastAPI(
    title="PaperPilot API",
    description="Research paper question-answering with RAG",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
PAPERS_DIR = BASE_DIR / "data" / "papers"
PAPERS_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_SUFFIXES = {".pdf"}

# In-memory chunks are rebuilt from saved PDFs at startup.
chunks: list[dict] = []
paper_names: set[str] = set()

RETRIEVAL_METHODS = ("tfidf", "bm25", "dense", "hybrid")


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=5000)
    method: str = "hybrid"


class CompareRequest(BaseModel):
    question: str = Field(min_length=1, max_length=5000)


def reload_all_papers() -> None:
    """Rebuild the in-memory chunk collection from saved PDFs."""
    global chunks, paper_names

    new_chunks = []
    new_paper_names = set()

    pdf_paths = sorted(
        path
        for path in PAPERS_DIR.iterdir()
        if path.is_file() and path.suffix.lower() == ".pdf"
    )

    for pdf_path in pdf_paths:
        try:
            paper_chunks = ingest_pdf(str(pdf_path))

            if paper_chunks:
                new_chunks.extend(paper_chunks)
                new_paper_names.add(pdf_path.name)
            else:
                logger.warning(
                    "No readable text found in %s",
                    pdf_path.name,
                )
        except Exception:
            logger.exception(
                "Could not ingest saved PDF: %s",
                pdf_path.name,
            )

    chunks = new_chunks
    paper_names = new_paper_names

    logger.info(
        "Paper library loaded: %d papers, %d chunks",
        len(paper_names),
        len(chunks),
    )


@app.on_event("startup")
def startup_event():
    """Reload saved research papers when the API starts."""
    reload_all_papers()


def friendly_llm_error(exc: RuntimeError) -> HTTPException:
    """Convert known Gemini failures into user-friendly API errors."""
    message = str(exc)
    lowered = message.lower()

    if "gemini_api_key is missing" in lowered:
        return HTTPException(
            status_code=500,
            detail="Gemini API key is not configured on the backend.",
        )

    if "gemini http 429" in lowered:
        return HTTPException(
            status_code=503,
            detail="Gemini is rate-limited. Please try again shortly.",
            headers={"Retry-After": "10"},
        )

    if (
        "gemini http 503" in lowered
        or "gemini http 504" in lowered
    ):
        return HTTPException(
            status_code=503,
            detail="Gemini is temporarily busy. Please try again shortly.",
            headers={"Retry-After": "10"},
        )

    if (
        "gemini http 401" in lowered
        or "gemini http 403" in lowered
    ):
        return HTTPException(
            status_code=502,
            detail=(
                "Gemini rejected the request. Check the API key, "
                "model access, and API configuration."
            ),
        )

    if "gemini http 400" in lowered:
        return HTTPException(
            status_code=502,
            detail="Gemini rejected the request. Check the model and prompt.",
        )

    logger.error("LLM operation failed: %s", message)

    return HTTPException(
        status_code=502,
        detail="The AI service could not generate an answer.",
    )


def validate_question(question: str) -> str:
    question = question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Please enter a question.",
        )

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="Upload at least one readable research paper first.",
        )

    return question


def flatten_retrieval_results(results: list[dict]) -> list[dict]:
    """
    Convert retrieval.py's {chunk, score} format into the flat format
    expected by ComparePanel.jsx.
    """
    flattened = []

    for item in results:
        chunk = item.get("chunk", {})

        flattened.append({
            "chunk_id": chunk.get("chunk_id", ""),
            "paper_title": chunk.get("paper_title", "Unknown paper"),
            "page": chunk.get("page", "?"),
            "text": chunk.get("text", ""),
            "score": round(float(item.get("score", 0.0)), 6),
        })

    return flattened


@app.get("/")
def root():
    return {
        "name": "PaperPilot API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "loaded_chunks": len(chunks),
        "loaded_papers": len(paper_names),
    }


@app.get("/api/papers")
def list_papers():
    """Return saved PDF filenames, as expected by the frontend."""
    files = sorted(
        path.name
        for path in PAPERS_DIR.iterdir()
        if path.is_file() and path.suffix.lower() == ".pdf"
    )

    return {
        "papers": files,
        "count": len(files),
    }


@app.post("/api/papers")
async def upload_papers(files: list[UploadFile] = File(...)):
    """Save and ingest uploaded PDFs."""
    if not files:
        raise HTTPException(
            status_code=400,
            detail="Select at least one PDF file.",
        )

    uploaded = []
    errors = []
    changed_library = False

    for upload in files:
        filename = Path(upload.filename or "").name

        try:
            if not filename:
                errors.append("A file has no valid filename.")
                continue

            if Path(filename).suffix.lower() not in ALLOWED_SUFFIXES:
                errors.append(
                    f"{filename}: only PDF files are accepted."
                )
                continue

            content = await upload.read(MAX_UPLOAD_BYTES + 1)

            if not content:
                errors.append(f"{filename}: the file is empty.")
                continue

            if len(content) > MAX_UPLOAD_BYTES:
                errors.append(
                    f"{filename}: exceeds the 25 MB upload limit."
                )
                continue

            if not content.startswith(b"%PDF-"):
                errors.append(f"{filename}: invalid PDF file.")
                continue

            destination = PAPERS_DIR / filename

            # Preserve an existing file if replacement ingestion fails.
            previous_content = (
                destination.read_bytes()
                if destination.exists()
                else None
            )

            try:
                destination.write_bytes(content)
                extracted_chunks = ingest_pdf(str(destination))

                if not extracted_chunks:
                    raise ValueError(
                        "No readable text found. The PDF may be scanned "
                        "and may require OCR."
                    )

            except Exception as exc:
                if previous_content is not None:
                    destination.write_bytes(previous_content)
                else:
                    destination.unlink(missing_ok=True)

                logger.warning(
                    "Upload failed for %s: %s",
                    filename,
                    exc,
                )
                errors.append(f"{filename}: {exc}")
                continue

            changed_library = True
            uploaded.append({
                "filename": filename,
                "chunks": len(extracted_chunks),
            })

        finally:
            await upload.close()

    if changed_library:
        reload_all_papers()

    if not uploaded:
        raise HTTPException(
            status_code=400,
            detail=" ".join(errors) or "No PDFs were uploaded.",
        )

    return {
        "message": "Upload processing completed.",
        "uploaded": uploaded,
        "errors": errors,
        "total_uploaded": len(uploaded),
    }


@app.delete("/api/papers")
def delete_all_papers():
    """Delete all stored PDFs and clear the in-memory chunks."""
    global chunks, paper_names

    deleted = 0
    errors = []

    for pdf_path in PAPERS_DIR.iterdir():
        if not pdf_path.is_file() or pdf_path.suffix.lower() != ".pdf":
            continue

        try:
            pdf_path.unlink()
            deleted += 1
        except OSError:
            logger.exception("Could not delete %s", pdf_path.name)
            errors.append(pdf_path.name)

    # Rebuild state so any PDFs that could not be deleted remain available.
    reload_all_papers()

    if errors:
        raise HTTPException(
            status_code=500,
            detail="Could not delete: " + ", ".join(errors),
        )

    return {
        "message": "All papers cleared successfully.",
        "deleted": deleted,
        "papers": [],
        "count": 0,
    }


@app.post("/api/ask")
def ask(body: AskRequest):
    """Generate an answer using the selected retrieval method."""
    question = validate_question(body.question)

    if body.method.lower().strip() not in RETRIEVAL_METHODS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported retrieval method. Choose tfidf, bm25, "
                "dense, or hybrid."
            ),
        )

    try:
        return answer_question(
            question,
            chunks,
            method=body.method,
        )

    except RuntimeError as exc:
        raise friendly_llm_error(exc) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Unexpected error in /api/ask")
        raise HTTPException(
            status_code=500,
            detail="An unexpected backend error occurred.",
        ) from exc


@app.post("/api/compare")
def compare(body: CompareRequest):
    """
    Run the same question through all four retrieval methods.
    Returns top three passages per method in ComparePanel's expected format.
    """
    question = validate_question(body.question)

    results = {}

    for method in RETRIEVAL_METHODS:
        try:
            ranked = retrieve(
                query=question,
                chunks=chunks,
                k=3,
                method=method,
            )

            results[method] = flatten_retrieval_results(ranked)

        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Retrieval failed for {method}: {exc}",
            ) from exc

        except Exception as exc:
            logger.exception(
                "Comparison retrieval failed for %s",
                method,
            )
            raise HTTPException(
                status_code=500,
                detail=f"Could not run the {method} retrieval method.",
            ) from exc

    return results


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
