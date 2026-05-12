"""Conversation memory & escalation logic.

AEGIS keeps lightweight, in-memory short-term context per session:
- last few user/assistant turns (already passed to the LLM)
- a "fear score" derived from emotional cues across turns

If the user keeps signalling distress, the escalation tracker bumps the
final risk level so the AI becomes more proactive turn over turn.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Iterable

# fear / panic / urgency cues — case-insensitive
_FEAR_TERMS = re.compile(
    r"\b(scared|afraid|fear|terrif|panic|help|hurt|alone|unsafe|danger|"
    r"follow|stalker|stalking|chasing|attack|knife|gun|weapon|threat|"
    r"hide|hiding|trapped|locked|please|please help|cant|can't|emergency)\b",
    re.IGNORECASE,
)


@dataclass
class SessionState:
    fear_count: int = 0
    last_risk: str = "low"
    turns: int = 0
    last_seen: float = field(default_factory=time.time)


_SESSIONS: dict[str, SessionState] = {}
_TTL_SECONDS = 30 * 60  # forget a session after 30 minutes of inactivity


def _gc() -> None:
    now = time.time()
    stale = [k for k, s in _SESSIONS.items() if now - s.last_seen > _TTL_SECONDS]
    for k in stale:
        _SESSIONS.pop(k, None)


def count_fear_cues(text: str) -> int:
    if not text:
        return 0
    return len(_FEAR_TERMS.findall(text))


def update_session(session_id: str, user_text: str, model_risk: str) -> SessionState:
    _gc()
    state = _SESSIONS.setdefault(session_id, SessionState())
    state.turns += 1
    state.last_risk = model_risk.lower()
    state.last_seen = time.time()
    state.fear_count += count_fear_cues(user_text)
    return state


def get_session(session_id: str) -> SessionState | None:
    return _SESSIONS.get(session_id)


def reset_session(session_id: str) -> None:
    _SESSIONS.pop(session_id, None)


def escalate_risk(session_id: str, base_risk: str, user_text: str) -> str:
    """Apply gradual escalation based on accumulated fear cues across turns."""
    cues = count_fear_cues(user_text)
    state = _SESSIONS.get(session_id)
    historical = state.fear_count if state else 0
    total = cues + historical

    base = base_risk.lower()
    # Hard floors based on cumulative cues
    if total >= 6:
        return "high"
    if total >= 3 and base == "low":
        return "medium"
    if total >= 5 and base == "medium":
        return "high"
    return base


def conversation_summary(session_id: str, history: Iterable[dict[str, str]]) -> str:
    """Compact summary the LLM sees before the new user message."""
    state = _SESSIONS.get(session_id)
    if state is None:
        return ""
    if state.turns == 0:
        return ""
    return (
        f"[Memory] turns={state.turns} cumulative_fear_cues={state.fear_count} "
        f"last_risk={state.last_risk}\n"
    )
