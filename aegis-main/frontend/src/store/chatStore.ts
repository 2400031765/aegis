import { create } from 'zustand';
import { aiService, type AIChatResponse, type Risk, type AIAction, type SafePlace } from '../services/ai';
import { locationService } from '../services/location';
import { i18n } from '../i18n';
import { useSafewordStore } from './safewordStore';

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  risk?: Risk;
  actions?: AIAction[];
  reassurance?: string | null;
  breathing?: string | null;
  stealth?: boolean;
  recommendedPlace?: SafePlace | null;
  nearbyPlaces?: SafePlace[];
  guidance?: string | null;
  createdAt: number;
}

interface State {
  sessionId: string;
  messages: ChatMsg[];
  thinking: boolean;
  error: string | null;
  lastResponse: AIChatResponse | null;
  pendingStealth: boolean;
  /** Last known GPS coordinates — used to generate accurate Maps navigation links */
  lastLocation: { latitude: number; longitude: number } | null;
}

interface Actions {
  reset: () => void;
  sendUserMessage: (
    text: string,
    location?: { latitude: number; longitude: number } | null,
  ) => Promise<AIChatResponse | null>;
  pushAssistant: (msg: Omit<ChatMsg, 'id' | 'createdAt' | 'role'>) => void;
  consumeStealth: () => boolean;
  greet: () => void;
}

const newId = () => 'm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const newSession = () => 's-' + Date.now().toString(36);

const getGreeting = (): ChatMsg => ({
  id: 'greeting',
  role: 'assistant',
  content: String(i18n.t('assistant.greeting')),
  risk: 'low',
  reassurance: String(i18n.t('assistant.greetingReassurance')),
  createdAt: Date.now(),
});

export const useChatStore = create<State & Actions>((set, get) => ({
  sessionId: newSession(),
  messages: [getGreeting()],
  thinking: false,
  error: null,
  lastResponse: null,
  pendingStealth: false,
  lastLocation: null,

  reset: () => {
    set({
      sessionId: newSession(),
      messages: [getGreeting()],
      thinking: false,
      error: null,
      lastResponse: null,
      pendingStealth: false,
      // preserve lastLocation across resets — GPS doesn't change
    });
  },

  greet: () => {
    if (get().messages.length === 0) {
      set({ messages: [getGreeting()] });
    }
  },

  pushAssistant: (msg) => {
    const m: ChatMsg = {
      id: newId(),
      role: 'assistant',
      createdAt: Date.now(),
      ...msg,
    };
    set({ messages: [...get().messages, m] });
  },

  sendUserMessage: async (text: string, passedLocation?: { latitude: number; longitude: number } | null) => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const userMsg: ChatMsg = {
      id: newId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    set({
      messages: [...get().messages, userMsg],
      thinking: true,
      error: null,
    });

    // Use passed location if provided, otherwise try to get it ourselves.
    let location: { latitude: number; longitude: number; accuracy?: number | null } | null =
      passedLocation ?? null;
    if (!location) {
      try {
        const perm = await locationService.ensurePermission();
        if (perm.granted) {
          const loc = await locationService.getCurrent();
          location = { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy };
        }
      } catch {
        location = null;
      }
    }

    // Pull the user's custom safeword for this request.
    const extraSafewords = useSafewordStore.getState().getExtraSafewords();

    try {
      const history = get()
        .messages.filter((m) => m.id !== 'greeting')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));
      const resp = await aiService.chat({
        sessionId: get().sessionId,
        message: trimmed,
        history,
        extraSafewords,
        location,
      });

      const assistant: ChatMsg = {
        id: newId(),
        role: 'assistant',
        content: resp.reply,
        risk: resp.risk,
        actions: resp.actions,
        reassurance: resp.reassurance,
        breathing: resp.breathing,
        stealth: resp.stealth_activate,
        recommendedPlace: resp.recommended_place,
        nearbyPlaces: resp.nearby_places,
        guidance: resp.guidance,
        createdAt: Date.now(),
      };

      set({
        messages: [...get().messages, assistant],
        thinking: false,
        lastResponse: resp,
        pendingStealth: resp.stealth_activate,
        lastLocation: location ? { latitude: location.latitude, longitude: location.longitude } : get().lastLocation,
      });
      return resp;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(i18n.t('assistant.reachError'));
      set({
        thinking: false,
        error: msg,
        messages: [
          ...get().messages,
          {
            id: newId(),
            role: 'assistant',
            content: String(i18n.t('assistant.reachErrorDetail')),
            risk: 'low',
            createdAt: Date.now(),
          },
        ],
      });
      return null;
    }
  },

  consumeStealth: () => {
    const v = get().pendingStealth;
    if (v) set({ pendingStealth: false });
    return v;
  },
}));
