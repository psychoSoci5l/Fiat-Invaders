# ADR-0006: Cloudflare Workers Leaderboard Backend

## Status
Accepted (Updated for v2.0)

## Date
2026-04-25 (v1.0) — 2026-05-01 (v2.0)

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Cloudflare Workers + KV (leaderboard backend) |
| **Domain** | Networking / Backend |
| **Knowledge Risk** | LOW — Cloudflare Workers API is stable and well-documented |
| **References Consulted** | `workers/leaderboard-worker.js`, `workers/wrangler.toml` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | Endpoint responses, rate limiting, nonce replay protection |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | Score submission and leaderboard display in Arcade mode |
| **Blocks** | None |
| **Ordering Note** | Backend is independent of game engine; game code uses LeaderboardClient to communicate |

## Context

### Problem Statement
Arcade mode tracks persistent high scores that should be shared across devices. Without a backend, scores are local-only (localStorage) and players cannot compare runs. The backend must accept score submissions, return a leaderboard, and prevent tampering — all without any server management overhead.

### Constraints
- Must be serverless (no dedicated server to manage)
- Must use KV storage for low-latency global reads
- Must verify score authenticity (prevent forged submissions)
- Must integrate with the existing Cloudflare Pages deployment
- Minimum viable: top-N leaderboard + score submission + authentication
- Zero cost at low traffic volume (Workers free tier)

### Requirements
- Accept score submissions from the game client
- Validate payload server-side (play-time, score ceiling, rate limiting)
- Prevent replay attacks via nonce-based deduplication
- Return top N scores for leaderboard display
- Store scores with player name, score value, timestamp, and metadata (cycle, wave, ship)
- Device-bound nicknames (1 nickname per device, prevent impersonation)
- CORS restricted to production domains

## Decision

Use a Cloudflare Worker with KV storage for the leaderboard backend. **v2.0 moved all security logic server-side** — the client no longer signs payloads.

### Architecture (v2.0)

```
Game Client (LeaderboardClient.js)
  │  POST /api/score { n, s, k, c, w, sh, nonce, t }
  ▼
Cloudflare Worker (leaderboard-worker.js)
  │  1. Rate limit check (per-IP, 30s window)
  │  2. Timestamp freshness (±5 min)
  │  3. Nonce replay protection (KV-backed, 10min TTL)
  │  4. Payload validation (score ceiling, ratio, play-time)
  │  5. Device binding (1 nickname per device)
  │  6. Nickname dedup (keep best score per nickname)
  │  7. Store in KV (sorted, max 100 entries)
  ▼
Cloudflare KV (global, low-latency reads)
  │
  ▼
Game Client
  ← 200 { ok, rank } or 4xx with error description
```

### Key Interfaces (v2.0)

```js
// Worker entry point
export default {
  async fetch(request, env) {
    GET  /api/lb?mode=story      → top 100 scores
    GET  /api/rank?mode=story&score=X → rank for score X
    POST /api/score              → submit score (server-validated)
  }
};

// v2.0: No client-side HMAC. Server validates:
// - Payload structure (validatePayload)
// - Play duration ≥ 15s
// - Score ceiling: 12000 * wave * cycle * 1.5
// - Kill/score ratio in [5, 5000]
// - Nonce uniqueness (replay prevention)
// - Rate limit (30s between submissions per IP)

// Device binding (SHA-256 of device ID)
const deviceKey = `dev:${mode}:${sha256(deviceId)}`;
// If device changes nickname, old entry is removed

// KV storage (sorted insert, max 100 entries)
await env.LEADERBOARD.put(key, JSON.stringify(scores));
```

### Security Model (v2.0)

- **No client-side signing key** — the HMAC key was removed in v2.0 because embedding it in client JS provides no real security
- **Server-side validation**: play-time minimum (15s), score ceiling per wave/cycle, kill/score ratio sanity
- **Nonce-based replay protection**: each submission includes a unique nonce; used nonces are stored in KV with 10min TTL
- **IP rate limiting**: max 1 submission per 30s per IP (SHA-256 hashed)
- **Device binding**: 1 nickname per device, with 30-day KV TTL

## Alternatives Considered

### Alternative 1: Firebase/Firestore
- **Description**: Google Firebase as leaderboard backend
- **Pros**: Managed database, auth, SDK available
- **Cons**: Adds external dependency; requires SDK bundling; Firebase free tier has read limits
- **Rejection Reason**: Overkill for a simple top-N leaderboard. Cloudflare Workers + KV integrates natively with the Cloudflare Pages deployment already in use.

### Alternative 2: localStorage only
- **Description**: No backend — scores are local-only
- **Pros**: Zero infrastructure, no security concerns
- **Cons**: No cross-device comparison; no community leaderboard; reduces replay incentive
- **Rejection Reason**: Leaderboard is a core feature of Arcade mode's replay loop (see arcade-rogue-protocol.md).

## Consequences

### Positive
- Zero ops — Workers + KV require no server management
- Global low-latency reads via KV edge cache
- Server-side validation prevents trivial score forgery without exposing a signing key
- Free tier covers low-traffic usage
- Device binding prevents nickname squatting across devices

### Negative
- KV is eventually consistent — scores may lag by ~1s globally
- KV write limits (1KB per key) mean the entire score list must fit in one key or be paginated
- Server-side validation cannot detect sophisticated cheating (modified game clients)
- Nonce-based replay protection requires a KV read per submission (adds latency)

### Risks
- Sophisticated cheaters can modify the game client to submit arbitrary scores
  - **Mitigation**: Score ceiling per wave/cycle, minimum play-time, kill/score ratio sanity, and IP rate limiting raise the bar. True anti-cheat would require a server-authoritative game loop, which is out of scope.
- KV write throughput limited (1 write/second per key)
  - **Mitigation**: At the game's traffic volume, this is not a bottleneck. A queue layer can be added if needed.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| arcade-rogue-protocol.md | Persistent records (high scores across runs) | Leaderboard worker stores and returns top 100 scores per mode |
| arcade-rogue-protocol.md | Leaderboard submission | POST /api/score accepts validated score payloads |

## Performance Implications
- **CPU**: Worker CPU time is negligible for HMAC verification + KV read/write
- **Memory**: Worker memory negligible
- **Load Time**: Leaderboard fetch is async — game is playable without it (graceful fallback to localStorage)
- **Network**: One POST per score submission + one GET per leaderboard view (~1KB each)

## Migration Plan
Already shipped. No migration needed.

## Validation Criteria
- Score submission with valid payload returns 200 and correct rank
- Score submission with score exceeding ceiling returns 400
- Score submission with used nonce returns 409 (duplicate)
- Score submission within 30s of previous returns 429 (rate limited)
- Leaderboard returns top 100 scores in descending order
- Leaderboard fetch with invalid mode returns empty list, not error
- Worker responds within 500ms (p95) on global traffic

## Related Decisions
- ADR-0005: PWA Service Worker — leaderboard API calls intentionally NOT cached (network-only, fresh data each time)
