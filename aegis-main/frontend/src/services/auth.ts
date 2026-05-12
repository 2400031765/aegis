import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
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

// ---------- Demo (no-Firebase) fallback ----------
const demoUser = (email: string, name?: string): AegisUser => ({
  uid: 'demo-' + Math.random().toString(36).slice(2, 10),
  email,
  displayName: name ?? null,
  isGuest: false,
  provider: 'demo',
  createdAt: Date.now(),
});

// ---------- Public API ----------
export const authService = {
  isConfigured: () => isFirebaseConfigured,

  async signUp(email: string, password: string, name: string): Promise<AegisUser> {
    if (!isFirebaseConfigured || !auth) {
      return demoUser(email, name);
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    const user = toAegisUser(cred.user, 'password');
    user.displayName = name || user.displayName;
    await ensureProfile(user);
    return user;
  },

  async signIn(email: string, password: string): Promise<AegisUser> {
    if (!isFirebaseConfigured || !auth) {
      return demoUser(email);
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = toAegisUser(cred.user, 'password');
    await ensureProfile(user);
    return user;
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
    await ensureProfile(user);
    return user;
  },

  async signInWithGoogleIdToken(idToken: string): Promise<AegisUser> {
    if (!isFirebaseConfigured || !auth) {
      return demoUser('google-user@aegis.demo', 'Google User');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    const user = toAegisUser(cred.user, 'google');
    await ensureProfile(user);
    return user;
  },

  async sendResetEmail(email: string): Promise<void> {
    if (!isFirebaseConfigured || !auth) {
      // demo: pretend success
      await new Promise((r) => setTimeout(r, 600));
      return;
    }
    await sendPasswordResetEmail(auth, email);
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
