/**
 * AEGIS AI Distress Intelligence — frontend service abstraction.
 * Talks to the FastAPI backend (`/api/ai/*`) via clean async functions.
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

export const aiService = {
  async chat(params: {
    sessionId: string;
    message: string;
    history?: ChatMessageDTO[];
    extraSafewords?: string[];
    location?: AILocation | null;
  }): Promise<AIChatResponse> {
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
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`AI chat failed: ${res.status} ${txt}`);
    }
    return (await res.json()) as AIChatResponse;
  },

  async safePlaces(latitude: number, longitude: number, radiusM = 1200): Promise<SafePlace[]> {
    const res = await fetch(`${BACKEND}/api/ai/safe-places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, radius_m: radiusM }),
    });
    if (!res.ok) throw new Error(`safe-places failed: ${res.status}`);
    const j = (await res.json()) as { places: SafePlace[] };
    return j.places;
  },

  async checkSafeword(text: string, extraSafewords: string[] = []): Promise<{
    matched: boolean;
    safeword: string | null;
    score: number;
  }> {
    const res = await fetch(`${BACKEND}/api/ai/safeword/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, extra_safewords: extraSafewords }),
    });
    if (!res.ok) throw new Error(`Safeword check failed: ${res.status}`);
    return res.json();
  },
};

export const ACTION_LABELS: Record<AIAction, { label: string; icon: string }> = {
  activate_emergency_mode: { label: 'Activate Emergency Mode', icon: 'shield-checkmark' },
  share_location: { label: 'Share Live Location', icon: 'location' },
  contact_trusted_circle: { label: 'Alert Trusted Circle', icon: 'people' },
  breathing_exercise: { label: 'Breathing Exercise', icon: 'leaf' },
  grounding_exercise: { label: 'Grounding Exercise', icon: 'flower' },
  stay_calm: { label: 'Stay Calm', icon: 'heart' },
  move_to_safe_area: { label: 'Move to a Safe Area', icon: 'walk' },
  call_local_authorities: { label: 'Call Local Authorities', icon: 'call' },
  navigate_to_safe_place: { label: 'Navigate to Safety', icon: 'navigate' },
};

export const SAFE_PLACE_META: Record<SafePlaceType, { label: string; icon: string; color: string }> = {
  police: { label: 'Police Station', icon: 'shield', color: '#39FFA0' },
  hospital: { label: 'Hospital', icon: 'medkit', color: '#FF5F87' },
  pharmacy: { label: 'Pharmacy', icon: 'medkit-outline', color: '#9D7BFF' },
  metro: { label: 'Metro Station', icon: 'train', color: '#5BCEFF' },
  store_24_7: { label: '24/7 Store', icon: 'storefront', color: '#FFB800' },
  shelter: { label: 'Safe Shelter', icon: 'home', color: '#39FFA0' },
  public_area: { label: 'Public Area', icon: 'people-circle', color: '#FFB800' },
  fire_station: { label: 'Fire Station', icon: 'flame', color: '#FF5F87' },
};
