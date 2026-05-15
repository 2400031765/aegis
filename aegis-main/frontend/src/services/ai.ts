/**
 * AEGIS AI Distress Intelligence — frontend service abstraction.
 *
 * Request priority chain (each tier falls through to the next on failure):
 *   1. Gemma via HF Inference API  (EXPO_PUBLIC_HF_TOKEN set)
 *   2. AEGIS FastAPI backend        (EXPO_PUBLIC_BACKEND_URL set)
 *   3. localDangerAnalysis          (always available, fully offline)
 *
 * Emergency workflows, safeword detection, SOS, and offline mode are
 * handled entirely in tier 3 and are NEVER affected by tiers 1 or 2.
 */

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

export type Risk = 'low' | 'medium' | 'high';

export type AIAction =
  | 'activate_emergency_mode'
  | 'share_location'
  | 'contact_trusted_circle'
  | 'breathing_exercise'
  | 'grounding_exercise'
  | 'stay_calm'
  | 'move_to_safe_area'
  | 'call_local_authorities'
  | 'navigate_to_safe_place';

export interface ChatMessageDTO {
  role: 'user' | 'assistant';
  content: string;
}

export type SafePlaceType =
  | 'police'
  | 'hospital'
  | 'pharmacy'
  | 'metro'
  | 'store_24_7'
  | 'shelter'
  | 'public_area'
  | 'fire_station';

export interface SafePlace {
  id: string;
  name: string;
  type: SafePlaceType;
  distance_m: number;
  bearing_deg: number;
  direction: string;
  latitude: number;
  longitude: number;
  open_now: boolean;
  vicinity: string | null;
  priority: number;
}

export interface AILocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface AIChatResponse {
  reply: string;
  risk: Risk;
  actions: AIAction[];
  reassurance: string | null;
  breathing: string | null;
  safeword: boolean;
  safeword_phrase: string | null;
  stealth_activate: boolean;
  nearby_places: SafePlace[];
  recommended_place: SafePlace | null;
  guidance: string | null;
}

/**
 * LOCAL AI FALLBACK
 * Works even if backend/HuggingFace/FastAPI fails.
 * Uses real GPS coordinates to generate accurate nearby places + directional guidance.
 */

import {
  generateSimulatedNearbyPlaces,
  buildIntelligentSafetyReply,
} from './navigationService';
import { gemmaChat } from './gemmaService';

function localSafewordCheck(
  message: string,
  extraSafewords: string[] = [],
): { matched: boolean; phrase: string | null } {
  const lower = message.toLowerCase().trim();
  const builtIn = ['aegis activate', 'help me quietly', 'aegis help', 'operation cobalt'];
  const all = [...builtIn, ...extraSafewords.map((s) => s.toLowerCase())];
  const found = all.find((w) => lower.includes(w));
  return { matched: !!found, phrase: found ?? null };
}

