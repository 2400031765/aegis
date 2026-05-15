/**
 * AEGIS SafeWalk Store
 * ─────────────────────
 * Manages the full SafeWalk session lifecycle:
 *   setup → active → escalated → completed / cancelled
 *
 * Deliberately lightweight — no geofencing, no heavy background loops.
 * Uses a single interval for ETA countdown + periodic check-in prompts.
 * Coexists safely with emergency mode, SOS, and offline mode.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationService, type AegisLocation } from '../services/location';

const CACHE_KEY = 'aegis.safewalk_session';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafeWalkPhase =
  | 'idle'        // not started
  | 'active'      // walk in progress
  | 'escalated'   // ETA missed or check-in ignored — showing warning
  | 'completed'   // user arrived safely
  | 'cancelled';  // user cancelled mid-walk

export interface SafeWalkSession {
  destination: string;
  note: string;
  etaMinutes: number;       // 0 = no ETA set
  startedAt: number;        // Date.now()
  elapsedMs: number;        // ticked every second
  remainingMs: number;      // ETA countdown in ms (0 if no ETA)
  location: AegisLocation | null;
  checkInDue: boolean;      // true when a check-in prompt should show
  checkInCount: number;     // how many check-ins have been prompted
  escalationCount: number;  // how many times escalated without response
}

interface State {
  phase: SafeWalkPhase;
  session: SafeWalkSession | null;
  permissionStatus: 'unknown' | 'granted' | 'denied';
  /** Interval ID — stored so we can clear it on stop */
  _tickIntervalId: ReturnType<typeof setInterval> | null;
}

interface Actions {
  /** Start a new SafeWalk session */
  start: (params: { destination: string; note: string; etaMinutes: number }) => Promise<void>;
  /** Tick every second — called by the screen's useEffect interval */
  tick: () => void;
  /** User confirmed they are safe (dismisses check-in prompt) */
  confirmSafe: () => void;
  /** User manually marks arrival */
  complete: () => void;
  /** User cancels the walk */
  cancel: () => void;
  /** Refresh GPS location */
  refreshLocation: () => Promise<void>;
  /** Acknowledge escalation — resets escalation state */
  acknowledgeEscalation: () => void;
  /** Internal: clear the tick interval */
  _clearInterval: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const newSession = (
  destination: string,
  note: string,
  etaMinutes: number,
): SafeWalkSession => ({
  destination,
  note,
  etaMinutes,
  startedAt: Date.now(),
  elapsedMs: 0,
  remainingMs: etaMinutes > 0 ? etaMinutes * 60 * 1000 : 0,
  location: null,
  checkInDue: false,
  checkInCount: 0,
  escalationCount: 0,
});

/** Check-in prompt fires every N minutes of active walk */
const CHECK_IN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSafeWalkStore = create<State & Actions>((set, get) => ({
  phase: 'idle',
  session: null,
  permissionStatus: 'unknown',
  _tickIntervalId: null,

  start: async ({ destination, note, etaMinutes }) => {
    // Clear any existing interval before starting
    get()._clearInterval();

    const session = newSession(destination, note, etaMinutes);
    set({ phase: 'active', session });

    // Persist session for recovery
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ destination, note, etaMinutes, startedAt: session.startedAt })).catch(() => undefined);

    // Request location permission and get initial fix
    try {
      const perm = await locationService.ensurePermission();
      set({ permissionStatus: perm.granted ? 'granted' : 'denied' });
      if (perm.granted) {
        const loc = await locationService.getCurrent();
        set((s) => ({
          session: s.session ? { ...s.session, location: loc } : s.session,
        }));
      }
    } catch {
      // Non-fatal — walk continues without GPS
    }
    // Notify emergency timeline if an emergency session exists
    try {
      // dynamic import to avoid circular dependency issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const emergency = require('./emergencyStore');
      if (emergency && emergency.useEmergencyStore) {
        emergency.useEmergencyStore.getState().addTimelineEvent('SafeWalk activated');
      }
    } catch {
      // ignore
    }
  },

  tick: () => {
    const { phase, session } = get();
    if (phase !== 'active' && phase !== 'escalated') return;
    if (!session) return;

    const now = Date.now();
    const elapsedMs = now - session.startedAt;
    const remainingMs = session.etaMinutes > 0
      ? Math.max(0, session.etaMinutes * 60 * 1000 - elapsedMs)
      : 0;

    // Determine if a check-in is due (every CHECK_IN_INTERVAL_MS)
    const checkInsDue = Math.floor(elapsedMs / CHECK_IN_INTERVAL_MS);
    const checkInDue = checkInsDue > session.checkInCount;

    // ETA expired → escalate
    const etaExpired = session.etaMinutes > 0 && remainingMs === 0;

    const updated: SafeWalkSession = {
      ...session,
      elapsedMs,
      remainingMs,
      checkInDue,
    };

    if (etaExpired && phase === 'active') {
      set({
        phase: 'escalated',
        session: { ...updated, escalationCount: session.escalationCount + 1 },
      });
    } else {
      set({ session: updated });
    }
  },

  confirmSafe: () => {
    const { session } = get();
    if (!session) return;
    set({
      phase: 'active',
      session: {
        ...session,
        checkInDue: false,
        checkInCount: session.checkInCount + 1,
        escalationCount: 0,
      },
    });
  },

  complete: () => {
    get()._clearInterval();
    AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
    set({ phase: 'completed' });
  },

  cancel: () => {
    get()._clearInterval();
    AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
    set({ phase: 'cancelled', session: null });
    // Reset to idle after brief delay so UI can show cancelled state
    setTimeout(() => {
      if (get().phase === 'cancelled') set({ phase: 'idle' });
    }, 500);
  },

  refreshLocation: async () => {
    try {
      const perm = await locationService.ensurePermission();
      set({ permissionStatus: perm.granted ? 'granted' : 'denied' });
      if (!perm.granted) return;
      const loc = await locationService.getCurrent();
      set((s) => ({
        session: s.session ? { ...s.session, location: loc } : s.session,
      }));
    } catch {
      // Non-fatal
    }
  },

  acknowledgeEscalation: () => {
    const { session } = get();
    if (!session) return;
    set({
      phase: 'active',
      session: { ...session, escalationCount: 0, checkInDue: false },
    });
  },

  _clearInterval: () => {
    const { _tickIntervalId } = get();
    if (_tickIntervalId !== null) {
      clearInterval(_tickIntervalId);
      set({ _tickIntervalId: null });
    }
  },
}));

// ─── Formatters ───────────────────────────────────────────────────────────────

export const formatWalkDuration = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

export const formatEtaRemaining = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};
