# TODO — Fix AEGIS AI voice-to-text pipeline

## Step 1 — Locate existing transcription/whisper pipeline
- [x] Search backend for whisper / transcription endpoints/routes
- [x] Search frontend for any STT/whisper invocation used previously
- [ ] Identify where “native whisper-1 wiring” used to exist (not present in current repo snapshot)


## Step 2 — Implement native voice-to-text trigger on mic stop
- [ ] Update `frontend/app/(app)/assistant.tsx` so native mic stop produces transcript
- [ ] Ensure transcript is auto-sent into chat using existing `onSend()` / `chatStore.sendUserMessage`

## Step 3 — Prevent recording conflicts
- [ ] Ensure AI voice recording does not conflict with emergency evidence `expo-av` recording
- [ ] If conflict exists, suspend/stop emergency recording only during STT, then restore

## Step 4 — Preserve existing features
- [ ] Verify whisper mode still works
- [ ] Verify safeword detection + stealth emergency activation still works
- [ ] Verify SOS activation + emergency evidence recording are unchanged

## Step 5 — Validate
- [ ] Web voice-to-text still works
- [ ] Expo mobile voice-to-text works (native)
- [ ] Confirm cleanup: recording/mic resources released after stop

