import { create } from 'zustand';
import { aiService, type AIChatResponse, type Risk, type AIAction, type SafePlace } from '../services/ai';
import { locationService } from '../services/location';

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
}

interface Actions {
  reset: () => void;
  sendUserMessage: (text: string) => Promise<AIChatResponse | null>;
  pushAssistant: (msg: Omit<ChatMsg, 'id' | 'createdAt' | 'role'>) => void;
  consumeStealth: () => boolean;
  greet: () => void;
}

const newId = () => 'm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const newSession = () => 's-' + Date.now().toString(36);

const GREETING: ChatMsg = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hello, I'm AEGIS AI.\nHow can I help keep you safe today?",
  risk: 'low',
  reassurance: 'You are not alone. AEGIS is here, listening with you.',
  createdAt: Date.now(),
};

export const useChatStore = create<State & Actions>((set, get) => ({
  sessionId: newSession(),
  messages: [GREETING],
  thinking: false,
  error: null,
  lastResponse: null,
  pendingStealth: false,

  reset: () => {
    set({
      sessionId: newSession(),
      messages: [{ ...GREETING, createdAt: Date.now() }],
      thinking: false,
      error: null,
      lastResponse: null,
      pendingStealth: false,
    });
  },

  greet: () => {
    if (get().messages.length === 0) {
      set({ messages: [{ ...GREETING, createdAt: Date.now() }] });
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

  sendUserMessage: async (text: string) => {
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

    // Best-effort location capture — non-blocking on failure / denial.
    let location: { latitude: number; longitude: number; accuracy?: number | null } | null = null;
    try {
      const perm = await locationService.ensurePermission();
      if (perm.granted) {
        const loc = await locationService.getCurrent();
        location = { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy };
      }
    } catch {
      location = null;
    }

    try {
      const history = get()
        .messages.filter((m) => m.id !== 'greeting')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));
      const resp = await aiService.chat({
        sessionId: get().sessionId,
        message: trimmed,
        history,
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
      });
      return resp;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AEGIS could not reach the AI.';
      set({
        thinking: false,
        error: msg,
        messages: [
          ...get().messages,
          {
            id: newId(),
            role: 'assistant',
            content:
              "I had trouble reaching my mind just now. I'm still right here with you — try again, or use the SOS button if it's urgent.",
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
