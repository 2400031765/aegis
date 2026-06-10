import { Platform } from 'react-native';

let Voice: any = null;
const isNativePlatform = Platform.OS !== 'web';

async function loadVoiceModule(): Promise<any | null> {
  if (!isNativePlatform) return null;
  if (Voice) return Voice;

  try {
    const module = await import('@react-native-voice/voice');
    Voice = module.default ?? module;
    return Voice;
  } catch (err) {
    console.warn('[AEGIS Voice] Native voice module could not be loaded.', err);
    return null;
  }
}

function resetVoiceHandlers() {
  if (!Voice) return;
  try {
    Voice.onSpeechStart = null;
    Voice.onSpeechRecognized = null;
    Voice.onSpeechEnd = null;
    Voice.onSpeechError = null;
    Voice.onSpeechResults = null;
    Voice.onSpeechPartialResults = null;
  } catch {
    // ignore cleanup failures
  }
}

function extractTranscript(event: any): string {
  if (!event) return '';
  if (Array.isArray(event.value) && event.value.length > 0) {
    return event.value[0];
  }
  if (Array.isArray(event.results) && event.results.length > 0) {
    return event.results[0];
  }
  if (Array.isArray(event.partialResults) && event.partialResults.length > 0) {
    return event.partialResults[0];
  }
  return '';
}

export async function initNativeVoiceListeners(options: {
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onSpeechError: (error: unknown) => void;
  onSpeechResults: (text: string) => void;
  onSpeechPartialResults: (text: string) => void;
}): Promise<boolean> {
  const voice = await loadVoiceModule();
  if (!voice) return false;

  resetVoiceHandlers();

  voice.onSpeechStart = () => {
    options.onSpeechStart();
  };
  voice.onSpeechEnd = () => {
    options.onSpeechEnd();
  };
  voice.onSpeechError = (event: any) => {
    options.onSpeechError(event?.error ?? event);
  };
  voice.onSpeechResults = (event: any) => {
    const text = extractTranscript(event);
    if (text) {
      options.onSpeechResults(text);
    }
  };
  voice.onSpeechPartialResults = (event: any) => {
    const text = extractTranscript(event);
    if (text) {
      options.onSpeechPartialResults(text);
    }
  };

  return true;
}

export async function startNativeVoiceRecognition(language = 'en-IN'): Promise<boolean> {
  const voice = await loadVoiceModule();
  if (!voice) return false;

  try {
    await voice.start(language);
    return true;
  } catch (err) {
    console.warn('[AEGIS Voice] Failed to start recognition.', err);
    return false;
  }
}

export async function stopNativeVoiceRecognition(): Promise<void> {
  const voice = await loadVoiceModule();
  if (!voice) return;

  try {
    await voice.stop();
  } catch (err) {
    console.warn('[AEGIS Voice] stop() failed.', err);
  }
}

export async function destroyNativeVoiceRecognition(): Promise<void> {
  const voice = await loadVoiceModule();
  if (!voice) return;

  resetVoiceHandlers();

  try {
    await voice.destroy();
  } catch (err) {
    console.warn('[AEGIS Voice] destroy() failed.', err);
  }
}
