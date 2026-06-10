import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, type AegisUser } from '../services/auth';
import { setLocale, getDeviceLocale } from '../i18n';
import { loadUserStorageString, saveUserStorageString } from '../services/userStorage';

const KEYS = {
  user: 'aegis.user',
  language: 'aegis.language',
  onboarded: 'aegis.onboarded',
};

const USER_LANGUAGE_KEY = 'language';

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

      const user = u ? (JSON.parse(u) as AegisUser) : null;
      const userLanguage = user ? await loadUserStorageString(user.uid, USER_LANGUAGE_KEY) : null;
      const language = userLanguage || lang || getDeviceLocale();
      setLocale(language);
      set({
        user,
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
    const userId = get().user?.uid ?? null;
    if (userId) {
      await saveUserStorageString(userId, USER_LANGUAGE_KEY, code);
    } else {
      await AsyncStorage.setItem(KEYS.language, code);
    }
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
    const userLanguage = await loadUserStorageString(user.uid, USER_LANGUAGE_KEY);
    const language = userLanguage || getDeviceLocale();
    setLocale(language);
    await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));

    set({
      user,
      language,
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
      const userLanguage = await loadUserStorageString(user.uid, USER_LANGUAGE_KEY);
      const language = userLanguage || getDeviceLocale();
      setLocale(language);
      await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
      set({ user, language, loading: false });
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
      const userLanguage = await loadUserStorageString(user.uid, USER_LANGUAGE_KEY);
      const language = userLanguage || getDeviceLocale();
      setLocale(language);
      await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
      set({ user, language, loading: false });
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
      const userLanguage = await loadUserStorageString(user.uid, USER_LANGUAGE_KEY);
      const language = userLanguage || getDeviceLocale();
      setLocale(language);
      await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
      set({ user, language, loading: false });
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
    const language = getDeviceLocale();
    setLocale(language);
    set({ user: null, language });
  },

  clearError: () => set({ error: null }),
}));

// helper for components to read current state without subscribing
export const getAuthSnapshot = () => useAuthStore.getState();
