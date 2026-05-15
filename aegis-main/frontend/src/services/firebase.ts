import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
/**
 * Firebase configuration is loaded from EXPO_PUBLIC_* env vars.
 * If keys are missing, the app runs in "demo mode" using local AsyncStorage
 * so the UI remains functional during development.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);



let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
  }
).getReactNativePersistence;

if (isFirebaseConfigured) {
  app = getApps()[0] || initializeApp(firebaseConfig);

  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    try {
      auth = getReactNativePersistence
        ? initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        })
        : getAuth(app);
    } catch {
      auth = getAuth(app);
    }
  }

  db = getFirestore(app);
}

export { app, auth, db };

export const FIREBASE_GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';