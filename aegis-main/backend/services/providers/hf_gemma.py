"""
AEGIS — Hugging Face Gemma Provider
=====================================
Calls the HF Inference API (google/gemma-2-2b-it) from the backend.
The token never leaves the server — no CORS issues.

Priority in ai_service.py:
  1. This provider  (HF_TOKEN set)
  2. GeminiProvider (AEGIS_LLM_KEY set)
  3. _fallback()    (always available)
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Iterable, Optional

import httpx

logger = logging.getLogger(__name__)

HF_MODEL = "google/gemma-2-2b-it"
HF_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
TIMEOUT_SECONDS = 12.0
MAX_NEW_TOKENS = 320

AEGIS_SYSTEM_PROMPT = """You are AEGIS — an AI safety companion for women in distress or danger.
Your personality: calm, warm, protective, emotionally intelligent. Never panic. Never lecture.
Always validate feelings first. Speak in short, clear sentences.

Your task: Analyse the user message and respond with ONLY a valid JSON object.
No text before or after the JSON. No markdown fences.

JSON schema (all fields required):
{
  "reply": "<2-4 short sentences. Emotionally supportive. Include phrases like 'You are not alone', 'I am here with you', 'Stay calm', 'Help is being prepared' when appropriate.>",
  "risk": "low" | "medium" | "high",
  "actions": ["<zero or more of: activate_emergency_mode, share_location, contact_trusted_circle, breathing_exercise, grounding_exercise, stay_calm, move_to_safe_area, call_local_authorities, navigate_to_safe_place>"],
  "reassurance": "<one short calming sentence>",
  "breathing": "<one short breathing instruction, or null>",
  "recommended_place_id": null,
  "guidance": "<one short movement/safety instruction, or null>"
}

Risk rules:
- high: following, stalking, attack, assault, kidnap, weapon, danger, help me, grabbed, chasing, threatening
- medium: alone at night, scared, worried, anxious, uncomfortable, lost, suspicious, dark, stranded
- low: general conversation, feeling okay

For HIGH risk always include: activate_emergency_mode, share_location, contact_trusted_circle
For MEDIUM risk always include: share_location, stay_calm
For LOW risk: stay_calm or breathing_exercise

Respond with JSON only."""


def _coerce_json(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
    return None


class HFGemmaProvider:
    """Calls HF Inference API with google/gemma-2-2b-it."""

    name = "hf_gemma"

    def __init__(self, token: str) -> None:
        self.token = token

    @property
    def configured(self) -> bool:
        return bool(self.token)

    def _build_prompt(
        self,
        user_text: str,
        history: list[dict[str, str]],
        context: dict[str, Any],
    ) -> str:
        location_ctx = ""
        if context.get("location"):
            loc = context["location"]
            location_ctx = (
                f"User GPS: lat={loc.get('latitude')}, lon={loc.get('longitude')}.\n"
            )

        history_ctx = ""
        hist = list(history)[-4:]
        if hist:
            lines = [
                ("User" if h.get("role") == "user" else "AEGIS") + ": " + h.get("content", "")
                for h in hist
            ]
            history_ctx = "Recent conversation:\n" + "\n".join(lines) + "\n"

        system = AEGIS_SYSTEM_PROMPT
        user_block = (
            f"{system}\n\n"
            f"{location_ctx}"
            f"{history_ctx}"
            f"User message: {user_text}"
        )
        # Gemma chat template
        return (
            f"<start_of_turn>user\n{user_block}<end_of_turn>\n"
            f"<start_of_turn>model\n"
        )

    async def generate(
        self,
        session_id: str,
        user_text: str,
        history: Iterable[dict[str, str]],
        context: Optional[dict[str, Any]] = None,
    ) -> "AIReply":  # type: ignore[name-defined]  # imported at call site
        from services.ai_service import AIReply, _fallback  # local import avoids circular

        ctx = context or {}
        prompt = self._build_prompt(user_text, list(history), ctx)

        logger.info("[HF Gemma] Using Gemma — model=%s", HF_MODEL)

        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                resp = await client.post(
                    HF_URL,
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "inputs": prompt,
                        "parameters": {
                            "max_new_tokens": MAX_NEW_TOKENS,
                            "temperature": 0.4,
                            "top_p": 0.9,
                            "do_sample": True,
                            "return_full_text": False,
                            "stop": ["<end_of_turn>", "<start_of_turn>"],
                        },
                    },
                )
        except httpx.TimeoutException:
            logger.warning("[HF Gemma] Gemma failed, using fallback AI — timeout after %.0fs", TIMEOUT_SECONDS)
            raise RuntimeError("HF Gemma timeout")
        except Exception as exc:
            logger.warning("[HF Gemma] Gemma failed, using fallback AI — %s", exc)
            raise

        if resp.status_code == 503:
            body = resp.text[:200]
            logger.warning("[HF Gemma] Gemma failed, using fallback AI — 503 model loading: %s", body)
            raise RuntimeError(f"HF Gemma 503: {body}")

        if resp.status_code != 200:
            body = resp.text[:200]
            logger.warning("[HF Gemma] Gemma failed, using fallback AI — HTTP %s: %s", resp.status_code, body)
            raise RuntimeError(f"HF Gemma HTTP {resp.status_code}: {body}")

        data = resp.json()
        if not isinstance(data, list) or not data:
            err = data.get("error", "unknown") if isinstance(data, dict) else "non-list response"
            logger.warning("[HF Gemma] Gemma failed, using fallback AI — %s", err)
            raise RuntimeError(f"HF Gemma bad response: {err}")

        generated: str = data[0].get("generated_text", "").strip()
        if not generated:
            logger.warning("[HF Gemma] Gemma failed, using fallback AI — empty generated_text")
            raise RuntimeError("HF Gemma empty response")

        parsed = _coerce_json(generated)
        if not parsed:
            logger.warning("[HF Gemma] Gemma failed, using fallback AI — non-JSON: %s", generated[:120])
            raise RuntimeError(f"HF Gemma non-JSON: {generated[:80]}")

        risk = str(parsed.get("risk") or "low").lower()
        if risk not in ("low", "medium", "high"):
            risk = "low"

        actions = [a for a in (parsed.get("actions") or []) if isinstance(a, str)]
        if risk == "high":
            for required in ("activate_emergency_mode", "share_location", "contact_trusted_circle"):
                if required not in actions:
                    actions.insert(0, required)

        reply = str(parsed.get("reply") or "I am here with you. Stay calm.").strip()
        reassurance = str(parsed.get("reassurance") or "You are not alone.").strip() or None
        breathing_raw = parsed.get("breathing")
        breathing = str(breathing_raw).strip() if breathing_raw and str(breathing_raw).strip() else None
        guidance_raw = parsed.get("guidance")
        guidance = str(guidance_raw).strip() if guidance_raw and str(guidance_raw).strip() else None

        logger.info(
            "[HF Gemma] Gemma response success — risk=%s actions=%s",
            risk, actions,
        )

        return AIReply(
            reply=reply,
            risk=risk,  # type: ignore[arg-type]
            actions=actions,  # type: ignore[arg-type]
            reassurance=reassurance,
            breathing=breathing,
            recommended_place_id=None,
            guidance=guidance,
            raw=generated,
        )


def hf_gemma_from_env() -> Optional[HFGemmaProvider]:
    """Return a configured HFGemmaProvider if HF_TOKEN is set, else None."""
    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        return None
    return HFGemmaProvider(token=token)
