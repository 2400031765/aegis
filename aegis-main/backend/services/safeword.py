"""
Safeword / Whisper Mode detector
================================
Hidden trigger phrases the user can speak (or type) to silently activate
Smart Emergency Mode without revealing the alert. The detector uses fuzzy /
flexible matching so the user does not need to recite an exact phrase.

Default safeword catalog is intentionally generic / mundane — easy to recall
under pressure but unlikely to appear in casual conversation.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Iterable

DEFAULT_SAFEWORDS: tuple[str, ...] = (
    "aegis help",
    "aegis save me",
    "call aunt maya",
    "i forgot my blue notebook",
    "blue notebook",
    "grandma's recipe",
    "please call my taxi",
    "where is my jacket",
    "operation cobalt",
)

# Token sets so partial / reordered matches still trigger.
_SAFEWORD_TOKENS: list[set[str]] = []


def _normalise(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tokens(text: str) -> set[str]:
    return set(t for t in _normalise(text).split() if len(t) > 1)


def _build_index(safewords: Iterable[str]) -> list[set[str]]:
    return [_tokens(s) for s in safewords if s.strip()]


_SAFEWORD_TOKENS = _build_index(DEFAULT_SAFEWORDS)


@dataclass
class SafewordMatch:
    matched: bool
    safeword: str | None = None
    score: float = 0.0


def detect_safeword(
    text: str,
    extra_safewords: Iterable[str] | None = None,
    threshold: float = 0.7,
) -> SafewordMatch:
    """Return a SafewordMatch if the input text is likely a stealth trigger.

    Matching strategy:
    1. Substring match on the normalised string -> immediate match.
    2. Token Jaccard similarity against each safeword token-set -> match if
       similarity >= ``threshold`` AND at least 2 tokens overlap.
    """
    if not text or not text.strip():
        return SafewordMatch(False)

    normalised = _normalise(text)
    user_tokens = _tokens(text)

    candidate_phrases = list(DEFAULT_SAFEWORDS) + list(extra_safewords or [])
    candidate_token_sets = _SAFEWORD_TOKENS + _build_index(extra_safewords or [])

    # 1. Direct substring
    for phrase in candidate_phrases:
        if _normalise(phrase) in normalised:
            return SafewordMatch(True, phrase, 1.0)

    # 2. Fuzzy token overlap
    best_score = 0.0
    best_phrase: str | None = None
    for phrase, tokens in zip(candidate_phrases, candidate_token_sets):
        if not tokens:
            continue
        overlap = len(tokens & user_tokens)
        if overlap < 2:
            continue
        union = len(tokens | user_tokens)
        score = overlap / union if union else 0.0
        if score > best_score:
            best_score = score
            best_phrase = phrase

    if best_phrase and best_score >= threshold:
        return SafewordMatch(True, best_phrase, best_score)
    return SafewordMatch(False, best_phrase, best_score)