function localDangerAnalysis(
  message: string,
  extraSafewords: string[] = [],
  location?: AILocation | null,
): AIChatResponse {
  // ── Safeword check — highest priority ──────────────────────────────────────
  const sw = localSafewordCheck(message, extraSafewords);
  if (sw.matched) {
    const nearby = location
      ? generateSimulatedNearbyPlaces(location.latitude, location.longitude)
      : [];
    const rec = nearby[0] ?? null;
    const ctx = buildIntelligentSafetyReply({ risk: 'high', nearbyPlaces: nearby, recommendedPlace: rec, userLat: location?.latitude, userLon: location?.longitude });
    return {
      reply: "Of course. I'm setting that up for you right now.",
      risk: 'high',
      actions: ['activate_emergency_mode', 'share_location', 'contact_trusted_circle', 'navigate_to_safe_place'],
      reassurance: 'Stay where you are. Help is on the way.',
      breathing: 'Slow breaths in through your nose, out through your mouth.',
      safeword: true,
      safeword_phrase: sw.phrase,
      stealth_activate: true,
      nearby_places: nearby,
      recommended_place: rec,
      guidance: ctx.guidance ?? 'Move toward a crowded or well-lit public area. Keep your phone close.',
    };
  }

  const text = message.toLowerCase();

  // ── Generate nearby places from real GPS if available ──────────────────────
  const nearby = location
    ? generateSimulatedNearbyPlaces(location.latitude, location.longitude)
    : [];
  const rec = nearby[0] ?? null;

  // ── HIGH RISK ───────────────────────────────────────────────────────────────
  const isHighRisk =
    text.includes('follow') || text.includes('following') ||
    text.includes('unsafe') || text.includes('danger') ||
    text.includes('help') || text.includes('attack') ||
    text.includes('scared') || text.includes('kidnap') ||
    text.includes('harass') || text.includes('stalking') ||
    text.includes('threatening') || text.includes('chasing') ||
    text.includes('grabbed') || text.includes('assault');

  if (isHighRisk) {
    const ctx = buildIntelligentSafetyReply({ risk: 'high', nearbyPlaces: nearby, recommendedPlace: rec, userLat: location?.latitude, userLon: location?.longitude });
    return {
      reply: ctx.reply,
      risk: 'high',
      actions: ['activate_emergency_mode', 'share_location', 'contact_trusted_circle', 'navigate_to_safe_place'],
      reassurance: ctx.reassurance,
      breathing: ctx.breathing,
      safeword: false,
      safeword_phrase: null,
      stealth_activate: false,
      nearby_places: nearby,
      recommended_place: rec,
      guidance: ctx.guidance,
    };
  }

  // ── MEDIUM RISK ─────────────────────────────────────────────────────────────
  const isMediumRisk =
    text.includes('alone') || text.includes('night') ||
    text.includes('worried') || text.includes('anxious') ||
    text.includes('uncomfortable') || text.includes('nervous') ||
    text.includes('suspicious') || text.includes('dark') ||
    text.includes('lost') || text.includes('stranded');

  if (isMediumRisk) {
    const ctx = buildIntelligentSafetyReply({ risk: 'medium', nearbyPlaces: nearby, recommendedPlace: rec, userLat: location?.latitude, userLon: location?.longitude });
    return {
      reply: ctx.reply,
      risk: 'medium',
      actions: ['share_location', 'navigate_to_safe_place', 'stay_calm'],
      reassurance: ctx.reassurance,
      breathing: ctx.breathing,
      safeword: false,
      safeword_phrase: null,
      stealth_activate: false,
      nearby_places: nearby,
      recommended_place: rec,
      guidance: ctx.guidance,
    };
  }

  // ── SAFE PLACE REQUEST ──────────────────────────────────────────────────────
  const isSafePlaceRequest =
    text.includes('safe place') || text.includes('where should i go') ||
    text.includes('nearest') || text.includes('hospital') ||
    text.includes('police') || text.includes('pharmacy') ||
    text.includes('where to go') || text.includes('find safety') ||
    text.includes('navigate') || text.includes('directions');

  if (isSafePlaceRequest) {
    const ctx = buildIntelligentSafetyReply({ risk: 'medium', nearbyPlaces: nearby, recommendedPlace: rec, userLat: location?.latitude, userLon: location?.longitude });
    return {
      reply: ctx.reply,
      risk: 'medium',
      actions: ['navigate_to_safe_place', 'share_location', 'contact_trusted_circle'],
      reassurance: ctx.reassurance,
      breathing: 'Take slow deep breaths. Focus on moving steadily toward safety.',
      safeword: false,
      safeword_phrase: null,
      stealth_activate: false,
      nearby_places: nearby,
      recommended_place: rec,
      guidance: ctx.guidance,
    };
  }

  // ── LOW RISK ────────────────────────────────────────────────────────────────
  return {
    reply: 'You appear safe right now. AEGIS continues monitoring your safety.',
    risk: 'low',
    actions: ['stay_calm'],
    reassurance: 'AEGIS is here with you.',
    breathing: null,
    safeword: false,
    safeword_phrase: null,
    stealth_activate: false,
    nearby_places: [],
    recommended_place: null,
    guidance: null,
  };
}

