import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  type AuthError,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';

export interface AegisUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
  provider: 'password' | 'google' | 'guest' | 'demo';
  createdAt?: number;
}

const toAegisUser = (
  fb: FirebaseUser,
  provider: AegisUser['provider'],
  isGuest = false,
): AegisUser => ({
  uid: fb.uid,
  email: fb.email,
  displayName: fb.displayName,
  isGuest,
  provider,
  createdAt: Date.now(),
});

const ensureProfile = async (user: AegisUser) => {
  if (!db) return;
  const ref = doc(db, 'users', user.uid);
  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      provider: user.provider,
      isGuest: user.isGuest,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
};

const ensureProfileBestEffort = async (user: AegisUser) => {
  try {
    await Promise.race([
      ensureProfile(user),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('profile-sync-timeout')), 4000);
      }),
    ]);
  } catch (error) {
    console.warn('Profile sync skipped:', error);
  }
};

// ---------- Demo (no-Firebase) fallback ----------
const demoUser = (email: string, name?: string): AegisUser => ({
  uid: 'demo-' + Math.random().toString(36).slice(2, 10),
  email,
  displayName: name ?? null,
  isGuest: false,
  provider: 'demo',
  createdAt: Date.now(),
});

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const toAuthMessage = (error: unknown, mode: 'signin' | 'signup' | 'reset' | 'google') => {
  const code = (error as Partial<AuthError> | null)?.code;

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/missing-password':
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled in Firebase Authentication.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Authentication settings.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return mode === 'signin'
        ? 'Incorrect email/password, or this app is connected to the wrong Firebase project.'
        : 'Firebase rejected the provided credentials. Check your Firebase configuration.';
    case 'auth/user-not-found':
      return 'No account exists for that email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured for this project.';
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }

      switch (mode) {
        case 'signup':
          return 'Could not create account.';
        case 'reset':
          return 'Could not send reset email.';
        case 'google':
          return 'Google sign-in failed.';
        default:
          return 'Sign in failed.';
      }
  }
};

// ---------- Public API ----------
export const authService = {
  isConfigured: () => isFirebaseConfigured,

  async signUp(email: string, password: string, name: string): Promise<AegisUser> {
    if (!isFirebaseConfigured || !auth) {
      return demoUser(email, name);
    }

    try {
      const normalizedEmail = normalizeEmail(email);
      const trimmedName = name.trim();
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      if (trimmedName) await updateProfile(cred.user, { displayName: trimmedName });
      const user = toAegisUser(cred.user, 'password');
      user.displayName = trimmedName || user.displayName;
      void ensureProfileBestEffort(user);
      return user;
    } catch (error) {
      throw new Error(toAuthMessage(error, 'signup'));
    }
  },

  async signIn(email: string, password: string): Promise<AegisUser> {
    if (!isFirebaseConfigured || !auth) {
      return demoUser(email);
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      const user = toAegisUser(cred.user, 'password');
      void ensureProfileBestEffort(user);
      return user;
    } catch (error) {
      throw new Error(toAuthMessage(error, 'signin'));
    }
  },

  async signInAsGuest(): Promise<AegisUser> {
    if (!isFirebaseConfigured || !auth) {
      return {
        uid: 'guest-' + Math.random().toString(36).slice(2, 10),
        email: null,
        displayName: 'Guest',
        isGuest: true,
        provider: 'guest',
        createdAt: Date.now(),
      };
    }
    const cred = await signInAnonymously(auth);
    const user = toAegisUser(cred.user, 'guest', true);
    user.displayName = user.displayName || 'Guest';
    void ensureProfileBestEffort(user);
    return user;
  },

  async signInWithGoogleIdToken(idToken: string): Promise<AegisUser> {
    if (!isFirebaseConfigured || !auth) {
      return demoUser('google-user@aegis.demo', 'Google User');
    }

    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const cred = await signInWithCredential(auth, credential);
      const user = toAegisUser(cred.user, 'google');
      void ensureProfileBestEffort(user);
      return user;
    } catch (error) {
      throw new Error(toAuthMessage(error, 'google'));
    }
  },

  async sendResetEmail(email: string): Promise<void> {
    if (!isFirebaseConfigured || !auth) {
      // demo: pretend success
      await new Promise((r) => setTimeout(r, 600));
      return;
    }

    try {
      await sendPasswordResetEmail(auth, normalizeEmail(email));
    } catch (error) {
      throw new Error(toAuthMessage(error, 'reset'));
    }
  },

  async signOut(): Promise<void> {
    if (!isFirebaseConfigured || !auth) return;
    await fbSignOut(auth);
  },
};

export const validators = {
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  password: (v: string) => v.length >= 6,
  name: (v: string) => v.trim().length >= 2,
};
