"""AEGIS — AI distress assistant API routes."""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.ai_service import classify_and_respond
from services.safeword import detect_safeword
from services.safe_places import (
    get_nearby_safe_places,
    pick_recommendation,
    direction_hint,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


class LocationDTO(BaseModel):
    latitude: float
    longitude: float
    accuracy: float | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    extra_safewords: list[str] = Field(default_factory=list)
    location: LocationDTO | None = None


class SafePlaceDTO(BaseModel):
    id: str
    name: str
    type: str
    distance_m: int
    bearing_deg: float
    direction: str
    latitude: float
    longitude: float
    open_now: bool
    vicinity: str | None = None
    priority: int


class ChatResponse(BaseModel):
    reply: str
    risk: Literal["low", "medium", "high"]
    actions: list[str] = []
    reassurance: str | None = None
    breathing: str | None = None
    safeword: bool = False
    safeword_phrase: str | None = None
    stealth_activate: bool = False
    nearby_places: list[SafePlaceDTO] = []
    recommended_place: SafePlaceDTO | None = None
    guidance: str | None = None


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest) -> ChatResponse:
    """Process a user utterance and return a calm, classified, location-aware response."""
    sw = detect_safeword(req.message, extra_safewords=req.extra_safewords)

    nearby_places = []
    nearby_dicts = []
    if req.location:
        try:
            places = await get_nearby_safe_places(req.location.latitude, req.location.longitude)
            nearby_dicts = [p.to_dict() for p in places[:6]]
            nearby_places = [SafePlaceDTO(**d) for d in nearby_dicts]
        except Exception as exc:  # pragma: no cover
            logger.warning("Safe-places lookup failed: %s", exc)

    if sw.matched:
        recommended_place = None
        guidance = None
        if nearby_places:
            from services.safe_places import SafePlace as _SP
            sp_objects = [
                _SP(  # type: ignore[arg-type]
                    id=p.id, name=p.name, type=p.type,  # type: ignore[arg-type]
                    distance_m=p.distance_m, bearing_deg=p.bearing_deg, direction=p.direction,
                    latitude=p.latitude, longitude=p.longitude, open_now=p.open_now,
                    vicinity=p.vicinity, priority=p.priority,
                ) for p in nearby_places
            ]
            picked = pick_recommendation(sp_objects, "high")
            if picked:
                recommended_place = SafePlaceDTO(**picked.to_dict())
                guidance = f"Walk toward {picked.name} — {direction_hint(picked)}. Stay in well-lit areas and on the main road."
        return ChatResponse(
            reply="Of course. I'm setting that up for you right now.",
            risk="high",
            actions=["activate_emergency_mode", "share_location", "contact_trusted_circle", "navigate_to_safe_place"],
            reassurance="Stay where you are. Help is on the way.",
            breathing="Slow breaths in through your nose, out through your mouth.",
            safeword=True,
            safeword_phrase=sw.safeword,
            stealth_activate=True,
            nearby_places=nearby_places,
            recommended_place=recommended_place,
            guidance=guidance,
        )

    try:
        history = [m.model_dump() for m in req.history]
        context = {
            "location": req.location.model_dump() if req.location else None,
            "nearby_places": nearby_dicts,
        }
        result = await classify_and_respond(req.session_id, req.message, history, context)
    except Exception as exc:  # pragma: no cover
        logger.exception("AI chat failed: %s", exc)
        raise HTTPException(status_code=500, detail="AI is temporarily unavailable.")

    # Resolve recommended_place from id (or fallback heuristic).
    recommended: SafePlaceDTO | None = None
    if result.recommended_place_id:
        for p in nearby_places:
            if p.id == result.recommended_place_id:
                recommended = p
                break
    if recommended is None and nearby_places and result.risk in ("medium", "high"):
        from services.safe_places import SafePlace as _SP
        sp_objects = [
            _SP(  # type: ignore[arg-type]
                id=p.id, name=p.name, type=p.type,  # type: ignore[arg-type]
                distance_m=p.distance_m, bearing_deg=p.bearing_deg, direction=p.direction,
                latitude=p.latitude, longitude=p.longitude, open_now=p.open_now,
                vicinity=p.vicinity, priority=p.priority,
            ) for p in nearby_places
        ]
        picked = pick_recommendation(sp_objects, result.risk)
        if picked:
            recommended = SafePlaceDTO(**picked.to_dict())

    return ChatResponse(
        reply=result.reply,
        risk=result.risk,
        actions=list(result.actions),
        reassurance=result.reassurance,
        breathing=result.breathing,
        safeword=False,
        safeword_phrase=None,
        stealth_activate=False,
        nearby_places=nearby_places,
        recommended_place=recommended,
        guidance=result.guidance,
    )


class SafewordCheckRequest(BaseModel):
    text: str
    extra_safewords: list[str] = Field(default_factory=list)


class SafewordCheckResponse(BaseModel):
    matched: bool
    safeword: str | None
    score: float


@router.post("/safeword/check", response_model=SafewordCheckResponse)
async def safeword_check(req: SafewordCheckRequest) -> SafewordCheckResponse:
    sw = detect_safeword(req.text, extra_safewords=req.extra_safewords)
    return SafewordCheckResponse(matched=sw.matched, safeword=sw.safeword, score=sw.score)


class SafePlacesRequest(BaseModel):
    latitude: float
    longitude: float
    radius_m: int = 1200


class SafePlacesResponse(BaseModel):
    places: list[SafePlaceDTO]


@router.post("/safe-places", response_model=SafePlacesResponse)
async def safe_places(req: SafePlacesRequest) -> SafePlacesResponse:
    places = await get_nearby_safe_places(req.latitude, req.longitude, req.radius_m)
    return SafePlacesResponse(places=[SafePlaceDTO(**p.to_dict()) for p in places])


@router.get("/health")
async def ai_health() -> dict[str, str]:
    return {"status": "ok", "module": "ai-distress-intelligence"}