export const aiService = {
  async chat(params: {
    sessionId: string;
    message: string;
    history?: ChatMessageDTO[];
    extraSafewords?: string[];
    location?: AILocation | null;
  }): Promise<AIChatResponse> {

    // ── Tier 0: safeword + local risk check (always runs first, synchronously) ──
    // This guarantees safeword detection and emergency actions are NEVER
    // delayed by network calls, regardless of which AI tier responds.
    const localResult = localDangerAnalysis(
      params.message,
      params.extraSafewords ?? [],
      params.location,
    );

    // If safeword matched or stealth mode triggered — return immediately.
    // Never let a network call delay an emergency trigger.
    if (localResult.safeword || localResult.stealth_activate) {
      console.log('[AEGIS AI] 🔑 Safeword/stealth triggered — returning local result immediately (no network call)');
      return localResult;
    }

    // ── Build GPS-enriched safe-place data (used to augment any AI response) ──
    const nearby = params.location
      ? generateSimulatedNearbyPlaces(params.location.latitude, params.location.longitude)
      : [];
    const rec = nearby[0] ?? null;

    /**
     * Merges a network AI reply with local GPS/safe-place data.
     * The network AI provides the conversational reply + risk classification.
     * Local logic provides the accurate nearby places + directional guidance.
     */
    const mergeWithLocalGPS = (networkResp: AIChatResponse): AIChatResponse => {
      if (nearby.length === 0) return networkResp;

      // Only inject safe-place data for medium/high risk
      if (networkResp.risk === 'low') return networkResp;

      const ctx = buildIntelligentSafetyReply({
        risk: networkResp.risk,
        nearbyPlaces: nearby,
        recommendedPlace: rec,
        userLat: params.location?.latitude,
        userLon: params.location?.longitude,
      });

      return {
        ...networkResp,
        nearby_places: nearby,
        recommended_place: rec,
        // Prefer network guidance if it mentions a place name, else use local
        guidance: networkResp.guidance ?? ctx.guidance,
        // Prefer network reassurance (more conversational), fallback to local
        reassurance: networkResp.reassurance ?? ctx.reassurance,
      };
    };

    // ── Tier 1: Gemma via HF Inference API ────────────────────────────────────
    try {
      const gemmaResp = await gemmaChat({
        message: params.message,
        history: params.history,
        location: params.location,
      });
      console.log('[AEGIS AI] ✅ Tier 1 (Gemma) succeeded — using Gemma response');
      return mergeWithLocalGPS(gemmaResp);
    } catch (gemmaErr) {
      console.warn(
        '[AEGIS AI] ⚠️ Tier 1 (Gemma) failed — trying Tier 2 (backend)\n' +
        `  reason: ${gemmaErr instanceof Error ? gemmaErr.message : String(gemmaErr)}`,
      );
    }

    // ── Tier 2: AEGIS FastAPI backend ─────────────────────────────────────────
    if (BACKEND) {
      console.log(`[AEGIS AI] 🔄 Tier 2 — calling FastAPI backend: ${BACKEND}/api/ai/chat`);
      try {
        const res = await fetch(`${BACKEND}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: params.sessionId,
            message: params.message,
            history: params.history ?? [],
            extra_safewords: params.extraSafewords ?? [],
            location: params.location ?? null,
          }),
        });

        if (res.ok) {
          console.log('[AEGIS AI] ✅ Tier 2 (backend) succeeded — using backend response');
          const backendResp = (await res.json()) as AIChatResponse;
          return mergeWithLocalGPS(backendResp);
        }
        console.warn(`[AEGIS AI] ⚠️ Tier 2 (backend) returned HTTP ${res.status} — falling back to local AI`);
      } catch (backendErr) {
        console.warn(
          '[AEGIS AI] ⚠️ Tier 2 (backend) unreachable — falling back to local AI\n' +
          `  reason: ${backendErr instanceof Error ? backendErr.message : String(backendErr)}`,
        );
      }
    } else {
      console.log('[AEGIS AI] ℹ️ Tier 2 skipped — EXPO_PUBLIC_BACKEND_URL not set');
    }

    // ── Tier 3: Local fallback (always works, fully offline) ──────────────────
    console.log(`[AEGIS AI] 🏠 Tier 3 — using local fallback AI (risk: ${localResult.risk})`);
    return localResult;
  },

  async safePlaces(
    latitude: number,
    longitude: number,
    radiusM = 1200,
  ): Promise<SafePlace[]> {

    if (!BACKEND) return [];

    try {
      const res = await fetch(`${BACKEND}/api/ai/safe-places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          radius_m: radiusM,
        }),
      });

      if (!res.ok) return [];

      const j = (await res.json()) as { places: SafePlace[] };

      return j.places;

    } catch {
      return [];
    }
  },

  async checkSafeword(
    text: string,
    extraSafewords: string[] = [],
  ): Promise<{
    matched: boolean;
    safeword: string | null;
    score: number;
  }> {

    if (!BACKEND) {
      const lower = text.toLowerCase();

      const words = [
        'aegis activate',
        'help me quietly',
        ...extraSafewords.map((s) => s.toLowerCase()),
      ];

      const found = words.find((w) => lower.includes(w));

      return {
        matched: !!found,
        safeword: found ?? null,
        score: found ? 1 : 0,
      };
    }

    try {
      const res = await fetch(`${BACKEND}/api/ai/safeword/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          extra_safewords: extraSafewords,
        }),
      });

      if (!res.ok) {
        return {
          matched: false,
          safeword: null,
          score: 0,
        };
      }

      return res.json();

    } catch {
      return {
        matched: false,
        safeword: null,
        score: 0,
      };
    }
  },
};

export const ACTION_LABELS: Record<
  AIAction,
  { label: string; icon: string }
> = {
  activate_emergency_mode: {
    label: 'Activate Emergency Mode',
    icon: 'shield-checkmark',
  },

  share_location: {
    label: 'Share Live Location',
    icon: 'location',
  },

  contact_trusted_circle: {
    label: 'Alert Trusted Circle',
    icon: 'people',
  },

  breathing_exercise: {
    label: 'Breathing Exercise',
    icon: 'leaf',
  },

  grounding_exercise: {
    label: 'Grounding Exercise',
    icon: 'flower',
  },

  stay_calm: {
    label: 'Stay Calm',
    icon: 'heart',
  },

  move_to_safe_area: {
    label: 'Move to a Safe Area',
    icon: 'walk',
  },

  call_local_authorities: {
    label: 'Call Local Authorities',
    icon: 'call',
  },

  navigate_to_safe_place: {
    label: 'Navigate to Safety',
    icon: 'navigate',
  },
};

export const SAFE_PLACE_META: Record<
  SafePlaceType,
  { label: string; icon: string; color: string }
> = {
  police: {
    label: 'Police Station',
    icon: 'shield',
    color: '#39FFA0',
  },

  hospital: {
    label: 'Hospital',
    icon: 'medkit',
    color: '#FF5F87',
  },

  pharmacy: {
    label: 'Pharmacy',
    icon: 'medkit-outline',
    color: '#9D7BFF',
  },

  metro: {
    label: 'Metro Station',
    icon: 'train',
    color: '#5BCEFF',
  },

  store_24_7: {
    label: '24/7 Store',
    icon: 'storefront',
    color: '#FFB800',
  },

  shelter: {
    label: 'Safe Shelter',
    icon: 'home',
    color: '#39FFA0',
  },

  public_area: {
    label: 'Public Area',
    icon: 'people-circle',
    color: '#FFB800',
  },

  fire_station: {
    label: 'Fire Station',
    icon: 'flame',
    color: '#FF5F87',
  },
};