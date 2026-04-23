# Wave System (Legacy / Arcade) — Review Log

## Review 1 — 2026-04-23 (v7.12.9)

**Reviewer:** self (reverse-document pass)
**Verdict:** APPROVED
**Scope:** M
**Source paths audited:**
- `src/managers/WaveManager.js` (1522 lines; focused on public API + streaming path)
- `src/config/BalanceConfig.js` STREAMING [710–726], PATTERNS [730–749], FORMATION [1670–1689], FORMATION_ENTRY [1692–1706], WAVE_DEFINITIONS [1474–1667], getWaveDefinition [2821–2854], getPhaseModifiers [2870–2878], ARCADE [2881–2900]

### Checklist

- [x] **A. Overview** explains the system's role (wave-by-wave streaming) and its V8/Arcade split.
- [x] **B. Player Fantasy** captures the 3-cycle theming and phase-streaming feel.
- [x] **C. Detailed Rules** cites config file:line for wave structure, cycle mapping, streaming state, phase trigger, phase escalation, count scaling, formations, currencies, entry animation, enemy creation, intermission, pattern density.
- [x] **D. V8 vs Legacy routing** makes the campaign/Arcade ownership explicit.
- [x] **E. Feature Matrix** with kill-switches.
- [x] **F. Analytics/Debug** lists `dbg.*` hooks.
- [x] **G. Tuning Notes and Open Debts** enumerates dead code paths, unused config branches, clamping behavior worth confirming.
- [x] **H. Cross-links** to all related GDDs.

### Findings (moved to GDD section G)

1. Non-streaming `startWave` branch in WaveManager (~150–192) is dead — all waves use `prepareStreamingWave`. Candidate for removal.
2. `CURRENCY_THEMES` unused at runtime — documentation/palette only.
3. Legacy formations V_SHAPE/COLUMNS/SINE_WAVE unreferenced in wave defs.
4. Currency-symbol formations (BTC_SYMBOL etc.) only reachable through post-C3 40% remix — never in defined waves.
5. `MAX_PER_PHASE: 14` clamps large phase counts (e.g. C3W5 phase0 = 22) — intentional v6.5, but documented here explicitly.
6. `_phaseIndex` propagation not verified in all kill/teleport paths — low-risk, flagged.

### Consistency with other GDDs

- **V8 Scroller** [v8-scroller.md]: mutual exclusivity documented in both — V8 owns campaign, WaveManager owns Arcade.
- **Arcade Rogue Protocol** [arcade-rogue-protocol.md]: ENEMY_COUNT_MULT 1.15, ENEMY_HP_MULT 0.85, intermission 2.0s, post-C3 remix 0.40 — all match Arcade GDD.
- **Boss System** [boss-proximity.md]: intermission-boss 6.0s/4.0s referenced consistently.
- **Drop System + APC** [drop-system-apc.md]: `GUARANTEED_SPECIAL_WAVE: 4` not contradicted; APC hpMult hook documented in enemy-creation path.
- **Enemy Agents** [enemy-agents.md]: behavior probability formula `min(0.5, 0.1 + cycle × 0.1) + phaseMods.behaviorBonus` documented here as the point where behaviors are rolled.

### Outcome

Document accurately reflects v7.12.9 shipping behavior. Promoted to **Approved** on systems-index.
