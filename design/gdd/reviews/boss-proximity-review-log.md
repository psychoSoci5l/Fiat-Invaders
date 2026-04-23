# Boss System + Proximity Kill — Review Log

## Review 1 — 2026-04-23 (v7.12.9)

**Reviewer:** self (reverse-document pass)
**Verdict:** APPROVED
**Scope:** M
**Source paths audited:**
- `src/entities/Boss.js` (1636 lines)
- `src/managers/MiniBossManager.js` (395 lines)
- `src/config/BalanceConfig.js` BOSS section [815–940] and PROXIMITY_KILL section [1271–1280]
- `src/core/GameplayCallbacks.js` [260–362] (onEnemyKilled + onBossHit)
- `src/main.js` [2655–2730] (spawnBoss + HP scaling) and [4390–4420] (addProximityMeter)
- `src/utils/Constants.js` [892–940] (BOSSES table + rotation)

### Checklist

- [x] **A. Overview** captures the what/why of the system.
- [x] **B. Player Fantasy** states intent behind each boss + DIP meter behaviour.
- [x] **C. Detailed Rules** cites config file:line for every tunable (rotation, HP formula, phases, attacks, minions, drops, entrance, movement personalities).
- [x] **D. Proximity Kill Meter** covers all three gain paths (enemy kill / boss hit / phase transition) + `G.addProximityMeter` API contract.
- [x] **E. Feature Matrix** with kill-switches.
- [x] **F. Analytics** lists all tracked events.
- [x] **G. Tuning Notes and Open Debts** enumerates known dead fields + naming drift + potential bug (JACKPOT inconsistency).
- [x] **H. Cross-links** to all related GDDs.

### Findings (moved to GDD section G)

1. `Constants.BOSSES[*]` declares `baseHp/hpPerLevel/hpPerCycle` fields that are unread — scaling reads `Balance.BOSS.HP.*`. **Flagged** for cleanup pass.
2. `HYPER_KILL_EXTENSION: 0` is a dead config key. **Flagged** for cleanup.
3. Variable naming drift: code still says `grazeMeter` everywhere. **Flagged** for rename cleanup.
4. `onBossHit` does NOT apply `arcadeBonuses.grazeGainMult` while `onEnemyKilled` and `addProximityMeter` do. **Possible inconsistency** — worth confirming intent.
5. Three HP formulas (boss/enemy/minion) grow on independent curves. Noted but out-of-scope for this GDD.
6. P3 is a short 20% window and can be "skipped" by a big HYPER+GODCHAIN burst. Design-intent, not bug.

### Consistency with other GDDs

- **V8 Scroller** [v8-scroller.md]: GDD refers back to `BOSS_AT_S = 170s` and LevelScript override — consistent.
- **Weapon + Elementals + GODCHAIN** [weapon-elementals-godchain.md]: Evolution Core flow post-boss referenced; HYPER auto-activation off DIP meter matches Weapon GDD's HYPER section.
- **Drop System + APC** [drop-system-apc.md]: `tryBossDrop` referenced; boss-specific drop constants `DROP_INTERVAL: 40` / `DROP_TIME_INTERVAL: 12` are documented in both. No conflict.
- **Arcade Rogue Protocol** [arcade-rogue-protocol.md]: JACKPOT modifier effect on DIP meter noted in both. Mini-boss system is covered in Arcade GDD (not duplicated here).
- **Enemy Agents** [enemy-agents.md]: boss minion rendering references drawMinion path — consistent.

### Outcome

Document accurately reflects v7.12.9 shipping behavior. Promoted to **Approved** on systems-index.
