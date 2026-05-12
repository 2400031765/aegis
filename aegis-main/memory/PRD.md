# AEGIS — Product Requirements Document

## Overview
**AEGIS** (Adaptive Emergency Guidance and Intelligence Security) is an AI-powered women safety mobile application built with React Native + Expo. It detects danger proactively and assists users during emergencies through distress detection, Smart Emergency Mode, SafeWalk, emergency contact alerts, multilingual support, and adaptive AI guidance.

> Stack note: original spec mentioned Flutter — adapted to React Native + Expo. All other functional/visual requirements preserved.

## Tech Stack
- **Frontend:** React Native + Expo SDK 54, Expo Router 6 (file-based routes)
- **Animations:** React Native Animated API
- **Styling:** StyleSheet + design tokens (`src/theme`), `expo-linear-gradient`, `expo-blur` (glassmorphism)
- **Typography:** `@expo-google-fonts/outfit` + `@expo-google-fonts/plus-jakarta-sans`
- **State management:** Zustand (`src/store/authStore.ts`)
- **Auth & DB:** Firebase JS SDK (`firebase`) — Authentication + Firestore
- **Localization:** `expo-localization` + `i18n-js`
- **Local persistence:** `@react-native-async-storage/async-storage`

## Modules Delivered

### Module 1 — Splash + Theme + Navigation
- Cinematic combined splash screen matching the user-supplied reference
- AEGIS logo blended naturally into the dark UI (transparent icon + radial aura + cinematic gradient strip — no white container)
- Side-by-side logo + WELCOME TO + AEGIS wordmark
- Bracketed tagline `[ ADAPTIVE EMERGENCY GUIDANCE AND INTELLIGENCE SECURITY ]`
- 4 feature tiles: Smart Emergency Response, AI-Powered Threat Detection, SafeWalk Companion, Real-time Location Sharing
- Wide horizontal magenta→purple→blue **GET STARTED** pill button
- Design tokens at `src/theme/index.ts`

### Module 5 — Adaptive Safety Navigation (Location-Aware AI Guidance)
- **Backend `services/safe_places.py`** — provider-abstracted nearby safe-place service. Default `MockSafePlacesProvider` deterministically generates 8 safe POIs (police, hospital, pharmacy, metro, 24/7 store, shelter, public area, fire station) around any user lat/lon using haversine math + seeded RNG. Architecture is async-shaped so a real Google Places / OSM Overpass / HERE provider drops in by setting `AEGIS_SAFE_PLACES_PROVIDER`.
- **`pick_recommendation(places, risk)`** — risk-aware heuristic: HIGH → nearest police/hospital/fire_station within 800m, MEDIUM → nearest crowded/24-7/metro within 600m, LOW → highest-priority closest. Returns a single `SafePlace` to feature.
- **AI service upgrade** — system prompt now instructs Gemini to use the provided `nearby_places` and emit `recommended_place_id` + `guidance` (one-line directional instruction). The response schema gained two fields surfaced in the typed `AIReply`.
- **Route changes (`/api/ai/chat`)** — accepts optional `location: {latitude, longitude, accuracy}`, fetches nearby safe places, feeds them into the LLM, and resolves the chosen `recommended_place` (with heuristic fallback for medium/high risk if the LLM returns null). New endpoint `POST /api/ai/safe-places` exposes the raw list.
- **Frontend AI service abstraction** updated with `SafePlace`, `SAFE_PLACE_META` icon/colour map per type, `aiService.safePlaces()`, and a new `navigate_to_safe_place` action.
- **Chat store** automatically requests live GPS (best-effort, never blocking) before each AI call and stores `recommendedPlace`, `nearbyPlaces`, `guidance` on the assistant message.
- **`SafePlaceCard` component** — premium glassmorphism card with type-coloured icon box, distance, cardinal direction, open-now status, "RECOMMENDED" pill, magenta guidance block, gradient "Navigate to Safety" CTA that opens the system maps app (iOS Maps / Android geo / web Google Maps).
- **AI Assistant screen integration** — inside each AI bubble, after the action chips: featured highlighted SafePlaceCard + horizontal "OTHER NEARBY SAFE ZONES" scroll with up to 5 alternatives.
- **Verified live**: User says *"someone is following me right now please help"* → location captured → AI returns *"...The City Police Outpost is 374m to the West. Move towards it immediately."* with featured Police Station card + alternatives, all open-now.

### Module 4 — AI Distress Intelligence System (Gemma-Compatible)
- **FastAPI backend** at `/api/ai/*`:
  - `services/ai_service.py` — provider-abstracted AI service (`AIProvider` protocol). Default provider is `GeminiProvider` using `gemini-2.0-flash`. Architecture is swap-ready for a real Gemma deployment (Vertex AI / self-hosted) without touching routes.
  - System prompt enforces JSON output: `{reply, risk, actions, reassurance, breathing}`
  - `services/safeword.py` — **flexible safeword detector** (substring + token-Jaccard fuzzy match, threshold 0.7). Default catalog: "aegis help", "call aunt maya", "i forgot my blue notebook", "blue notebook", "grandma's recipe", etc.
  - `routes/ai.py` exposes `POST /api/ai/chat`, `POST /api/ai/safeword/check`, `GET /api/ai/health`. Local rule-based **fallback** kicks in if the LLM is unavailable so the app stays responsive.
