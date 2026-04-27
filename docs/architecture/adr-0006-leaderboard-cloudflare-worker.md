# ADR-0006: Cloudflare Workers Leaderboard Backend

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Cloudflare Workers + KV (leaderboard backend) |
| **Domain** | Networking / Backend |
| **Knowledge Risk** | LOW — Cloudflare Workers API is stable and well-documented |
| **References Consulted** | `workers/leaderboard-worker.js`, `workers/wrangler.toml` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | HMAC signature verification across worker and game client |

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
- Accept signed score submissions from the game client
- Verify HMAC signature before accepting a score
- Return top N scores for leaderboard display
- Store scores with player name, score value, timestamp, and cycle reached
- Prevent replay attacks (submitting the same signed payload multiple times)

## Decision

Use a Cloudflare Worker with KV storage and HMAC-SHA256 signature verification for the leaderboard backend.

### Architecture

```
Game Client (LeaderboardClient.js)
  │  POST /submit { player, score, cycle, signature }
  ▼
Cloudflare Worker (leaderboard-worker.js)
  │  1. Verify HMAC-SHA256 signature (key = HMAC_SECRET)
  │  2. Reject if signature invalid or expired
  │  3. Store score in KV (key: scores, value: sorted list)
  ▼
Cloudflare KV (global, low-latency reads)
  │
  ▼
Game Client
  ← 200 { rank, topScores } or 401/403 on auth failure
```

### Key Interfaces

```js
// Worker entry point
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/submit' && request.method === 'POST') {
      return handleSubmit(request, env);
    }
    if (url.pathname === '/leaderboard' && request.method === 'GET') {
      return handleLeaderboard(request, env);
    }
    return new Response('Not Found', { status: 404 });
  }
};

// HMAC verification (game client signs payload with shared key)
const expectedSig = await crypto.subtle.sign('HMAC', key, data);
const verified = constantTimeEqual(expectedSig, receivedSig);

// KV storage
await env.LEADERBOARD.put('scores', JSON.stringify(scores));
const scores = JSON.parse(await env.LEADERBOARD.get('scores')) || [];
```

### HMAC Key Management
- Worker: HMAC_SECRET set via `npx wrangler secret put HMAC_SECRET`
- Game client: `Game.LEADERBOARD_HMAC_KEY` in `src/utils/Constants.js`
- Both must match — if they diverge, all submissions are rejected
- The key is not a security boundary against determined reverse-engineering; it prevents casual forgery

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
- HMAC verification prevents trivial score forgery
- Free tier covers low-traffic usage

### Negative
- KV is eventually consistent — scores may lag by ~1s globally
- HMAC key is embedded in the client JS (not true security against determined cheating)
- KV write limits (1KB per key) mean the entire score list must fit in one key or be paginated

### Risks
- HMAC key embedded in client JS can be extracted
  - **Mitigation**: This is accepted — the HMAC prevents bulk automated forgery via bot scripts. True anti-cheat would require a server-authoritative game loop, which is out of scope.
- KV write throughput limited (1 write/second per key)
  - **Mitigation**: At the game's traffic volume, this is not a bottleneck. A queue layer can be added if needed.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| arcade-rogue-protocol.md | Persistent records (high scores across runs) | Leaderboard worker stores and returns top scores |
| arcade-rogue-protocol.md | Leaderboard submission | POST /submit endpoint accepts signed score payloads |

## Performance Implications
- **CPU**: Worker CPU time is negligible for HMAC verification + KV read/write
- **Memory**: Worker memory negligible
- **Load Time**: Leaderboard fetch is async — game is playable without it (graceful fallback to localStorage)
- **Network**: One POST per score submission + one GET per leaderboard view (~1KB each)

## Migration Plan
Already shipped. No migration needed.

## Validation Criteria
- Score submission with valid HMAC signature returns 200 and correct rank
- Score submission with invalid/forged HMAC returns 401
- Leaderboard returns top N scores in descending order
- Worker responds within 500ms (p95) on global traffic

## Related Decisions
- ADR-0005: PWA Service Worker — leaderboard API calls intentionally NOT cached (network-only, fresh data each time)
