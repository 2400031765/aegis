import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestAudioPermission, startRecording, stopRecording, playRecording, stopPlayback, type RecordingInfo } from '../services/audioService';

const LAST_KEY = 'aegis.recording.last';
const LIST_KEY = 'aegis.recordings.list';

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
        // prepend to recordings list and persist
        const listRaw = await AsyncStorage.getItem(LIST_KEY);
        const list: RecordingInfo[] = listRaw ? JSON.parse(listRaw) : [];
        const newList = [saved, ...list].slice(0, 50);
        await AsyncStorage.setItem(LIST_KEY, JSON.stringify(newList)).catch(() => undefined);
        await AsyncStorage.setItem(LAST_KEY, JSON.stringify(saved)).catch(() => undefined);
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
      const rawLast = await AsyncStorage.getItem(LAST_KEY);
      const rawList = await AsyncStorage.getItem(LIST_KEY);
      const last: RecordingInfo | null = rawLast ? JSON.parse(rawLast) : null;
      const list: RecordingInfo[] = rawList ? JSON.parse(rawList) : [];
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
    await AsyncStorage.removeItem(LIST_KEY).catch(() => undefined);
    await AsyncStorage.removeItem(LAST_KEY).catch(() => undefined);
    set({ recordings: [], recordingInfo: null });
  },
}));

export default useRecordingStore;