- **Frontend AI Assistant (`/(app)/assistant`):**
  - Premium futuristic chat UI: gradient user bubbles, glassmorphism AI bubbles with risk badges (`LOW RISK` green / `MEDIUM RISK` amber / `HIGH RISK` magenta)
  - AI greeting — *"Hello, I'm AEGIS AI. How can I help keep you safe today?"* with reassurance line
  - **Typing indicator** with bouncing magenta dots + "AEGIS IS THINKING…" label
  - **Risk-coloured action chips** below each reply — primary "Activate Emergency Mode" chip routes to the existing countdown screen
  - Reassurance line + breathing/grounding tip rendered with subtle heart/leaf icons under each AI reply
  - **Try saying** quick-action chips on first open (4 example distress phrases)
  - **Voice input mic button** (gradient, listening shows pink stop button + waveform overlay). Web uses `SpeechRecognition` API; native shows listening UI ready for whisper-1 wiring in Module 5.
  - **Stealth/whisper mode** — if backend detects safeword, frontend shows a calm, non-alarming reply ("Of course. I'm setting that up for you right now.") then **silently navigates to Smart Emergency Mode after 2.5s** without revealing any alarming UI.
- **Frontend AI service abstraction** at `src/services/ai.ts` — clean async `aiService.chat()` and `aiService.checkSafeword()` with typed response models.
- **Zustand chat store** (`src/store/chatStore.ts`) — session id, messages array (greeting auto-injected), thinking/error state, history pruning to last 8 turns sent to LLM, stealth-pending flag consumed once by Assistant screen.
- **Dashboard integration** — "AI Threat" tile replaced with a highlighted **AEGIS AI** tile with magenta border + glow that opens the assistant.

### Module 2 — Onboarding Continuation, Localization & Authentication
- **Multilingual onboarding (`/language`):**
  - Indian languages: English, Hindi, Telugu, Tamil, Bengali, Kannada, Marathi
  - Auto-detects device language (shown with magenta "AUTO" pill)
  - **More Languages** expandable section adds Gujarati, Punjabi, Malayalam, Odia, Urdu, Assamese, Spanish, French, Arabic, Portuguese
  - Glassmorphism cards with purple-glow selected state
  - Saves to AsyncStorage via Zustand store
