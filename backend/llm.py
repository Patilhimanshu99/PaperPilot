
"""
llm.py — Gemini API client for PaperPilot.
Retries temporary rate-limit and server errors with exponential backoff.
"""

import os
import time
import random

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/"
    f"models/{MODEL}:generateContent"
)

MAX_ATTEMPTS = 3
RETRYABLE_STATUSES = {429, 500, 502, 503, 504}
REQUEST_TIMEOUT_SECONDS = 25


def call_llm(prompt: str) -> str:
    """Generate an answer using Gemini with retry handling."""

    if not API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is missing from the backend .env file."
        )

    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
        },
    }

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
    }

    last_error = "Unknown Gemini error"

    with requests.Session() as session:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                response = session.post(
                    API_URL,
                    headers=headers,
                    json=payload,
                    timeout=REQUEST_TIMEOUT_SECONDS,
                )

                if response.ok:
                    data = response.json()
                    candidates = data.get("candidates", [])

                    if not candidates:
                        feedback = data.get("promptFeedback", {})
                        raise RuntimeError(
                            "Gemini returned no answer candidates. "
                            f"Feedback: {feedback}"
                        )

                    candidate = candidates[0]
                    content = candidate.get("content", {})
                    parts = content.get("parts", [])

                    answer = "\n".join(
                        part["text"]
                        for part in parts
                        if isinstance(part.get("text"), str)
                    ).strip()

                    if not answer:
                        finish_reason = candidate.get("finishReason")
                        raise RuntimeError(
                            "Gemini returned no text. "
                            f"Finish reason: {finish_reason}"
                        )

                    return answer

                try:
                    error_data = response.json()
                    message = error_data.get(
                        "error", {}
                    ).get("message", response.text)
                except ValueError:
                    message = response.text

                last_error = (
                    f"Gemini HTTP {response.status_code}: {message}"
                )

                if response.status_code not in RETRYABLE_STATUSES:
                    raise RuntimeError(last_error)

            except requests.RequestException as exc:
                last_error = f"Gemini connection error: {exc}"

            if attempt < MAX_ATTEMPTS:
                wait_seconds = min(2 ** attempt, 16)
                wait_seconds += random.uniform(0, 1)

                print(
                    f"[LLM] Attempt {attempt}/{MAX_ATTEMPTS} failed. "
                    f"Retrying in {wait_seconds:.1f}s. "
                    f"Reason: {last_error}"
                )
                time.sleep(wait_seconds)

    raise RuntimeError(
        f"Gemini failed after {MAX_ATTEMPTS} attempts. "
        f"Last error: {last_error}"
    )
