import * as Location from 'expo-location';
import { LocationEventEmitter } from 'expo-location/build/LocationEventEmitter';
import { Platform } from 'react-native';

export interface AegisLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

const toAegis = (loc: Location.LocationObject): AegisLocation => ({
  latitude: loc.coords.latitude,
  longitude: loc.coords.longitude,
  accuracy: loc.coords.accuracy,
  altitude: loc.coords.altitude,
  heading: loc.coords.heading,
  speed: loc.coords.speed,
  timestamp: loc.timestamp,
});

type RemovableSubscription = { remove?: () => void };
type ExpoLocationEmitterWithLegacyCleanup = typeof LocationEventEmitter & {
  removeSubscription?: (subscription: RemovableSubscription | null | undefined) => void;
};

let locationEmitterPatched = false;

const ensureLocationEmitterCleanupPatch = () => {
  if (locationEmitterPatched) return;
  locationEmitterPatched = true;

  const emitter = LocationEventEmitter as ExpoLocationEmitterWithLegacyCleanup;
  if (typeof emitter.removeSubscription !== 'function') {
    emitter.removeSubscription = (subscription) => {
      subscription?.remove?.();
    };
  }
};

const removeLocationSubscription = (subscription: Location.LocationSubscription | null) => {
  try {
    subscription?.remove();
  } catch {
    // Cleanup must never crash emergency exit. Expo may already have removed it.
  }
};

export const locationService = {
  async ensurePermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
    if (Platform.OS === 'web') {
      // expo-location works on web via the browser geolocation API
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      return { granted: status === 'granted', canAskAgain };
    }
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.status === 'granted') {
      return { granted: true, canAskAgain: existing.canAskAgain };
    }
    const req = await Location.requestForegroundPermissionsAsync();
    return { granted: req.status === 'granted', canAskAgain: req.canAskAgain };
  },

  async getCurrent(): Promise<AegisLocation> {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return toAegis(loc);
  },

  /**
   * Subscribe to live updates. Returns an unsubscribe function.
   */
  watch(onUpdate: (loc: AegisLocation) => void, intervalMs = 5000): () => void {
    ensureLocationEmitterCleanupPatch();

    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: intervalMs,
        distanceInterval: 5,
      },
      (loc) => {
        if (!cancelled) onUpdate(toAegis(loc));
      },
    ).then((s) => {
      if (cancelled) {
        removeLocationSubscription(s);
      } else {
        sub = s;
      }
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      removeLocationSubscription(sub);
      sub = null;
    };
  },
};

export const formatCoord = (n: number, decimals = 5) => n.toFixed(decimals);
export const formatAccuracy = (m: number | null) =>
  m == null ? '— m' : `${Math.round(m)} m`;
