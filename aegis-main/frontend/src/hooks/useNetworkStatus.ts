/**
 * useNetworkStatus
 * Lightweight hook that tracks online/offline state using NetInfo.
 * Falls back gracefully if NetInfo is unavailable (web/test environments).
 *
 * Returns:
 *   isOnline  — current connectivity state (true = connected)
 *   wasOffline — true for one render cycle after reconnecting (for "back online" notice)
 */

import { useEffect, useRef, useState } from 'react';

// Dynamic import so the app doesn't crash if NetInfo isn't installed
let NetInfo: typeof import('@react-native-community/netinfo') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NetInfo = require('@react-native-community/netinfo');
} catch {
  NetInfo = null;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const prevOnline = useRef(true);
  // Track whether we've received the first real state (avoid false "offline" flash on mount)
  const initialised = useRef(false);

  useEffect(() => {
    if (!NetInfo) return; // graceful no-op if package missing

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;

      if (!initialised.current) {
        // First event — set initial state silently
        initialised.current = true;
        prevOnline.current = connected;
        setIsOnline(connected);
        return;
      }

      if (!prevOnline.current && connected) {
        // Just came back online
        setWasOffline(true);
        setTimeout(() => setWasOffline(false), 4000); // show "back online" for 4s
      }

      prevOnline.current = connected;
      setIsOnline(connected);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, wasOffline };
}
