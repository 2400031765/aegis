import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, type AegisUser } from '../services/auth';
import { setLocale, getDeviceLocale } from '../i18n';

const KEYS = {
  user: 'aegis.user',
  language: 'aegis.language',
  onboarded: 'aegis.onboarded',
};

interface State {
  user: AegisUser | null;
  language: string;
  hasOnboarded: boolean;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
}

interface Actions {
  hydrate: () => Promise<void>;
  setLanguage: (code: string) => Promise<void>;
  setOnboarded: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AegisUser>;
  signUp: (email: string, password: string, name: string) => Promise<AegisUser>;
  signInAsGuest: () => Promise<AegisUser>;
  signInWithGoogle: (idToken: string) => Promise<AegisUser>;
  sendReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<State & Actions>((set, get) => ({
  user: null,
  language: getDeviceLocale(),
  hasOnboarded: false,
  loading: false,
  error: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const [u, lang, ob] = await Promise.all([
        AsyncStorage.getItem(KEYS.user),
        AsyncStorage.getItem(KEYS.language),
        AsyncStorage.getItem(KEYS.onboarded),
      ]);
      const language = lang || getDeviceLocale();
      setLocale(language);
      set({
        user: u ? (JSON.parse(u) as AegisUser) : null,
        language,
        hasOnboarded: ob === '1',
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  setLanguage: async (code) => {
    setLocale(code);
    await AsyncStorage.setItem(KEYS.language, code);
    set({ language: code });
  },

  setOnboarded: async () => {
    await AsyncStorage.setItem(KEYS.onboarded, '1');
    set({ hasOnboarded: true });
  },

signIn: async (email, password) => {
  console.log("START LOGIN");

  set({ loading: true, error: null });

  try {
    const user = await authService.signIn(email, password);

    console.log("LOGIN SUCCESS", user);

    await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));

    set({
      user,
      loading: false,
      error: null,
    });

    return user;
  } catch (e: unknown) {
    console.log("LOGIN ERROR", e);

    const msg = e instanceof Error ? e.message : 'Sign in failed';

    set({
      loading: false,
      error: msg,
    });

    throw e;
  }
},

  signUp: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.signUp(email, password, name);
      await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
      set({ user, loading: false });
      return user;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign up failed';
      set({ loading: false, error: msg });
      throw e;
    }
  },

  signInAsGuest: async () => {
    set({ loading: true, error: null });
    try {
      const user = await authService.signInAsGuest();
      await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
      set({ user, loading: false });
      return user;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Guest sign-in failed';
      set({ loading: false, error: msg });
      throw e;
    }
  },

  signInWithGoogle: async (idToken: string) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.signInWithGoogleIdToken(idToken);
      await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
      set({ user, loading: false });
      return user;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Google sign-in failed';
      set({ loading: false, error: msg });
      throw e;
    }
  },

  sendReset: async (email: string) => {
    set({ loading: true, error: null });
    try {
      await authService.sendResetEmail(email);
      set({ loading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Reset failed';
      set({ loading: false, error: msg });
      throw e;
    }
  },

  signOut: async () => {
    await authService.signOut();
    await AsyncStorage.removeItem(KEYS.user);
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));

// helper for components to read current state without subscribing
export const getAuthSnapshot = () => useAuthStore.getState();
