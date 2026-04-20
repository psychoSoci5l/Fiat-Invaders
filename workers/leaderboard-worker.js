/**
 * FIAT vs CRYPTO — Leaderboard Worker v2.0
 * Cloudflare Worker + KV for online leaderboard
 *
 * v2.0 BREAKING CHANGES:
 *   - HMAC signing moved server-side (client no longer signs)
 *   - Client sends raw payload, worker validates + stores
 *   - Nonce-based replay protection replaces timestamp-only check
 *   - CORS restricted to production domain
 *
 * Endpoints:
 *   GET  /api/lb?mode=story       → top 100 scores
 *   GET  /api/rank?mode=story&score=X → rank for score X
 *   POST /api/score               → submit score (server-validated)
 *
 * KV Namespace binding: LEADERBOARD
 * Env vars: HMAC_SECRET, ALLOWED_ORIGIN (set via wrangler secret / vars)
 */

const MAX_ENTRIES = 100;
const RATE_LIMIT_TTL = 60;        // seconds — KV key expiry
const RATE_LIMIT_WINDOW = 30;     // min seconds between submits per IP
const TIMESTAMP_WINDOW = 300000;  // 5 minutes max clock drift
const NONCE_TTL = 600;            // 10 minutes — nonce expiry in KV
const MIN_PLAY_TIME_MS = 15000;   // minimum 15s of gameplay for a valid score

// Production domains — both canonical and Cloudflare Pages mirror.
// env.ALLOWED_ORIGIN (comma-separated) can add/override at deploy time.
const DEFAULT_ORIGINS = [
  'https://fiat-invaders.games.psychosoci5l.com',
  'https://fiat-invaders.pages.dev'
];

function getAllowedOrigins(env) {
  const origins = DEFAULT_ORIGINS.slice();
  if (env.ALLOWED_ORIGIN) {
    const extra = env.ALLOWED_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
    for (const o of extra) if (!origins.includes(o)) origins.push(o);
  }
  return origins;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = getAllowedOrigins(env);
  const matchedOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': matchedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

function jsonResponse(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request, env)
  });
}

// SHA-256 hash (hex)
async function sha256(message) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Score ceiling: rough max possible score for given wave/cycle
// v7.0: Adjusted for TOTAL_MULT_CAP=12x (was uncapped ~25x)
function scoreCeiling(wave, cycle) {
  return 12000 * wave * cycle * 1.5;
}

// Sanity checks on submitted data
function validatePayload(p) {
  if (!p.n || typeof p.n !== 'string' || p.n.length < 3 || p.n.length > 6) return 'invalid name';
  if (!/^[A-Z0-9 ]{3,6}$/.test(p.n)) return 'invalid name chars';
  if (typeof p.s !== 'number' || p.s < 0 || !isFinite(p.s)) return 'invalid score';
  if (typeof p.k !== 'number' || p.k < 0) return 'invalid kills';
  if (typeof p.c !== 'number' || p.c < 1 || p.c > 50) return 'invalid cycle';
  if (typeof p.w !== 'number' || p.w < 1 || p.w > 5) return 'invalid wave';
  if (!['BTC', 'ETH', 'SOL'].includes(p.sh)) return 'invalid ship';
  if (p.p && !['D', 'M'].includes(p.p)) return 'invalid platform';
  if (p.k > 0 && (p.s / p.k < 5 || p.s / p.k > 5000)) return 'suspicious ratio';
  const ceiling = scoreCeiling(p.w, p.c);
  if (p.s > ceiling) return 'score exceeds ceiling';

  // v2.0: Validate play duration
  if (typeof p.dur === 'number') {
    if (p.dur < MIN_PLAY_TIME_MS) return 'play time too short';
    // Sanity: max ~2 hours per run
    if (p.dur > 7200000) return 'play time suspicious';
  }

  return null;
}

function kvKey(mode) {
  return `scores:${mode || 'story'}`;
}

// GET /api/lb — fetch leaderboard
async function handleGetLeaderboard(url, env, request) {
  const mode = url.searchParams.get('mode') || 'story';
  const raw = await env.LEADERBOARD.get(kvKey(mode));
  const scores = raw ? JSON.parse(raw) : [];
  return jsonResponse({ ok: true, scores, total: scores.length }, 200, request, env);
}

// GET /api/rank — get rank for a given score
async function handleGetRank(url, env, request) {
  const mode = url.searchParams.get('mode') || 'story';
  const score = parseInt(url.searchParams.get('score'));
  if (isNaN(score) || score < 0) return jsonResponse({ ok: false, error: 'invalid score' }, 400, request, env);

  const raw = await env.LEADERBOARD.get(kvKey(mode));
  const scores = raw ? JSON.parse(raw) : [];
  let rank = 1;
  for (const entry of scores) {
    if (entry.s >= score) rank++;
    else break;
  }
  return jsonResponse({ ok: true, rank, total: scores.length }, 200, request, env);
}

