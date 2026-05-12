import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
  selectedForSos?: boolean;
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

const KEY = 'aegis.contacts';

const persist = (contacts: TrustedContact[]) =>
  AsyncStorage.setItem(KEY, JSON.stringify(contacts));

export const useContactsStore = create<State & Actions>((set, get) => ({
  contacts: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const contacts: TrustedContact[] = raw ? JSON.parse(raw) : [];
      set({ contacts, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  addContact: async (c) => {
    const next: TrustedContact = {
      ...c,
      id: 'tc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      selectedForSos: c.selectedForSos ?? true,
    };
    const contacts = [...get().contacts, next];
    set({ contacts });
    await persist(contacts);
    return next;
  },

  updateContact: async (id, patch) => {
    const contacts = get().contacts.map((c) => (c.id === id ? { ...c, ...patch } : c));
    set({ contacts });
    await persist(contacts);
  },

  removeContact: async (id) => {
    const contacts = get().contacts.filter((c) => c.id !== id);
    set({ contacts });
    await persist(contacts);
  },

  toggleSelected: async (id) => {
    const contacts = get().contacts.map((c) =>
      c.id === id ? { ...c, selectedForSos: !c.selectedForSos } : c,
    );
    set({ contacts });
    await persist(contacts);
  },
}));

export const getSelectedContacts = (): TrustedContact[] =>
  useContactsStore.getState().contacts.filter((c) => c.selectedForSos !== false);
