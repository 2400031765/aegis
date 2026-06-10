/**
 * AEGIS Offline Store
 * Tracks connectivity state and caches emergency actions that were triggered
 * while offline so they can be synced when the connection returns.
 *
 * Architecture:
 *  - isOnline / setOnline  — driven by useNetworkStatus hook in the UI layer
 *  - queueAction           — called by chatStore when an emergency action fires offline
 *  - flushQueue            — called when connectivity is restored; returns queued items
 *  - Persisted per-user via AsyncStorage under 'aegis.user.<uid>.offline_queue'
 */

import { create } from 'zustand';
import { getAuthSnapshot, useAuthStore } from './authStore';
import { loadUserStorageJson, saveUserStorageJson, removeUserStorageKey } from '../services/userStorage';

const STORAGE_KEY = 'offline_queue';

export interface QueuedAction {
  id: string;
  type: 'emergency_triggered' | 'sos_sent' | 'location_shared' | 'contact_alerted';
  payload: Record<string, unknown>;
  queuedAt: number;
}

interface State {
  isOnline: boolean;
  queuedActions: QueuedAction[];
  hydrated: boolean;
}

interface Actions {
  setOnline: (online: boolean) => void;
  hydrate: () => Promise<void>;
  queueAction: (action: Omit<QueuedAction, 'id' | 'queuedAt'>) => Promise<void>;
  flushQueue: () => Promise<QueuedAction[]>;
  clearQueue: () => Promise<void>;
}

const newId = () => 'qa-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const persist = (actions: QueuedAction[], userId: string | null) =>
  saveUserStorageJson(userId, STORAGE_KEY, actions);

export const useOfflineStore = create<State & Actions>((set, get) => ({
  isOnline: true,
  queuedActions: [],
  hydrated: false,

  setOnline: (online) => set({ isOnline: online }),

  hydrate: async () => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    if (!userId) {
      set({ queuedActions: [], hydrated: true });
      return;
    }

    try {
      const queuedActions: QueuedAction[] = await loadUserStorageJson(userId, STORAGE_KEY, []);
      set({ queuedActions, hydrated: true });
    } catch {
      set({ queuedActions: [], hydrated: true });
    }
  },

  queueAction: async (action) => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    if (!userId) return;

    const item: QueuedAction = {
      ...action,
      id: newId(),
      queuedAt: Date.now(),
    };
    const next = [...get().queuedActions, item];
    set({ queuedActions: next });
    await persist(next, userId);
  },

  flushQueue: async () => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    const items = get().queuedActions;
    if (items.length === 0) return [];
    // Clear the queue — caller is responsible for actually sending
    set({ queuedActions: [] });
    if (userId) await removeUserStorageKey(userId, STORAGE_KEY);
    return items;
  },

  clearQueue: async () => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    set({ queuedActions: [] });
    if (userId) await removeUserStorageKey(userId, STORAGE_KEY);
  },
}));

useAuthStore.subscribe(
  (state) => state.user?.uid,
  (userId, prevUserId) => {
    if (userId !== prevUserId) {
      useOfflineStore.setState({ queuedActions: [], hydrated: false });
    }
  },
);
