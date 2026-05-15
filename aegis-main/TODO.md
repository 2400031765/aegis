# TODO — AEGIS AI voice-to-text pipeline

## Step 1: Add backend transcription endpoint
- [ ] Add `POST /api/ai/transcribe` route under `backend/routes/ai.py` (or new file).
- [ ] Implement minimal transcription service.

## Step 2: Implement transcription (choose runtime)
- [ ] Decide transcription backend runtime: Whisper/OpenAI/Faster-Whisper.
- [ ] Add required backend deps if missing.

## Step 3: Wire native mic stop → transcribe → send
- [ ] Update `frontend/app/(app)/assistant.tsx`:
  - [ ] start native recording on mic start
  - [ ] stop recording on mic stop and upload to `/api/ai/transcribe`
  - [ ] set transcript and call existing `onSend(transcript)`

## Step 4: Ensure recording separation
- [ ] Verify emergency evidence recording and AI voice recording do not stop each other incorrectly.
- [ ] Add guard/lock if needed.

