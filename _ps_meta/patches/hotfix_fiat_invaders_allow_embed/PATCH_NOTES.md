# hotfix_fiat_invaders_allow_embed

Scope
- Add CSP frame-ancestors via _headers to allow embedding on psychosoci5l domains + localhost
- Emit PS_GAME_READY postMessage to parent iframe

Constraints
- Patch-only, no version bump

QA (required)
- Not run in this environment
- Verify iframe embed on psychosocial dash-games
