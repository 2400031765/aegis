/**
 * AEGIS Navigation Service
 * Generates Google Maps navigation links, directional guidance text,
 * and contextual safety messages from live GPS + nearby safe places.
 */

import { Platform, Linking } from 'react-native';
import type { SafePlace } from './ai';

// ─── Google Maps URL builders ────────────────────────────────────────────────

/**
 * Opens Google Maps turn-by-turn navigation from the user's current location
 * to the destination. Falls back to a search URL if coordinates are (0,0).
 */
export function buildMapsNavigationUrl(
  place: SafePlace,
  userLat?: number | null,
  userLon?: number | null,
): string {
  const hasRealCoords = place.latitude !== 0 || place.longitude !== 0;
  const hasUserCoords = userLat != null && userLon != null;

  if (hasRealCoords) {
    // Directions URL — works on all platforms via Google Maps
    const origin = hasUserCoords ? `${userLat},${userLon}` : '';
    const dest = `${place.latitude},${place.longitude}`;
    const label = encodeURIComponent(place.name);

    if (Platform.OS === 'ios') {
      // Apple Maps directions (preferred on iOS, falls back to Google)
      if (origin) {
        return `maps://?saddr=${origin}&daddr=${dest}&q=${label}`;
      }
      return `maps://?q=${label}&ll=${dest}`;
    }

    if (Platform.OS === 'android') {
      // Google Maps navigation intent
      if (origin) {
        return `google.navigation:q=${dest}&mode=w`;
      }
      return `geo:${dest}?q=${dest}(${label})`;
    }

    // Web / fallback — full Google Maps directions URL
    const base = 'https://www.google.com/maps/dir/';
    if (origin) {
      return `${base}${origin}/${dest}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${dest}`;
  }

  // No real coordinates — search by name
  const query = encodeURIComponent(place.name + (place.vicinity ? ` ${place.vicinity}` : ''));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Opens the navigation URL, with a Google Maps web fallback.
 */
export async function openNavigation(
  place: SafePlace,
  userLat?: number | null,
  userLon?: number | null,
): Promise<void> {
  const url = buildMapsNavigationUrl(place, userLat, userLon);
  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Always-available web fallback
    const fallback = place.latitude !== 0
      ? `https://www.google.com/maps/dir/${userLat ?? ''},${userLon ?? ''}/${place.latitude},${place.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
    await Linking.openURL(fallback);
  }
}

// ─── Directional guidance ────────────────────────────────────────────────────

/** Cardinal + intercardinal direction labels from bearing degrees */
export function bearingToDirection(deg: number): string {
  const dirs = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return dirs[idx];
}

/** Relative direction hint (ahead / behind / left / right) based on bearing */
export function bearingToRelative(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  if (norm <= 30 || norm >= 330) return 'ahead of you';
  if (norm > 30 && norm <= 90) return 'to your right';
  if (norm > 90 && norm <= 150) return 'behind and to your right';
  if (norm > 150 && norm <= 210) return 'behind you';
  if (norm > 210 && norm <= 270) return 'behind and to your left';
  return 'to your left';
}

/** Human-readable distance string */
export function formatDistance(meters: number): string {
  if (meters < 100) return `${meters} meters`;
  if (meters < 1000) return `${Math.round(meters / 50) * 50} meters`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Generates a specific, directional guidance sentence for a safe place.
 * e.g. "A police station is 320 meters to your right — head there now."
 */
export function buildDirectionalGuidance(place: SafePlace): string {
  const dist = formatDistance(place.distance_m);
  const rel = bearingToRelative(place.bearing_deg);
  const typeLabel = PLACE_TYPE_LABELS[place.type] ?? 'safe location';

  const templates = [
    `${capitalize(typeLabel)} is ${dist} ${rel} — head there now.`,
    `Move toward the ${typeLabel} ${dist} ${rel}. Stay on well-lit streets.`,
    `There is a ${typeLabel} ${dist} ${rel}. Walk steadily and stay visible.`,
  ];

  // Pick deterministically based on place id so it doesn't flicker
  const idx = (place.id.charCodeAt(place.id.length - 1) ?? 0) % templates.length;
  return templates[idx];
}

const PLACE_TYPE_LABELS: Record<string, string> = {
  police: 'police station',
  hospital: 'hospital',
  pharmacy: 'pharmacy',
  metro: 'metro station',
  store_24_7: '24/7 store',
  shelter: 'safe shelter',
  public_area: 'public area',
  fire_station: 'fire station',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Contextual safety message builder ───────────────────────────────────────

export interface SafetyContext {
  risk: 'low' | 'medium' | 'high';
  nearbyPlaces: SafePlace[];
  recommendedPlace: SafePlace | null;
  userLat?: number | null;
  userLon?: number | null;
}

/**
 * Builds a rich, intelligent AI reply that incorporates:
 * - Emotional calming support
 * - Specific directional guidance to the nearest safe place
 * - Location-sharing recommendation
 * - Contextual awareness of the situation
 */
export function buildIntelligentSafetyReply(ctx: SafetyContext): {
  reply: string;
  guidance: string | null;
  reassurance: string;
  breathing: string | null;
} {
  const { risk, nearbyPlaces, recommendedPlace } = ctx;
  const hasPlaces = nearbyPlaces.length > 0;
  const rec = recommendedPlace ?? nearbyPlaces[0] ?? null;

  // Emotional calming openers by risk level
  const calmingOpeners: Record<string, string[]> = {
    high: [
      "I'm right here with you. You are not alone.",
      "Stay calm — I am with you and help is being prepared.",
      "You are safe with AEGIS. I'm monitoring your situation right now.",
    ],
    medium: [
      "I hear you. Stay alert and keep moving toward safety.",
      "You're doing the right thing by reaching out. I'm here.",
      "Stay calm and aware. AEGIS is with you.",
    ],
    low: [
      "I'm here with you.",
      "AEGIS is monitoring your safety.",
      "You are not alone.",
    ],
  };

  const openers = calmingOpeners[risk] ?? calmingOpeners.low;
  const opener = openers[Math.floor(Math.random() * openers.length)];

  if (!hasPlaces || !rec) {
    // No location data — give general guidance
    const replies: Record<string, string> = {
      high: `${opener} Move toward a crowded, well-lit area immediately. Avoid isolated streets and alleys. Share your live location with a trusted contact now.`,
      medium: `${opener} Stay in well-lit, populated areas. Keep your phone visible and location sharing active.`,
      low: `${opener} AEGIS continues monitoring your safety.`,
    };
    return {
      reply: replies[risk] ?? replies.low,
      guidance: risk !== 'low' ? 'Move toward brighter, more populated areas and avoid isolated streets.' : null,
      reassurance: 'You are not alone. AEGIS is here with you.',
      breathing: risk === 'high' ? 'Breathe slowly — in for 4 counts, hold, out for 4 counts.' : null,
    };
  }

  // Build specific directional guidance
  const directional = buildDirectionalGuidance(rec);
  const dist = formatDistance(rec.distance_m);
  const typeLabel = PLACE_TYPE_LABELS[rec.type] ?? 'safe location';

  let reply = '';
  if (risk === 'high') {
    reply = `${opener} I've found a ${typeLabel} ${dist} away. ${directional} Share your live location with your trusted contacts now and keep moving.`;
  } else if (risk === 'medium') {
    reply = `${opener} There's a ${typeLabel} nearby — ${dist} ${bearingToRelative(rec.bearing_deg)}. Head there and stay on main roads.`;
  } else {
    reply = `${opener} I can see a ${typeLabel} ${dist} away if you need it.`;
  }

  // Add secondary place mention if available
  const secondary = nearbyPlaces.find((p) => p.id !== rec.id);
  if (secondary && risk !== 'low') {
    const secLabel = PLACE_TYPE_LABELS[secondary.type] ?? 'safe location';
    reply += ` There's also a ${secLabel} ${formatDistance(secondary.distance_m)} ${bearingToRelative(secondary.bearing_deg)}.`;
  }

  const guidance = `${directional} Stay on well-lit streets and avoid isolated areas.`;

  const reassurances = [
    'You are not alone. AEGIS is here with you.',
    'Stay calm — help is being prepared.',
    'I am monitoring your situation. Keep moving toward safety.',
    'You are doing the right thing. I am right here with you.',
  ];
  const reassurance = reassurances[Math.floor(Math.random() * reassurances.length)];

  const breathing = risk === 'high'
    ? 'Breathe slowly — in for 4 counts, hold, out for 4 counts. Keep moving.'
    : risk === 'medium'
    ? 'Take slow, steady breaths. Focus on moving toward the safe location.'
    : null;

  return { reply, guidance, reassurance, breathing };
}

// ─── Simulated nearby places (used in local fallback when no backend) ─────────

/**
 * Generates realistic simulated nearby safe places offset from the user's
 * real GPS coordinates. Used when the backend is unavailable.
 * Offsets are small (~200–800m) so they appear genuinely nearby.
 */
export function generateSimulatedNearbyPlaces(
  userLat: number,
  userLon: number,
): SafePlace[] {
  // Approx meters per degree at equator
  const mPerDegLat = 111_320;
  const mPerDegLon = 111_320 * Math.cos((userLat * Math.PI) / 180);

  const offsets: Array<{
    id: string;
    name: string;
    type: SafePlace['type'];
    dLat: number; // meters north (+) / south (-)
    dLon: number; // meters east (+) / west (-)
    priority: number;
    vicinity: string;
  }> = [
    { id: 'sim-police', name: 'Police Station', type: 'police', dLat: 180, dLon: 260, priority: 1, vicinity: 'Main Road' },
    { id: 'sim-hospital', name: 'General Hospital', type: 'hospital', dLat: -120, dLon: 480, priority: 2, vicinity: 'Hospital Road' },
    { id: 'sim-pharmacy', name: '24hr Pharmacy', type: 'pharmacy', dLat: 80, dLon: -150, priority: 3, vicinity: 'Market Street' },
    { id: 'sim-metro', name: 'Metro Station', type: 'metro', dLat: -300, dLon: 200, priority: 4, vicinity: 'Transit Hub' },
    { id: 'sim-store', name: '24/7 Convenience Store', type: 'store_24_7', dLat: 50, dLon: 90, priority: 5, vicinity: 'High Street' },
    { id: 'sim-public', name: 'Public Square', type: 'public_area', dLat: -60, dLon: -220, priority: 6, vicinity: 'City Centre' },
  ];

  return offsets.map((o) => {
    const lat = userLat + o.dLat / mPerDegLat;
    const lon = userLon + o.dLon / mPerDegLon;
    const distance_m = Math.round(Math.sqrt(o.dLat ** 2 + o.dLon ** 2));
    const bearing_deg = (Math.atan2(o.dLon, o.dLat) * 180) / Math.PI;
    const normBearing = ((bearing_deg % 360) + 360) % 360;

    return {
      id: o.id,
      name: o.name,
      type: o.type,
      distance_m,
      bearing_deg: normBearing,
      direction: bearingToDirection(normBearing),
      latitude: lat,
      longitude: lon,
      open_now: true,
      vicinity: o.vicinity,
      priority: o.priority,
    };
  }).sort((a, b) => a.distance_m - b.distance_m);
}
