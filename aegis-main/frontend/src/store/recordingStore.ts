import { create } from 'zustand';
import { getAuthSnapshot, useAuthStore } from './authStore';
import { requestAudioPermission, startRecording, stopRecording, playRecording, stopPlayback, type RecordingInfo } from '../services/audioService';
import { loadUserStorageJson, saveUserStorageJson, removeUserStorageKey } from '../services/userStorage';

const LAST_KEY = 'recording.last';
const LIST_KEY = 'recordings.list';

interface State {
  isRecording: boolean;
  startedAt: number | null;
  durationMs: number;
  recordingInfo: RecordingInfo | null;
  recordings: RecordingInfo[];
  start: () => Promise<void>;
  stop: () => Promise<RecordingInfo | null>;
  hydrate: () => Promise<void>;
  play: (uri: string, onFinished?: () => void) => Promise<void>;
  stopPlayback: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

let _ticker: number | null = null;

export const useRecordingStore = create<State>((set, get) => ({
  isRecording: false,
  startedAt: null,
  durationMs: 0,
  recordingInfo: null,
  recordings: [],

  start: async () => {
    try {
      // Optimistically mark recording started to drive UI timer immediately
      const optimisticStarted = Date.now();
      set({ isRecording: true, startedAt: optimisticStarted, durationMs: 0, recordingInfo: null });

      // Start ticker to update duration every second (immediate)
      if (_ticker) clearInterval(_ticker);
      _ticker = setInterval(() => {
        const s = get();
        if (!s.startedAt) return;
        const duration = Date.now() - s.startedAt;
        set({ durationMs: duration });
      }, 1000) as unknown as number;

      const granted = await requestAudioPermission();
      if (!granted) {
        // permission denied -> roll back optimistic state
        if (_ticker) {
          clearInterval(_ticker);
          _ticker = null;
        }
        set({ isRecording: false, startedAt: null, durationMs: 0 });
        return;
      }

      // Start recording via service
      const info = await startRecording();
      if (!info) {
        // recording failed -> roll back
        if (_ticker) {
          clearInterval(_ticker);
          _ticker = null;
        }
        set({ isRecording: false, startedAt: null, durationMs: 0 });
        return;
      }

      // keep the in-progress recording info (uri may be a temp path)
      set({ isRecording: true, startedAt: info.startedAt, recordingInfo: info });
    } catch (err) {
      console.error('[recordingStore] start failed', err);
    }
  },

  stop: async () => {
    try {
      if (_ticker) {
        clearInterval(_ticker);
        _ticker = null;
      }

      const saved = await stopRecording();
      if (saved) {
        const userId = saved.userId ?? getAuthSnapshot().user?.uid ?? null;
        const list: RecordingInfo[] = userId ? await loadUserStorageJson(userId, LIST_KEY, []) : [];
        const newList = [saved, ...list].slice(0, 50);
        if (userId) {
          await saveUserStorageJson(userId, LIST_KEY, newList).catch(() => undefined);
          await saveUserStorageJson(userId, LAST_KEY, saved).catch(() => undefined);
        }
        set({ recordings: newList, recordingInfo: saved, isRecording: false, startedAt: null, durationMs: 0 });
        return saved;
      }
      set({ isRecording: false, startedAt: null, durationMs: 0 });
      return null;
    } catch (err) {
      console.error('[recordingStore] stop failed', err);
      set({ isRecording: false, startedAt: null, durationMs: 0 });
      return null;
    }
  },

  hydrate: async () => {
    try {
      const userId = getAuthSnapshot().user?.uid ?? null;
      if (!userId) {
        set({ recordingInfo: null, recordings: [] });
        return;
      }

      const last: RecordingInfo | null = await loadUserStorageJson(userId, LAST_KEY, null);
      const list: RecordingInfo[] = await loadUserStorageJson(userId, LIST_KEY, []);
      set({ recordingInfo: last, recordings: list });
    } catch (err) {
      console.error('[recordingStore] hydrate failed', err);
    }
  },

  play: async (uri: string, onFinished?: () => void) => {
    if (!uri) return;
    await stopPlayback().catch(() => undefined);
    return playRecording(uri, onFinished).catch(() => undefined);
  },

  stopPlayback: async () => {
    return stopPlayback().catch(() => undefined);
  },

  clearHistory: async () => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    if (userId) {
      await removeUserStorageKey(userId, LIST_KEY).catch(() => undefined);
      await removeUserStorageKey(userId, LAST_KEY).catch(() => undefined);
    }
    set({ recordings: [], recordingInfo: null });
  },
}));

useAuthStore.subscribe(
  (state) => state.user?.uid,
  (userId, prevUserId) => {
    if (userId !== prevUserId) {
      useRecordingStore.setState({ recordings: [], recordingInfo: null, isRecording: false, startedAt: null, durationMs: 0 });
    }
  },
);

export default useRecordingStore;
