/**
 * AEGIS Safeword Store
 * Manages the user's personal safeword phrase.
 * Persisted locally via AsyncStorage — no server sync needed.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'aegis.safeword';

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
    try {
      const raw = await AsyncStorage.getItem(KEY);
      set({ safeword: raw ?? '', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setSafeword: async (phrase: string) => {
    const trimmed = phrase.trim();
    await AsyncStorage.setItem(KEY, trimmed);
    set({ safeword: trimmed });
  },

  clearSafeword: async () => {
    await AsyncStorage.removeItem(KEY);
    set({ safeword: '' });
  },

  getExtraSafewords: () => {
    const { safeword } = get();
    return safeword.length > 0 ? [safeword] : [];
  },
}));
