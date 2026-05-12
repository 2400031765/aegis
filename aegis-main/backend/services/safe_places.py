"""
Safe Places service
===================
Provides nearby "safe" points-of-interest around a user lat/lon.

Currently uses a deterministic mock dataset generated from the user's
coordinates so the experience feels real without needing a Google Places API
key. The architecture is intentionally async + provider-shaped so a real
Google Places / OSM Overpass / HERE provider can be plugged in later
without changing the route layer.
"""

from __future__ import annotations

import hashlib
import math
import os
import random
from dataclasses import dataclass
from typing import Iterable, Literal, Optional

SafePlaceType = Literal[
    "police",
    "hospital",
    "pharmacy",
    "metro",
    "store_24_7",
    "shelter",
    "public_area",
    "fire_station",
]


@dataclass
class SafePlace:
    id: str
    name: str
    type: SafePlaceType
    distance_m: int
    bearing_deg: float  # 0=N, 90=E, 180=S, 270=W
    direction: str  # cardinal hint, e.g. "NE", "S"
    latitude: float
    longitude: float
    open_now: bool = True
    vicinity: Optional[str] = None
    priority: int = 0  # higher = better recommendation

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "distance_m": self.distance_m,
            "bearing_deg": round(self.bearing_deg, 1),
            "direction": self.direction,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "open_now": self.open_now,
            "vicinity": self.vicinity,
            "priority": self.priority,
        }


# ----- helpers ---------------------------------------------------------------
EARTH_R = 6371000.0  # meters


def _bearing_to_cardinal(bearing: float) -> str:
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = int(((bearing % 360) + 22.5) // 45) % 8
    return dirs[idx]


def _move(lat: float, lon: float, distance_m: float, bearing_deg: float) -> tuple[float, float]:
    """Move ``distance_m`` from (lat, lon) along ``bearing_deg``."""
    lat_r = math.radians(lat)
    lon_r = math.radians(lon)
    bearing_r = math.radians(bearing_deg)
    ang = distance_m / EARTH_R
    new_lat_r = math.asin(
        math.sin(lat_r) * math.cos(ang)
        + math.cos(lat_r) * math.sin(ang) * math.cos(bearing_r)
    )
    new_lon_r = lon_r + math.atan2(
        math.sin(bearing_r) * math.sin(ang) * math.cos(lat_r),
        math.cos(ang) - math.sin(lat_r) * math.sin(new_lat_r),
    )
    return math.degrees(new_lat_r), math.degrees(new_lon_r)


# ----- mock dataset ----------------------------------------------------------
TYPE_NAMES: dict[SafePlaceType, list[str]] = {
    "police": ["Sector Police Station", "City Police Outpost", "Beat Patrol Station"],
    "hospital": ["LifeCare Hospital", "Apollo Emergency", "Sunrise Multi-Speciality"],
    "pharmacy": ["MedPlus 24/7", "Apollo Pharmacy", "Wellness Forever"],
    "metro": ["Central Metro Station", "City Junction Metro", "Park Avenue Metro"],
    "store_24_7": ["7-Eleven", "Reliance Smart 24/7", "More Quick Stop"],
    "shelter": ["Community Safe Shelter", "Women’s Help Shelter"],
    "public_area": ["High Street Plaza", "Main Square", "Market Bazaar"],
    "fire_station": ["Sector Fire Station"],
}

# Priorities: higher = better recommendation in distress
TYPE_PRIORITIES: dict[SafePlaceType, int] = {
    "police": 100,
    "hospital": 95,
    "fire_station": 80,
    "metro": 70,
    "public_area": 65,
    "store_24_7": 55,
    "pharmacy": 50,
    "shelter": 90,
}


def _seeded_random(latitude: float, longitude: float) -> random.Random:
    key = f"{round(latitude, 4)}|{round(longitude, 4)}"
    digest = hashlib.sha256(key.encode()).digest()
    seed = int.from_bytes(digest[:8], "big")
    return random.Random(seed)


def _mock_places(latitude: float, longitude: float, max_radius_m: int = 1200) -> list[SafePlace]:
    rnd = _seeded_random(latitude, longitude)
    types: list[SafePlaceType] = [
        "police", "hospital", "pharmacy", "metro",
        "store_24_7", "public_area", "shelter", "fire_station",
    ]
    rnd.shuffle(types)

    places: list[SafePlace] = []
    for i, ptype in enumerate(types):
        # Distance buckets: closer = higher priority types
        base = TYPE_PRIORITIES[ptype]
        bias = max(80, 1200 - base * 8)
        distance = int(rnd.uniform(80, min(max_radius_m, bias + 400)))
        bearing = rnd.uniform(0, 360)
        plat, plon = _move(latitude, longitude, distance, bearing)
        name_pool = TYPE_NAMES[ptype]
        name = rnd.choice(name_pool)

        places.append(
            SafePlace(
                id=f"sp-{i}-{abs(hash((ptype, latitude, longitude))) % 10_000:04d}",
                name=name,
                type=ptype,
                distance_m=distance,
                bearing_deg=bearing,
                direction=_bearing_to_cardinal(bearing),
                latitude=plat,
                longitude=plon,
                open_now=True,
                vicinity=f"{distance} m {_bearing_to_cardinal(bearing)} of you",
                priority=TYPE_PRIORITIES[ptype],
            )
        )
    # Sort: closest of high-priority first, then by distance overall.
    places.sort(key=lambda p: (-p.priority + p.distance_m / 50, p.distance_m))
    return places


# ----- public API ------------------------------------------------------------
class SafePlacesProvider:
    async def nearby(self, latitude: float, longitude: float, radius_m: int = 1200) -> list[SafePlace]:  # noqa: D401
        raise NotImplementedError


class MockSafePlacesProvider(SafePlacesProvider):
    async def nearby(self, latitude: float, longitude: float, radius_m: int = 1200) -> list[SafePlace]:
        return _mock_places(latitude, longitude, radius_m)


# Singleton (swap for a real provider later by switching the env var)
_provider: SafePlacesProvider | None = None


def get_provider() -> SafePlacesProvider:
    global _provider
    if _provider is None:
        # When AEGIS_SAFE_PLACES_PROVIDER=google we'd construct a Google Places
        # provider. For now we always use the mock provider.
        _ = os.environ.get("AEGIS_SAFE_PLACES_PROVIDER", "mock")
        _provider = MockSafePlacesProvider()
    return _provider


async def get_nearby_safe_places(latitude: float, longitude: float, radius_m: int = 1200) -> list[SafePlace]:
    provider = get_provider()
    return await provider.nearby(latitude, longitude, radius_m)


def pick_recommendation(places: Iterable[SafePlace], risk: str) -> Optional[SafePlace]:
    """Pick the best place to recommend given the current risk level."""
    items = list(places)
    if not items:
        return None
    if risk == "high":
        # Prefer police / hospital / fire_station within 800m
        urgent = [p for p in items if p.type in ("police", "hospital", "fire_station") and p.distance_m <= 800]
        if urgent:
            return min(urgent, key=lambda p: p.distance_m)
    if risk == "medium":
        # Prefer crowded / 24/7 spots within 600m
        crowded = [p for p in items if p.type in ("public_area", "metro", "store_24_7") and p.distance_m <= 600]
        if crowded:
            return min(crowded, key=lambda p: p.distance_m)
    # Default: closest high-priority
    return items[0]


def direction_hint(place: SafePlace) -> str:
    return f"{place.distance_m} m to your {place.direction}"
