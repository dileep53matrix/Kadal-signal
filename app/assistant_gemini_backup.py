"""Kadal Signal AI assistant powered by the Google Gemini API.

The API key is read only from GEMINI_API_KEY on the server.
This module supplies a compact, read-only snapshot of Kadal Signal data.
It does not make sailing-safety decisions.
"""
import json
import os
import re
import threading
import time

from google import genai
from google.genai import types

from contribute import ApiError, list_sites
import lights


MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
MAX_MESSAGE_CHARS = 1200
MAX_HISTORY_TURNS = 4
MAX_HISTORY_CHARS = 350
MAX_OUTPUT_TOKENS = 350
GEMINI_TIMEOUT_MS = 20000

_client = None
_client_lock = threading.Lock()

_rate_lock = threading.Lock()
_rate_events = {}
RATE_LIMIT = 12
RATE_WINDOW_SECONDS = 60

SYSTEM_INSTRUCTION = """
You are Kadal Assistant, a helpful guide for coastal fishing communities in
Karnataka. Reply in the language the user uses. Support Kannada and English.

Use only the supplied Kadal Signal data for current site forecasts, signal
states, and official alert status. Do not invent values, timestamps, warnings,
facilities, or sources. If no centre is identified, ask which landing centre.

SAFETY:
- You are not an official authority and never give sailing clearance or say
  that it is safe to sail.
- An unknown official alert status does NOT mean there is no warning.
- App colours and wave thresholds are prototype decision-support indicators,
  not validated safety standards.
- Distinguish live, cached, stale, and missing data.
- If amber is caused by an unknown official alert, explain that this is
  uncertainty, not proof that conditions are dangerous.
- Community reports are user-submitted and identities are not independently
  verified. Matching reports show agreement only; conflicts remain conflicts.
- Direct users to current INCOIS and local fisheries authority notices.
Keep answers short, calm, practical, and easy to understand.
""".strip()


def _get_client():
    global _client
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise ApiError(503, "AI assistant is not configured: GEMINI_API_KEY is missing")
    with _client_lock:
        if _client is None:
            # Bound each provider request so the website cannot wait indefinitely.
            _client = genai.Client(
                api_key=key,
                http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS),
            )
    return _client


def _rate_limit(client_ip):
    now = time.monotonic()
    with _rate_lock:
        events = [t for t in _rate_events.get(client_ip, []) if now - t < RATE_WINDOW_SECONDS]
        if len(events) >= RATE_LIMIT:
            raise ApiError(429, "too many assistant requests; please wait a minute")
        events.append(now)
        _rate_events[client_ip] = events


def _normalise_history(history):
    if not isinstance(history, list):
        return []
    clean = []
    for item in history[-MAX_HISTORY_TURNS:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        text = item.get("text")
        if role not in ("user", "assistant") or not isinstance(text, str):
            continue
        text = text.strip()[:MAX_HISTORY_CHARS]
        if text:
            clean.append((role, text))
    return clean


def _site_context(con, question):
    sites = list_sites(con)
    q = question.casefold()
    words = [
        w for w in re.findall(r"[a-z0-9-]{3,}", q)
        if w not in {
            "what", "where", "when", "wave", "height", "signal", "status",
            "tell", "about", "please", "current", "forecast", "hello",
            "hii", "hey", "explain", "simple",
        }
    ]

    matched = []
    for site in sites:
        fields = [
            str(site.get("id") or ""),
            str(site.get("cmfri_code") or ""),
            str(site.get("name") or ""),
            str(site.get("name_kn") or ""),
            str(site.get("district") or ""),
        ]
        searchable = " ".join(fields).casefold()
        score = 0
        for field in fields:
            value = field.strip().casefold()
            if value and len(value) >= 3 and value in q:
                score += 3
        score += sum(1 for word in words if word in searchable)
        if score:
            matched.append((score, site))

    matched.sort(key=lambda pair: pair[0], reverse=True)
    chosen = [site for _, site in matched[:3]]
    if not chosen:
        # Greetings/general questions need no large site directory payload.
        chosen = []

    site_rows = []
    for site in chosen:
        row = {
            "id": site.get("id"),
            "name": site.get("name"),
            "name_kn": site.get("name_kn"),
            "district": site.get("district"),
        }
        signal = site.get("signal")
        if isinstance(signal, dict):
            # Keep only the fields most useful to a short explanation.
            row["signal"] = {
                k: signal.get(k) for k in (
                    "status", "colour", "color", "wave_height_m",
                    "wave_m", "source", "updated_at", "forecast_time",
                    "reason", "confidence_label",
                ) if k in signal
            }
        reports = site.get("reports")
        if isinstance(reports, dict):
            row["community_reports"] = {
                k: reports.get(k) for k in (
                    "status", "counted", "total", "matching_reports"
                ) if k in reports
            }
        site_rows.append(row)

    snapshot = {
        "official_alert": lights.get_alert(con),
        "matching_site_count": len(matched),
        "sites": site_rows,
    }
    return json.dumps(snapshot, ensure_ascii=False, default=str)[:6000]


def answer(con, payload, client_ip="unknown"):
    if not isinstance(payload, dict):
        raise ApiError(400, "request must be a JSON object")

    message = payload.get("message")
    if not isinstance(message, str) or not message.strip():
        raise ApiError(400, "message is required")
    message = message.strip()
    if len(message) > MAX_MESSAGE_CHARS:
        raise ApiError(413, f"message must be {MAX_MESSAGE_CHARS} characters or fewer")

    _rate_limit(client_ip)
    client = _get_client()
    context = _site_context(con, message)
    history = _normalise_history(payload.get("history"))

    conversation = [
        "CURRENT KADAL SIGNAL DATA SNAPSHOT (read-only):",
        context,
        "RECENT CONVERSATION:",
    ]
    for role, text in history:
        conversation.append(("User: " if role == "user" else "Assistant: ") + text)
    conversation.extend(["User's latest question:", message])

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents="\n".join(conversation),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.25,
                max_output_tokens=MAX_OUTPUT_TOKENS,
            ),
        )
        reply = (response.text or "").strip()
        if not reply:
            raise RuntimeError("Gemini returned an empty response")
        return {
            "reply": reply[:4000],
            "language": "kn" if re.search(r"[\u0C80-\u0CFF]", message) else "auto",
            "model": MODEL,
            "disclaimer": "Information support only; not an official advisory or sailing clearance.",
        }
    except ApiError:
        raise
    except Exception as exc:
        # Log only the exception class; never log keys or provider request contents.
        print("Kadal Assistant provider error:", type(exc).__name__, flush=True)
        raise ApiError(502, "AI assistant is temporarily unavailable. Please try again.")