- **Authentication (`/auth/*`):**
  - **Login** — Email/password + Google + Continue as Guest, Forgot Password link, "Welcome Back / Stay safe. Stay fearless." copy
  - **Signup** — Full name, email, password + confirm with inline validation
  - **Forgot Password** — email field → success state
  - **Firebase Auth integration** with `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `signInAnonymously`, `sendPasswordResetEmail`, `signInWithCredential` (Google)
  - **Firestore profile creation** on signup (`users/{uid}`)
  - **Demo mode fallback** when Firebase env vars are empty — UI fully usable without credentials

### Module 3 — Smart Emergency System + SOS Infrastructure
- **Dashboard upgrade (`/(app)/dashboard`):**
  - Massive glowing **SOS button** (`SOSButton` component): perpetual pulse + two outward-expanding rings + magenta→purple→indigo gradient + heavy haptic feedback on press
  - "You are protected" status indicator with breathing green dot
  - Trusted Circle shortcut card showing how many contacts will be alerted
- **Countdown screen (`/(app)/emergency/countdown`):**
  - Full-screen immersive red/magenta gradient background
  - Animated 5-second countdown with bouncing number, two pulsing concentric rings, per-tick heavy haptic
  - Glowing pink core circle + "Cancel Alert" button below
  - Auto-activates Smart Emergency Mode at 0
- **Smart Emergency Mode (`/(app)/emergency/active`):**
  - Pulsing "EMERGENCY MODE ACTIVE" banner
  - Live `mm:ss` duration timer with magenta glow
  - Animated recording waveform (`Waveform` component, 32 bars)
  - **Live GPS location card** with grid-map preview, animated pulsing pin, latitude/longitude/accuracy, refresh button
  - Trusted Circle queue showing contacts with "QUEUED" status
  - "Send Emergency Alert" button (gradient) → builds payload + shows confirmation
  - "Stop Alert" button → returns to dashboard
  - Live `expo-location` subscription updates every 5s (5m distance threshold)
- **Trusted Contacts CRUD (`/(app)/contacts`):**
  - Add contact (name, phone, optional relation) with inline validation
  - Per-contact toggle for "alert during SOS" and remove button
  - Empty state card
  - Persisted to AsyncStorage via `useContactsStore`
- **State management — Zustand stores:**
  - `useEmergencyStore` — phase machine (`idle | countdown | active | sent | cancelled`), countdown ticker, location, permission status, recording flag, payload builder, sendAlert (architecture-ready)
  - `useContactsStore` — contacts CRUD with selectedForSos toggle
- **Emergency payload** (architecture for Module 5 dispatch):
  ```ts
  { userId, userName, email, type: 'sos', triggeredAt, location, battery, contacts, language, message }
  ```
  Battery via `expo-battery`. **Real SMS / FCM dispatch deferred to Module 5** as requested.
- **Permissions:** `expo-location` foreground permission with retry, info-plist & android `permissions` declarations added in `app.json`
- **Multilingual onboarding (`/language`):**
  - Indian languages: English, Hindi, Telugu, Tamil, Bengali, Kannada, Marathi
  - Auto-detects device language (shown with magenta "AUTO" pill)
  - **More Languages** expandable section adds Gujarati, Punjabi, Malayalam, Odia, Urdu, Assamese, Spanish, French, Arabic, Portuguese
  - Glassmorphism cards with purple-glow selected state
  - Saves to AsyncStorage via Zustand store
- **Authentication (`/auth/*`):**
  - **Login** (`/auth/login`) — Email/password + Google + Continue as Guest, Forgot Password link, "Welcome Back / Stay safe. Stay fearless." copy
  - **Signup** (`/auth/signup`) — Full name, email, password + confirm with inline validation
  - **Forgot Password** (`/auth/forgot`) — email field → success state
  - **Firebase Auth integration** with: `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `signInAnonymously`, `sendPasswordResetEmail`, `signInWithCredential` (Google)
  - **Firestore profile creation** on signup (`users/{uid}`)
  - **Demo mode fallback** when Firebase env vars are empty — UI fully usable without credentials
  - All inputs have animated purple-glow focus state, password visibility toggles
- **Dashboard placeholder (`/(app)/dashboard`):**
  - Logo blended top-left, language indicator, greeting with user name
  - SOS card with gradient "Activate SOS" button
  - 4 feature cards (SafeWalk, Trusted Circle, Voice Alert, AI Threat) — placeholders for next module

## Folder Structure
```
/app/frontend
├── app/                           # Expo Router routes
│   ├── _layout.tsx                # Root stack + font + auth hydration
│   ├── index.tsx                  # Splash (combined intro)
│   ├── language.tsx               # Language selection
│   ├── auth/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgot.tsx
│   └── (app)/
│       ├── _layout.tsx
│       └── dashboard.tsx
├── src/
│   ├── theme/                     # Design tokens
│   ├── components/                # AegisLogo, BlendedLogo, GlassCard, GradientButton, GradientText, AmbientBackground, Text, FormField, AuthHeader
│   ├── hooks/                     # useAegisFonts
│   ├── i18n/                      # languages.ts, index.ts (i18n setup, device locale detect)
│   ├── services/                  # firebase.ts, auth.ts
│   └── store/                     # authStore.ts (Zustand)
└── assets/images/                 # aegis-icon.png (transparent), aegis-logo.png, bg-glow.png, neural-shield.png
```

## Test IDs
- `splash-get-started-btn`
- `lang-back-btn`, `lang-option-{en|hi|te|ta|bn|kn|mr|...}`, `lang-toggle-more`, `lang-continue-btn`
- `login-email`, `login-password`, `login-forgot-link`, `login-submit-btn`, `login-google-btn`, `login-guest-btn`, `login-go-signup`
- `signup-name`, `signup-email`, `signup-password`, `signup-confirm`, `signup-submit-btn`, `signup-go-login`
- `forgot-email`, `forgot-submit-btn`, `forgot-go-login`, `forgot-back-btn`
- `dashboard-signout-btn`, `dashboard-sos-btn`

## Logo Branding Approach
The AEGIS logo is **blended directly into the dark UI** — no white circular badge or isolated container:
- The original PNG (white background) was processed with PIL to create a transparent icon (`aegis-icon.png`)
- `BlendedLogo` component renders this with:
  - A pulsing radial purple aura behind the icon
  - Optional cinematic horizontal gradient strip (magenta→purple) for hero usage
- This makes the brand identity feel embedded, premium, and cinematic

## Demo Mode
Firebase env vars in `/app/frontend/.env` are empty. The app detects this and:
- Shows a magenta info banner on Login: *"Demo mode — Firebase not configured. Authentication is local-only."*
- Auth calls return synthetic users persisted only to AsyncStorage
- "Continue as Guest" works without any credentials
- Replace env vars with real Firebase Web App config to enable live Firebase Auth + Firestore

## Roadmap
- **Module 3:** Real SOS button with countdown, location permissions (`expo-location`), live tracking map, emergency contacts CRUD
- **Module 4:** AI distress detection backend (FastAPI + Gemma/Gemini), voice keyword trigger (Expo AV), audio recording
- **Module 5:** Push notifications (FCM), shake-to-trigger, multilingual TTS guidance
- **Module 6:** Backend hardening, real-time alerts, admin dashboard, SafeWalk live tracking with Google Maps
