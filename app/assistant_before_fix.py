"""Kadal Signal AI assistant powered by the Google Gemini API.

The API key is read only from GEMINI_API_KEY on the server.
This module supplies a compact, read-only snapshot of Kadal Signal data
to Gemini. It does not make sailing-safety decisions.
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
MAX_HISTORY_TURNS = 6
MAX_HISTORY_CHARS = 500
MAX_OUTPUT_TOKENS = 500

_client = None
_client_lock = threading.Lock()

_rate_lock = threading.Lock()
_rate_events = {}
RATE_LIMIT = 12
RATE_WINDOW_SECONDS = 60

SYSTEM_INSTRUCTION = """
You are Kadal Assistant, a helpful guide for coastal fishing communities in
Karnataka. Reply in the language the user uses. Support Kannada and English;
if the user writes in another language, try to reply in that language simply.

You explain how to use Kadal Signal and explain only the supplied Kadal Signal
data. Treat the data snapshot as the only source for current site forecasts,
signal states, and official alert status. Do not invent values, timestamps,
warnings, facilities, or sources. If the requested centre is not identified
or the relevant value is absent, say so and ask which landing centre they mean.

CRITICAL SAFETY:
- You are an information assistant, not an official authority or sailing
  clearance service. Never say that it is safe to sail or give permission to sail.
- Never turn a green/amber/red/grey application signal into a sailing instruction.
- An unknown official alert status does NOT mean there is no warning.
- Explain that users must check current official notices from INCOIS and local
  fisheries authorities before making decisions.
- Wave thresholds and app colours are prototype decision-support indicators,
  not validated safety standards.
- Distinguish live, cached, and stale data exactly as supplied. Mention missing
  or old data and its timestamp/age when available.
- If a signal is amber because the official alert is unknown, explain that the
  uncertainty is the reason, not proof that conditions are dangerous.
- Community reports are user-submitted and are not independently identity
  verified. Matching reports show agreement only; conflicting reports must be
  described as conflicting.
- Do not provide emergency rescue instructions beyond advising the user to
  contact local emergency services/coast guard/fisheries authorities.
Keep answers short, calm, practical, and easy to understand.
""".strip()


def _get_client():
    global _client
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise ApiError(503, "AI assistant is not configured: GEMINI_API_KEY is missing")
    with _client_lock:
        if _client is None:
            _client = genai.Client(api_key=key)
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
        # Match meaningful words from the question against site metadata.
        words = [w for w in re.findall(r"[a-z0-9-]{3,}", q) if w not in {
            "what", "where", "when", "wave", "height", "signal", "status",
            "tell", "about", "please", "current", "forecast", "ಇಂದು",
        }]
        score += sum(1 for word in words if word in searchable)
        if score:
            matched.append((score, site))
    matched.sort(key=lambda pair: pair[0], reverse=True)

    # A named centre gets priority. If none is identified, show a short
    # directory so the assistant can ask the user to specify a centre.
    chosen = [site for _, site in matched[:4]]
    if not chosen:
        chosen = sites[:8]

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
            row["signal"] = signal
        reports = site.get("reports")
        if isinstance(reports, dict):
            row["community_reports"] = {
                k: reports.get(k)
                for k in ("status", "counted", "total", "matching_reports")
                if k in reports
            }
        facilities = site.get("facilities")
        if isinstance(facilities, dict):
            row["listed_facilities_unverified"] = facilities
        site_rows.append(row)

    alert = lights.get_alert(con)
    snapshot = {
        "official_alert": alert,
        "matching_site_count": len(matched),
        "sites": site_rows,
        "site_selection_note": (
            "Question matched named site(s)." if matched
            else "No specific site matched; listed sites are only examples. Ask the user to name a landing centre before explaining its forecast."
        ),
    }
    return json.dumps(snapshot, ensure_ascii=False, default=str)[:18000]


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
        "CURRENT KADAL SIGNAL DATA SNAPSHOT (read-only; may contain unknown or cached values):",
        context,
        "",
        "RECENT CONVERSATION:",
    ]
    for role, text in history:
        conversation.append(("User: " if role == "user" else "Assistant: ") + text)
    conversation.extend(["", "User's latest question:", message])

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
        text = (response.text or "").strip()
        if not text:
            raise RuntimeError("Gemini returned an empty response")
        return {
            "reply": text[:5000],
            "language": "kn" if re.search(r"[\u0C80-\u0CFF]", message) else "auto",
            "model": MODEL,
            "disclaimer": "Information support only — not an official advisory or sailing clearance.",
        }
    except ApiError:
        raise
    except Exception:
        # Do not send API keys, provider details, or stack traces to the browser.
        raise ApiError(502, "AI assistant is temporarily unavailable. Please try again.")