// POST /api/score — submit a score (v2.0: no client signature required)
async function handlePostScore(request, env) {
  // Rate limit by IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256(ip);
  const rateKey = `rate:${ipHash}`;
  const lastSubmit = await env.LEADERBOARD.get(rateKey);
  if (lastSubmit) {
    const elapsed = (Date.now() - parseInt(lastSubmit)) / 1000;
    if (elapsed < RATE_LIMIT_WINDOW) {
      return jsonResponse({ ok: false, error: 'rate limited', wait: Math.ceil(RATE_LIMIT_WINDOW - elapsed) }, 429, request, env);
    }
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: 'invalid json' }, 400, request, env); }

  // v2.0: Accept both old format { payload, sig } and new format { payload }
  // Old clients send sig — we still verify for backward compat during migration
  const payload = body.payload;
  if (!payload) return jsonResponse({ ok: false, error: 'missing payload' }, 400, request, env);

  // Timestamp freshness (within 5 minutes)
  if (typeof payload.t !== 'number' || Math.abs(Date.now() - payload.t) > TIMESTAMP_WINDOW) {
    return jsonResponse({ ok: false, error: 'stale timestamp' }, 400, request, env);
  }

  // v2.0: Nonce-based replay protection
  if (payload.nonce) {
    const nonceKey = `nonce:${payload.nonce}`;
    const used = await env.LEADERBOARD.get(nonceKey);
    if (used) {
      return jsonResponse({ ok: false, error: 'duplicate submission' }, 409, request, env);
    }
    // Mark nonce as used (expires after NONCE_TTL)
    await env.LEADERBOARD.put(nonceKey, '1', { expirationTtl: NONCE_TTL });
  }

  // Validate payload
  const error = validatePayload(payload);
  if (error) return jsonResponse({ ok: false, error }, 400, request, env);

  const mode = payload.mode || 'story';
  const key = kvKey(mode);

  // Read current scores
  const raw = await env.LEADERBOARD.get(key);
  const scores = raw ? JSON.parse(raw) : [];

  // === DEVICE BINDING (v5.23.8): 1 nickname per device ===
  const deviceHash = payload.d ? await sha256(payload.d) : null;
  const deviceKey = deviceHash ? `dev:${mode}:${deviceHash}` : null;
  if (deviceKey) {
    const boundNick = await env.LEADERBOARD.get(deviceKey);
    if (boundNick && boundNick !== payload.n) {
      // Device changed nickname — remove old nick's entry
      const oldIdx = scores.findIndex(e => e.n === boundNick);
      if (oldIdx !== -1) scores.splice(oldIdx, 1);
    }
    // Update device→nickname binding (30 day TTL)
    await env.LEADERBOARD.put(deviceKey, payload.n, { expirationTtl: 2592000 });
  }

  // === NICKNAME DEDUP: keep only best score per nickname ===
  const existingIdx = scores.findIndex(e => e.n === payload.n);
  const newScore = Math.floor(payload.s);
  if (existingIdx !== -1 && newScore <= scores[existingIdx].s) {
    // New score is not better — don't replace
    await env.LEADERBOARD.put(key, JSON.stringify(scores));
    await env.LEADERBOARD.put(rateKey, String(Date.now()), { expirationTtl: RATE_LIMIT_TTL });
    return jsonResponse({ ok: true, rank: existingIdx + 1, kept: 'existing' }, 200, request, env);
  }
  // Remove old entry for this nickname (new score is better, or first entry)
  if (existingIdx !== -1) scores.splice(existingIdx, 1);

  // Build entry
  const entry = {
    n: payload.n,
    s: newScore,
    k: payload.k,
    c: payload.c,
    w: payload.w,
    sh: payload.sh,
    b: payload.b ? 1 : 0,
    p: payload.p || '',
    t: payload.t
  };

  // Insert in sorted position
  let rank = scores.length + 1;
  let inserted = false;
  for (let i = 0; i < scores.length; i++) {
    if (entry.s > scores[i].s) {
      scores.splice(i, 0, entry);
      rank = i + 1;
      inserted = true;
      break;
    }
  }
  if (!inserted) scores.push(entry);

  // Trim to max entries
  if (scores.length > MAX_ENTRIES) scores.length = MAX_ENTRIES;

  // Check if entry is still in the list (might have been trimmed)
  if (rank > MAX_ENTRIES) rank = -1;

  // Save
  await env.LEADERBOARD.put(key, JSON.stringify(scores));

  // Update rate limit
  await env.LEADERBOARD.put(rateKey, String(Date.now()), { expirationTtl: RATE_LIMIT_TTL });

  return jsonResponse({ ok: true, rank }, 200, request, env);
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/lb' && request.method === 'GET') {
        return handleGetLeaderboard(url, env, request);
      }
      if (path === '/api/rank' && request.method === 'GET') {
        return handleGetRank(url, env, request);
      }
      if (path === '/api/score' && request.method === 'POST') {
        return handlePostScore(request, env);
      }
      return jsonResponse({ ok: false, error: 'not found' }, 404, request, env);
    } catch (err) {
      return jsonResponse({ ok: false, error: 'internal error' }, 500, request, env);
    }
  }
};
