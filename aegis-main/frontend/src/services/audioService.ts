/**
 * AEGIS Audio Recording Service
 * ──────────────────────────────
 * Manages emergency audio evidence recording using expo-av.
 *
 * Design:
 *  - Starts recording when emergency mode activates
 *  - Continues while user chats, navigates, or uses other features
 *  - Never blocks the UI — all operations are async
 *  - Stores recordings in the app's document directory
 *  - Gracefully no-ops on web (expo-av recording not supported in browser)
 *  - Safe to call start/stop multiple times
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Dynamic import — expo-av may not be available in all environments
let Audio: typeof import('expo-av').Audio | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Audio = require('expo-av').Audio;
} catch {
  Audio = null;
}

export interface RecordingInfo {
  uri: string;
  filename: string;
  startedAt: number;
  durationMs: number;
  stoppedAt?: number;
}

// Module-level recording instance — persists across component re-renders
let _recording: InstanceType<typeof import('expo-av').Audio.Recording> | null = null;
let _startedAt: number | null = null;
let _filename: string | null = null;
let _sound: InstanceType<typeof import('expo-av').Audio.Sound> | null = null;

const EVIDENCE_DIR = `${FileSystem.documentDirectory ?? ''}aegis-evidence/`;

async function ensureEvidenceDirectory() {
  if (!FileSystem.documentDirectory) return null;
  const dirInfo = await FileSystem.getInfoAsync(EVIDENCE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(EVIDENCE_DIR, { intermediates: true });
  }
  return EVIDENCE_DIR;
}

/**
 * Request microphone permission.
 * Returns true if granted, false otherwise.
 */
export async function requestAudioPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || !Audio) return false;
  try {
    const { granted } = await Audio.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Start recording emergency audio.
 * Safe to call if already recording — returns existing session info.
 */
export async function startRecording(): Promise<RecordingInfo | null> {
  if (Platform.OS === 'web' || !Audio) {
    console.log('[AEGIS Audio] Recording not supported on web — skipping');
    return null;
  }

  // Already recording — return current session
  if (_recording) {
    const status = await _recording.getStatusAsync().catch(() => null);
    if (status?.isRecording) {
      return {
        uri: _recording.getURI() ?? '',
        filename: _filename ?? 'aegis_emergency.m4a',
        startedAt: _startedAt ?? Date.now(),
        durationMs: status.durationMillis ?? 0,
      };
    }
  }

  try {
    // Set audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    _filename = `aegis_emergency_${timestamp}.m4a`;

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );

    _recording = recording;
    _startedAt = Date.now();

    console.log(`[AEGIS Audio] Recording started — file: ${_filename}`);

    return {
      uri: recording.getURI() ?? '',
      filename: _filename,
      startedAt: _startedAt,
      durationMs: 0,
    };
  } catch (err) {
    console.error('[AEGIS Audio] Failed to start recording:', err);
    _recording = null;
    _startedAt = null;
    _filename = null;
    return null;
  }
}

/**
 * Stop the current recording and return the saved file info.
 */
export async function stopRecording(): Promise<RecordingInfo | null> {
  if (!_recording) return null;

  try {
    await _recording.stopAndUnloadAsync();
    const sourceUri = _recording.getURI() ?? '';
    const durationMs = _startedAt ? Date.now() - _startedAt : 0;
    const stoppedAt = Date.now();
    const filename = _filename ?? 'aegis_emergency.m4a';
    let uri = sourceUri;

    try {
      const dir = await ensureEvidenceDirectory();
      if (dir && sourceUri) {
        const destination = `${dir}${filename}`;
        await FileSystem.moveAsync({ from: sourceUri, to: destination });
        uri = destination;
      }
    } catch {
      uri = sourceUri;
    }

    const info: RecordingInfo = {
      uri,
      filename,
      startedAt: _startedAt ?? Date.now(),
      durationMs,
      stoppedAt,
    };

    console.log(
      `[AEGIS Audio] Recording stopped\n` +
      `  file     : ${info.filename}\n` +
      `  duration : ${Math.round(durationMs / 1000)}s\n` +
      `  uri      : ${uri}`,
    );

    _recording = null;
    _startedAt = null;
    _filename = null;

    // Reset audio mode
    if (Audio) {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      }).catch(() => undefined);
    }

    return info;
  } catch (err) {
    console.error('[AEGIS Audio] Failed to stop recording:', err);
    _recording = null;
    _startedAt = null;
    _filename = null;
    return null;
  }
}

/**
 * Play a saved emergency evidence recording inside the app.
 */
export async function playRecording(uri: string, onFinished?: () => void): Promise<void> {
  if (Platform.OS === 'web' || !Audio || !uri) return;

  await stopPlayback();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
  });

  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
  _sound = sound;
  sound.setOnPlaybackStatusUpdate((status) => {
    if ('didJustFinish' in status && status.didJustFinish) {
      stopPlayback().catch(() => undefined);
      onFinished?.();
    }
  });
}

export async function stopPlayback(): Promise<void> {
  if (!_sound) return;
  const sound = _sound;
  _sound = null;
  await sound.stopAsync().catch(() => undefined);
  await sound.unloadAsync().catch(() => undefined);
}

/**
 * Get current recording status without stopping.
 */
export async function getRecordingStatus(): Promise<{
  isRecording: boolean;
  durationMs: number;
  filename: string | null;
  uri: string | null;
}> {
  if (!_recording) {
    return { isRecording: false, durationMs: 0, filename: null, uri: null };
  }

  try {
    const status = await _recording.getStatusAsync();
    return {
      isRecording: status.isRecording ?? false,
      durationMs: status.durationMillis ?? (_startedAt ? Date.now() - _startedAt : 0),
      filename: _filename,
      uri: _recording.getURI() ?? null,
    };
  } catch {
    return { isRecording: false, durationMs: 0, filename: _filename, uri: null };
  }
}

/**
 * Format recording duration as MM:SS
 */
export function formatRecordingDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
