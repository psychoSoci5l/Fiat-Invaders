/**
 * FIAT vs CRYPTO — Leaderboard Worker
 * Cloudflare Worker + KV for online leaderboard
 *
 * Endpoints:
 *   GET  /api/lb?mode=story       → top 100 scores
 *   GET  /api/rank?mode=story&score=X → rank for score X
 *   POST /api/score               → submit score (HMAC signed)
 *
 * KV Namespace binding: LEADERBOARD
 * Secret: HMAC_SECRET (set via wrangler secret)
 */

const MAX_ENTRIES = 100;
const RATE_LIMIT_TTL = 60;   // seconds
const RATE_LIMIT_WINDOW = 30; // min seconds between submits per IP

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

// SHA-256 hash (hex)
async function sha256(message) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA256 verify
async function verifyHMAC(message, signature, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

// Score ceiling: rough max possible score
function scoreCeiling(wave, cycle) {
  return 15000 * wave * cycle * 1.5;
}

// Sanity checks on submitted data
function validatePayload(p) {
  if (!p.n || typeof p.n !== 'string' || p.n.length < 3 || p.n.length > 6) return 'invalid name';
  if (!/^[A-Z0-9 ]{3,6}$/.test(p.n)) return 'invalid name chars';
  if (typeof p.s !== 'number' || p.s < 0 || !isFinite(p.s)) return 'invalid score';
  if (typeof p.k !== 'number' || p.k < 0) return 'invalid kills';
  if (typeof p.c !== 'number' || p.c < 1 || p.c > 50) return 'invalid cycle';
  if (typeof p.w !== 'number' || p.w < 1 || p.w > 5) return 'invalid wave';
  if (!['BTC','ETH','SOL'].includes(p.sh)) return 'invalid ship';
  if (p.p && !['D','M'].includes(p.p)) return 'invalid platform';
  if (p.k > 0 && (p.s / p.k < 5 || p.s / p.k > 5000)) return 'suspicious ratio';
  const ceiling = scoreCeiling(p.w, p.c);
  if (p.s > ceiling) return 'score exceeds ceiling';
  return null;
}

function kvKey(mode) {
  return `scores:${mode || 'story'}`;
}

// GET /api/lb — fetch leaderboard
async function handleGetLeaderboard(url, env) {
  const mode = url.searchParams.get('mode') || 'story';
  const raw = await env.LEADERBOARD.get(kvKey(mode));
  const scores = raw ? JSON.parse(raw) : [];
  return jsonResponse({ ok: true, scores, total: scores.length });
}

// GET /api/rank — get rank for a given score
async function handleGetRank(url, env) {
  const mode = url.searchParams.get('mode') || 'story';
  const score = parseInt(url.searchParams.get('score'));
  if (isNaN(score) || score < 0) return jsonResponse({ ok: false, error: 'invalid score' }, 400);

  const raw = await env.LEADERBOARD.get(kvKey(mode));
  const scores = raw ? JSON.parse(raw) : [];
  let rank = 1;
  for (const entry of scores) {
    if (entry.s >= score) rank++;
    else break;
  }
  return jsonResponse({ ok: true, rank, total: scores.length });
}

// POST /api/score — submit a score
async function handlePostScore(request, env) {
  // Rate limit by IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256(ip);
  const rateKey = `rate:${ipHash}`;
  const lastSubmit = await env.LEADERBOARD.get(rateKey);
  if (lastSubmit) {
    const elapsed = (Date.now() - parseInt(lastSubmit)) / 1000;
    if (elapsed < RATE_LIMIT_WINDOW) {
      return jsonResponse({ ok: false, error: 'rate limited', wait: Math.ceil(RATE_LIMIT_WINDOW - elapsed) }, 429);
    }
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: 'invalid json' }, 400); }

  const { payload, sig } = body;
  if (!payload || !sig) return jsonResponse({ ok: false, error: 'missing fields' }, 400);

  // Verify HMAC (v5.23.8: includes device ID if present)
  let message = `${payload.s}|${payload.k}|${payload.c}|${payload.w}|${payload.sh}|${payload.mode}|${payload.p || ''}|${payload.t}`;
  if (payload.d) message += `|${payload.d}`;
  const valid = await verifyHMAC(message, sig, env.HMAC_SECRET);
  if (!valid) return jsonResponse({ ok: false, error: 'invalid signature' }, 403);

  // Timestamp freshness (within 5 minutes)
  if (Math.abs(Date.now() - payload.t) > 300000) {
    return jsonResponse({ ok: false, error: 'stale timestamp' }, 400);
  }

  // Validate payload
  const error = validatePayload(payload);
  if (error) return jsonResponse({ ok: false, error }, 400);

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

  // === NICKNAME DEDUP (v5.23.8): keep only best score per nickname ===
  const existingIdx = scores.findIndex(e => e.n === payload.n);
  const newScore = Math.floor(payload.s);
  if (existingIdx !== -1 && newScore <= scores[existingIdx].s) {
    // New score is not better — don't replace, return current rank
    // Still save in case device binding removed another entry above
    await env.LEADERBOARD.put(key, JSON.stringify(scores));
    await env.LEADERBOARD.put(rateKey, String(Date.now()), { expirationTtl: RATE_LIMIT_TTL });
    return jsonResponse({ ok: true, rank: existingIdx + 1, kept: 'existing' });
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
  if (rank > MAX_ENTRIES) rank = -1; // Not on leaderboard

  // Save
  await env.LEADERBOARD.put(key, JSON.stringify(scores));

  // Update rate limit
  await env.LEADERBOARD.put(rateKey, String(Date.now()), { expirationTtl: RATE_LIMIT_TTL });

  return jsonResponse({ ok: true, rank });
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/lb' && request.method === 'GET') {
        return handleGetLeaderboard(url, env);
      }
      if (path === '/api/rank' && request.method === 'GET') {
        return handleGetRank(url, env);
      }
      if (path === '/api/score' && request.method === 'POST') {
        return handlePostScore(request, env);
      }
      return jsonResponse({ ok: false, error: 'not found' }, 404);
    } catch (err) {
      return jsonResponse({ ok: false, error: 'internal error' }, 500);
    }
  }
};
