import AsyncStorage from '@react-native-async-storage/async-storage';

const buildUserStorageKey = (userId: string | null | undefined, key: string) => {
  if (!userId) return null;
  return `aegis.user.${userId}.${key}`;
};

export const loadUserStorageJson = async <T>(
  userId: string | null | undefined,
  key: string,
  fallback: T,
): Promise<T> => {
  const storageKey = buildUserStorageKey(userId, key);
  if (!storageKey) return fallback;

  try {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const saveUserStorageJson = async (
  userId: string | null | undefined,
  key: string,
  value: unknown,
): Promise<void> => {
  const storageKey = buildUserStorageKey(userId, key);
  if (!storageKey) return;

  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore failing local storage writes
  }
};

export const loadUserStorageString = async (
  userId: string | null | undefined,
  key: string,
): Promise<string | null> => {
  const storageKey = buildUserStorageKey(userId, key);
  if (!storageKey) return null;

  try {
    return await AsyncStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

export const saveUserStorageString = async (
  userId: string | null | undefined,
  key: string,
  value: string,
): Promise<void> => {
  const storageKey = buildUserStorageKey(userId, key);
  if (!storageKey) return;

  try {
    await AsyncStorage.setItem(storageKey, value);
  } catch {
    // ignore failing local storage writes
  }
};

export const removeUserStorageKey = async (
  userId: string | null | undefined,
  key: string,
): Promise<void> => {
  const storageKey = buildUserStorageKey(userId, key);
  if (!storageKey) return;

  try {
    await AsyncStorage.removeItem(storageKey);
  } catch {
    // ignore failing local storage removes
  }
};
