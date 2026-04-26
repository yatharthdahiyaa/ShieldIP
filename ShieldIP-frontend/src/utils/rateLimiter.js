// ─── Gemini API Rate Limiter ────────────────────────────────────────────────
// Limits: 5 req/min, 30 req/day — stored in localStorage to survive page reloads

const STORAGE_KEY = 'shieldip_gemini_rl';
const MAX_PER_MINUTE = 5;
const MAX_PER_DAY = 30;

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Returns { allowed: boolean, reason: string|null }
 * Call this BEFORE every Gemini API request.
 * Call recordRequest() only if the call actually proceeds.
 */
export function checkRateLimit() {
  const now = Date.now();
  const state = loadState();

  // Clean up timestamps older than 24h
  const dayAgo = now - 86400000;
  const minuteAgo = now - 60000;
  const allTs = (state.timestamps || []).filter(t => t > dayAgo);

  const perMinute = allTs.filter(t => t > minuteAgo).length;
  const perDay = allTs.length;

  if (perMinute >= MAX_PER_MINUTE) {
    const nextAllowed = Math.ceil((allTs.filter(t => t > minuteAgo)[0] + 60000 - now) / 1000);
    return { allowed: false, reason: `Rate limit: ${MAX_PER_MINUTE} requests/min. Retry in ~${nextAllowed}s.` };
  }
  if (perDay >= MAX_PER_DAY) {
    return { allowed: false, reason: `Daily limit of ${MAX_PER_DAY} AI requests reached. Resets at midnight.` };
  }

  return { allowed: true, reason: null };
}

/** Record that a Gemini request was made. Call after checkRateLimit() passes. */
export function recordRequest() {
  const now = Date.now();
  const state = loadState();
  const dayAgo = now - 86400000;
  const allTs = (state.timestamps || []).filter(t => t > dayAgo);
  allTs.push(now);
  saveState({ timestamps: allTs });
}

/** Returns current usage stats for display. */
export function getRateLimitStats() {
  const now = Date.now();
  const state = loadState();
  const dayAgo = now - 86400000;
  const minuteAgo = now - 60000;
  const allTs = (state.timestamps || []).filter(t => t > dayAgo);
  return {
    usedToday: allTs.length,
    maxDay: MAX_PER_DAY,
    usedThisMinute: allTs.filter(t => t > minuteAgo).length,
    maxMinute: MAX_PER_MINUTE,
    remainingToday: Math.max(0, MAX_PER_DAY - allTs.length),
  };
}
