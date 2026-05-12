"""Real Google Gemma provider via the Google AI Studio (Generative Language) API.

This makes AEGIS run on a real, open-weight Gemma 3 instruction-tuned model.
The user supplies ``GEMMA_API_KEY`` in /app/backend/.env. The default model is
``gemma-3-27b-it`` — change with ``AEGIS_GEMMA_MODEL``.

If the key is missing, the wider AI service falls back to the Gemini provider
and finally to a local rule-based reply.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Iterable, Optional

import httpx

from prompts.aegis_system import AEGIS_SYSTEM_PROMPT
from utils.json_utils import coerce_json
from models.ai import AIReply, normalize_payload

logger = logging.getLogger(__name__)

GENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GemmaProvider:
    name = "gemma"

    def __init__(self, api_key: str, model: str = "gemma-3-27b-it"):
        self.api_key = api_key
        self.model = model

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def generate(
        self,
        session_id: str,
        user_text: str,
        history: Iterable[dict[str, str]],
        context: Optional[dict[str, Any]] = None,
    ) -> AIReply:
        ctx = context or {}
        location_block = ""
        if ctx.get("location"):
            loc = ctx["location"]
            location_block = (
                f"User live location: lat={loc.get('latitude')}, "
                f"lon={loc.get('longitude')}, accuracy={loc.get('accuracy')}m.\n"
            )
        places_block = ""
        if ctx.get("nearby_places"):
            lines = []
            for p in ctx["nearby_places"][:6]:
                lines.append(
                    f"- id={p['id']} type={p['type']} name=\"{p['name']}\" "
                    f"distance={p['distance_m']}m direction={p['direction']} "
                    f"open={p['open_now']}"
                )
            places_block = "Nearby safe places (closest first):\n" + "\n".join(lines) + "\n"

        memory_block = ctx.get("memory_summary") or ""

        history_block = ""
        hist = list(history)[-6:]
        if hist:
            lines = [
                ("USER" if h.get("role") == "user" else "AEGIS") + ": " + h.get("content", "")
                for h in hist
            ]
            history_block = "Recent conversation (oldest first):\n" + "\n".join(lines) + "\n"

        # Gemma instruction-tuned models do not have a dedicated "system"
        # role on the Google AI Studio API — we prepend the system prompt to
        # the first user turn.
        merged_user_prompt = (
            AEGIS_SYSTEM_PROMPT
            + "\n\n"
            + memory_block
            + history_block
            + location_block
            + places_block
            + f"\nNew user message: {user_text}\n\n"
            "Respond with STRICT JSON only as described above. "
            "If a relevant safe place applies, set recommendedPlaceId to one of the IDs."
        )

        url = f"{GENAI_BASE}/{self.model}:generateContent"
        params = {"key": self.api_key}
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": merged_user_prompt}]},
            ],
            "generationConfig": {
                "temperature": 0.4,
                "topP": 0.9,
                "maxOutputTokens": 600,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, params=params, json=payload)

        if resp.status_code >= 400:
            logger.warning("Gemma API error %s: %s", resp.status_code, resp.text[:300])
            raise RuntimeError(f"Gemma API {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError("Gemma returned no candidates")
        parts = (candidates[0].get("content") or {}).get("parts") or []
        raw_text = "".join(p.get("text", "") for p in parts)

        parsed = coerce_json(raw_text)
        if not parsed:
            raise RuntimeError(f"Gemma returned non-JSON: {raw_text[:200]}")

        return normalize_payload(parsed, raw=raw_text, provider=self.name)


def gemma_from_env() -> Optional[GemmaProvider]:
    key = os.environ.get("GEMMA_API_KEY", "").strip()
    if not key:
        return None
    model = os.environ.get("AEGIS_GEMMA_MODEL", "gemma-3-27b-it")
    return GemmaProvider(api_key=key, model=model)
