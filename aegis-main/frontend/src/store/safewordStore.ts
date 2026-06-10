/**
 * AEGIS Safeword Store
 * Manages the user's personal safeword phrase.
 * Persisted locally via AsyncStorage — no server sync needed.
 */

import { create } from 'zustand';
import { getAuthSnapshot, useAuthStore } from './authStore';
import {
  loadUserStorageString,
  saveUserStorageString,
  removeUserStorageKey,
} from '../services/userStorage';

const STORAGE_KEY = 'safeword';

interface State {
  safeword: string;
  hydrated: boolean;
}

interface Actions {
  hydrate: () => Promise<void>;
  setSafeword: (phrase: string) => Promise<void>;
  clearSafeword: () => Promise<void>;
  /** Returns the safeword as an array for use as extraSafewords in AI calls. */
  getExtraSafewords: () => string[];
}

export const useSafewordStore = create<State & Actions>((set, get) => ({
  safeword: '',
  hydrated: false,

  hydrate: async () => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    if (!userId) {
      set({ safeword: '', hydrated: true });
      return;
    }

    try {
      const raw = await loadUserStorageString(userId, STORAGE_KEY);
      set({ safeword: raw ?? '', hydrated: true });
    } catch {
      set({ safeword: '', hydrated: true });
    }
  },

  setSafeword: async (phrase: string) => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    const trimmed = phrase.trim();
    if (!userId) {
      set({ safeword: '' });
      return;
    }
    await saveUserStorageString(userId, STORAGE_KEY, trimmed);
    set({ safeword: trimmed });
  },

  clearSafeword: async () => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    if (userId) {
      await removeUserStorageKey(userId, STORAGE_KEY);
    }
    set({ safeword: '' });
  },

  getExtraSafewords: () => {
    const { safeword } = get();
    return safeword.length > 0 ? [safeword] : [];
  },
}));

useAuthStore.subscribe(
  (state) => state.user?.uid,
  (userId, prevUserId) => {
    if (userId !== prevUserId) {
      useSafewordStore.setState({ safeword: '', hydrated: false });
    }
  },
);
