/**
 * AEGIS Gemma Service
 * ───────────────────
 * Routes all Gemma requests through the FastAPI backend proxy (/api/ai/gemma).
 * This eliminates CORS issues — the HF token never leaves the server.
 *
 * Flow: Frontend → Backend /api/ai/gemma → HF Inference API
 *
 * Contract:
 *   - Returns a fully-typed AIChatResponse on success
 *   - Throws on any failure (timeout, backend down, no BACKEND_URL)
 *   - The caller (aiService.chat) catches and falls back to localDangerAnalysis
 *   - Never touches emergency workflows, safeword logic, or SOS
 */

import type { AIChatResponse, AILocation, ChatMessageDTO, Risk, AIAction } from './ai';

// ─── Config ──────────────────────────────────────────────────────────────────

// Read inline — avoids Metro stale-cache issues with module-scope constants
const getBackendUrl = () => process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

/** Hard timeout in ms — prevents UI freeze if backend is slow */
const TIMEOUT_MS = 10000;

// ─── Startup diagnostic ───────────────────────────────────────────────────────
const _startupBackend = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
console.log(
  '[AEGIS Gemma] Module loaded:\n' +
  `  Backend URL : ${_startupBackend || 'NOT SET — Gemma proxy will be skipped'}\n` +
  `  Proxy route : ${_startupBackend}/api/ai/gemma`,
);

// ─── Type guards ─────────────────────────────────────────────────────────────

const VALID_ACTIONS = new Set<AIAction>([
  'activate_emergency_mode',
  'share_location',
  'contact_trusted_circle',
  'breathing_exercise',
  'grounding_exercise',
  'stay_calm',
  'move_to_safe_area',
  'call_local_authorities',
  'navigate_to_safe_place',
]);

const VALID_RISKS = new Set<Risk>(['low', 'medium', 'high']);

function parseProxyResponse(data: Record<string, unknown>): AIChatResponse {
  const risk: Risk = VALID_RISKS.has(data.risk as Risk) ? (data.risk as Risk) : 'low';

  const rawActions = Array.isArray(data.actions) ? data.actions : [];
  const actions: AIAction[] = rawActions.filter(
    (a): a is AIAction => typeof a === 'string' && VALID_ACTIONS.has(a as AIAction),
  );

  // Enforce critical actions for high risk
  if (risk === 'high') {
    const required: AIAction[] = ['activate_emergency_mode', 'share_location', 'contact_trusted_circle'];
    for (const a of required) {
      if (!actions.includes(a)) actions.unshift(a);
    }
  }

  return {
    reply: typeof data.reply === 'string' && data.reply.trim()
      ? data.reply.trim()
      : 'I am here with you. Stay calm.',
    risk,
    actions,
    reassurance: typeof data.reassurance === 'string' && data.reassurance.trim()
      ? data.reassurance.trim()
      : 'You are not alone. AEGIS is with you.',
    breathing: typeof data.breathing === 'string' && data.breathing.trim()
      ? data.breathing.trim()
      : null,
    guidance: typeof data.guidance === 'string' && data.guidance.trim()
      ? data.guidance.trim()
      : null,
    safeword: false,
    safeword_phrase: null,
    stealth_activate: false,
    nearby_places: [],       // populated by caller from GPS
    recommended_place: null, // populated by caller from GPS
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export interface GemmaChatParams {
  message: string;
  history?: ChatMessageDTO[];
  location?: AILocation | null;
}

/**
 * Call Gemma via the backend proxy.
 * Throws on any failure — caller must catch and fall back.
 */
export async function gemmaChat(params: GemmaChatParams): Promise<AIChatResponse> {
  const BACKEND = getBackendUrl();

  if (!BACKEND) {
    throw new Error('EXPO_PUBLIC_BACKEND_URL not set — skipping Gemma proxy');
  }

  const url = `${BACKEND}/api/ai/gemma`;

  console.log(
    `[AEGIS Gemma] Using Gemma\n` +
    `  proxy   : ${url}\n` +
    `  message : "${params.message.slice(0, 80)}${params.message.length > 80 ? '…' : ''}"`,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[AEGIS Gemma] Timeout after ${TIMEOUT_MS}ms — Gemma failed, using fallback AI`);
    controller.abort();
  }, TIMEOUT_MS);

  const t0 = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: params.message,
        history: (params.history ?? []).slice(-4).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        location: params.location ?? null,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = Date.now() - t0;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(
        `[AEGIS Gemma] HTTP ${res.status} in ${elapsed}ms — Gemma failed, using fallback AI\n` +
        `  body: ${body.slice(0, 200)}`,
      );
      throw new Error(`Gemma proxy HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const parsed = parseProxyResponse(data);

    console.log(
      `[AEGIS Gemma] Gemma response success (${elapsed}ms)\n` +
      `  source  : ${String(data.source ?? 'gemma')}\n` +
      `  risk    : ${parsed.risk}\n` +
      `  actions : [${parsed.actions.join(', ')}]\n` +
      `  reply   : "${parsed.reply.slice(0, 100)}${parsed.reply.length > 100 ? '…' : ''}"`,
    );

    return parsed;
  } catch (err) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - t0;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    if (!isAbort) {
      console.error(
        `[AEGIS Gemma] Gemma failed, using fallback AI (${elapsed}ms)\n` +
        `  reason: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    throw err;
  }
}
