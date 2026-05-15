/**
 * AEGIS Offline Store
 * Tracks connectivity state and caches emergency actions that were triggered
 * while offline so they can be synced when the connection returns.
 *
 * Architecture:
 *  - isOnline / setOnline  — driven by useNetworkStatus hook in the UI layer
 *  - queueAction           — called by chatStore when an emergency action fires offline
 *  - flushQueue            — called when connectivity is restored; returns queued items
 *  - Persisted via AsyncStorage under 'aegis.offline_queue'
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'aegis.offline_queue';

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

const persist = (actions: QueuedAction[]) =>
  AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(actions));

export const useOfflineStore = create<State & Actions>((set, get) => ({
  isOnline: true,
  queuedActions: [],
  hydrated: false,

  setOnline: (online) => set({ isOnline: online }),

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const queuedActions: QueuedAction[] = raw ? JSON.parse(raw) : [];
      set({ queuedActions, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  queueAction: async (action) => {
    const item: QueuedAction = {
      ...action,
      id: newId(),
      queuedAt: Date.now(),
    };
    const next = [...get().queuedActions, item];
    set({ queuedActions: next });
    await persist(next);
  },

  flushQueue: async () => {
    const items = get().queuedActions;
    if (items.length === 0) return [];
    // Clear the queue — caller is responsible for actually sending
    set({ queuedActions: [] });
    await AsyncStorage.removeItem(QUEUE_KEY);
    return items;
  },

  clearQueue: async () => {
    set({ queuedActions: [] });
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
}));
