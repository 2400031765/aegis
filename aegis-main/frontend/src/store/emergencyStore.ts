import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import { locationService, type AegisLocation } from '../services/location';
import { getSelectedContacts, type TrustedContact } from './contactsStore';
import { useAuthStore } from './authStore';
import type { RecordingInfo } from '../services/audioService';
import useRecordingStore from './recordingStore';
import { buildEmergencySmsMessage, openEmergencySmsComposer } from '../services/emergencySmsService';

export type EmergencyPhase = 'idle' | 'countdown' | 'active' | 'cancelled' | 'sent';

export interface EmergencyPayload {
  userId: string | null;
  userName: string | null;
  email: string | null;
  type: 'sos';
  triggeredAt: number;
  location: AegisLocation | null;
  battery: number | null;
  contacts: TrustedContact[];
  language: string;
  message: string;
}

interface State {
  phase: EmergencyPhase;
  countdown: number;
  startedAt: number | null;
  durationMs: number;
  location: AegisLocation | null;
  permissionStatus: 'unknown' | 'granted' | 'denied';
  isRecording: boolean;
  recordingInfo: RecordingInfo | null;
  lastPayload: EmergencyPayload | null;
  error: string | null;
  timeline: { ts: number; text: string }[];
}

interface Actions {
  startCountdown: (seconds?: number) => void;
  cancelCountdown: () => void;
  tickCountdown: () => void;
  activate: () => Promise<void>;
  stopAlert: () => Promise<void>;
  tickDuration: () => void;
  refreshLocation: () => Promise<void>;
  setLocation: (loc: AegisLocation) => void;
  setPermission: (s: State['permissionStatus']) => void;
  buildPayload: () => Promise<EmergencyPayload>;
  sendAlert: () => Promise<EmergencyPayload>;
  reset: () => void;
  hydrateRecording: () => Promise<void>;
  clearRecordingInfo: () => Promise<void>;
  addTimelineEvent: (text: string) => void;
}

const COUNTDOWN_SECONDS = 5;
const RECORDING_KEY = 'aegis.emergency_last_recording';

const persistRecordingInfo = (info: RecordingInfo | null) => {
  if (!info) return AsyncStorage.removeItem(RECORDING_KEY);
  return AsyncStorage.setItem(RECORDING_KEY, JSON.stringify(info));
};

export const useEmergencyStore = create<State & Actions>((set, get) => ({
  phase: 'idle',
  countdown: COUNTDOWN_SECONDS,
  startedAt: null,
  durationMs: 0,
  location: null,
  permissionStatus: 'unknown',
  isRecording: false,
  recordingInfo: null,
  lastPayload: null,
  timeline: [],
  error: null,

  startCountdown: (seconds = COUNTDOWN_SECONDS) => {
    set({ phase: 'countdown', countdown: seconds, error: null });
  },

  cancelCountdown: () => {
    set({ phase: 'cancelled', countdown: COUNTDOWN_SECONDS });
    setTimeout(() => {
      if (get().phase === 'cancelled') set({ phase: 'idle' });
    }, 800);
  },

  tickCountdown: () => {
    const { countdown } = get();
    set({ countdown: Math.max(0, countdown - 1) });
  },

  activate: async () => {
    const now = Date.now();
    set({ phase: 'active', startedAt: now, durationMs: 0, isRecording: true, recordingInfo: null });
    get().addTimelineEvent('SOS activated');

    // Start audio recording via global recording store (non-blocking)
    useRecordingStore.getState().start().then(() => {
      const info = useRecordingStore.getState().recordingInfo;
      if (info) set({ recordingInfo: info });
      get().addTimelineEvent('Emergency evidence monitoring active');
    }).catch(() => set({ isRecording: false }));

    try {
      const perm = await locationService.ensurePermission();
      set({ permissionStatus: perm.granted ? 'granted' : 'denied' });
      if (perm.granted) {
        const loc = await locationService.getCurrent();
        set({ location: loc });
        get().addTimelineEvent('Live location sharing enabled');
        openEmergencySmsComposer({
          contacts: getSelectedContacts(),
          location: loc,
        }).catch(() => undefined);
      } else {
        openEmergencySmsComposer({
          contacts: getSelectedContacts(),
          location: null,
        }).catch(() => undefined);
      }
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Could not start tracking' });
      openEmergencySmsComposer({
        contacts: getSelectedContacts(),
        location: null,
      }).catch(() => undefined);
    }
  },

  stopAlert: async () => {
    const savedRecording = await useRecordingStore.getState().stop().catch(() => null);
    if (savedRecording) {
      persistRecordingInfo(savedRecording).catch(() => undefined);
    }

    set({
      phase: 'idle',
      countdown: COUNTDOWN_SECONDS,
      startedAt: null,
      durationMs: 0,
      isRecording: false,
      recordingInfo: savedRecording ?? get().recordingInfo,
    });
    get().addTimelineEvent('Emergency mode ended');
  },

  addTimelineEvent: (text: string) => {
    const entry = { ts: Date.now(), text };
    set((s) => ({ timeline: [entry, ...s.timeline].slice(0, 50) }));
  },

  tickDuration: () => {
    const { startedAt } = get();
    if (!startedAt) return;
    set({ durationMs: Date.now() - startedAt });
  },

  refreshLocation: async () => {
    try {
      const perm = await locationService.ensurePermission();
      set({ permissionStatus: perm.granted ? 'granted' : 'denied' });
      if (!perm.granted) return;
      const loc = await locationService.getCurrent();
      set({ location: loc });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Could not fetch location' });
    }
  },

  setLocation: (loc) => set({ location: loc }),
  setPermission: (s) => set({ permissionStatus: s }),

  buildPayload: async () => {
    const auth = useAuthStore.getState();
    const { location } = get();
    let battery: number | null = null;
    try {
      battery = await Battery.getBatteryLevelAsync();
    } catch {
      battery = null;
    }
    const payload: EmergencyPayload = {
      userId: auth.user?.uid ?? null,
      userName: auth.user?.displayName ?? null,
      email: auth.user?.email ?? null,
      type: 'sos',
      triggeredAt: get().startedAt ?? Date.now(),
      location,
      battery,
      contacts: getSelectedContacts(),
      language: auth.language,
      message: buildEmergencySmsMessage(location),
    };
    set({ lastPayload: payload });
    return payload;
  },

  sendAlert: async () => {
    // Architecture is in place — actual SMS / FCM dispatch will be wired in Module 5.
    const payload = await get().buildPayload();
    set({ phase: 'sent' });
    // Auto-return to active state after 2.5s so user can stop / continue
    setTimeout(() => {
      if (get().phase === 'sent') set({ phase: 'active' });
    }, 2500);
    return payload;
  },

  reset: () =>
    set({
      phase: 'idle',
      countdown: COUNTDOWN_SECONDS,
      startedAt: null,
      durationMs: 0,
      isRecording: false,
      error: null,
    }),

  hydrateRecording: async () => {
    // Hydrate emergency store with last saved recording (keeps compatibility)
    try {
      const raw = await AsyncStorage.getItem(RECORDING_KEY);
      set({ recordingInfo: raw ? JSON.parse(raw) : null });
      // also hydrate global recording store
      await useRecordingStore.getState().hydrate();
    } catch {
      set({ recordingInfo: null });
    }
  },

  clearRecordingInfo: async () => {
    await persistRecordingInfo(null).catch(() => undefined);
    set({ recordingInfo: null });
    await useRecordingStore.getState().clearHistory().catch(() => undefined);
  },
}));

export const formatElapsed = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};
