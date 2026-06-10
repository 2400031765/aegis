import { create } from 'zustand';
import { getAuthSnapshot, useAuthStore } from './authStore';
import { loadUserStorageJson, saveUserStorageJson } from '../services/userStorage';

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
  selectedForSos?: boolean;
  userId?: string;
}

interface State {
  contacts: TrustedContact[];
  hydrated: boolean;
}

interface Actions {
  hydrate: () => Promise<void>;
  addContact: (c: Omit<TrustedContact, 'id'>) => Promise<TrustedContact>;
  updateContact: (id: string, patch: Partial<TrustedContact>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  toggleSelected: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'contacts';

const persist = (contacts: TrustedContact[], userId: string | null) =>
  saveUserStorageJson(userId, STORAGE_KEY, contacts);

export const useContactsStore = create<State & Actions>((set, get) => ({
  contacts: [],
  hydrated: false,

  hydrate: async () => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    if (!userId) {
      set({ contacts: [], hydrated: true });
      return;
    }

    try {
      const contacts: TrustedContact[] = await loadUserStorageJson(userId, STORAGE_KEY, []);
      set({ contacts, hydrated: true });
    } catch {
      set({ contacts: [], hydrated: true });
    }
  },

  addContact: async (c) => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    if (!userId) {
      return {
        ...c,
        id: 'tc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        selectedForSos: c.selectedForSos ?? true,
      };
    }

    const next: TrustedContact = {
      ...c,
      id: 'tc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      selectedForSos: c.selectedForSos ?? true,
      userId,
    };
    const contacts = [...get().contacts, next];
    set({ contacts });
    await persist(contacts, userId);
    return next;
  },

  updateContact: async (id, patch) => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    const contacts = get().contacts.map((c) => (c.id === id ? { ...c, ...patch } : c));
    set({ contacts });
    await persist(contacts, userId);
  },

  removeContact: async (id) => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    const contacts = get().contacts.filter((c) => c.id !== id);
    set({ contacts });
    await persist(contacts, userId);
  },

  toggleSelected: async (id) => {
    const userId = getAuthSnapshot().user?.uid ?? null;
    const contacts = get().contacts.map((c) =>
      c.id === id ? { ...c, selectedForSos: !c.selectedForSos } : c,
    );
    set({ contacts });
    await persist(contacts, userId);
  },
}));

useAuthStore.subscribe(
  (state) => state.user?.uid,
  (userId, prevUserId) => {
    if (userId !== prevUserId) {
      useContactsStore.setState({ contacts: [], hydrated: false });
    }
  },
);

export const getSelectedContacts = (): TrustedContact[] =>
  useContactsStore.getState().contacts.filter((c) => c.selectedForSos !== false);
