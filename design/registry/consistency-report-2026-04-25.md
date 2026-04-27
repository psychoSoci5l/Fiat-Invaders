## Consistency Check Report

**Date:** 2026-04-25
**Registry entries checked:** 10 entities, 12 items, 18 formulas, 25 constants
**GDDs scanned:** 7 (arcade-rogue-protocol, boss-proximity, drop-system-apc, enemy-agents, v8-scroller, wave-legacy-arcade, weapon-elementals-godchain)

---

### Conflicts Found

🔴 None — all checked values are consistent across GDDs.

---

### Stale Registry Entries

⚠️ None — registry was created fresh from GDD source data.

---

### Unverifiable References

ℹ️ Entity names in the registry (PascalCase identifiers like `Boss_FED`, `EnemyAgent`) are registry-internal labels. GDDs use natural language references ("the FED boss", "enemy agents"). No numeric contradictions exist.

---

### Clean Entries

✅ All 65 registry entries verified with no numeric conflicts.

Key constants confirmed:
- `MAX_CONCURRENT_ENEMIES` = 18 (wave-legacy-arcade.md, 5 references)
- `GLOBAL_BULLET_CAP` = 150 (wave-legacy-arcade.md, feature matrix + edge cases)
- `DIP_MAX` = 100, `DIP_BOSS_HIT` = 0.15, `DIP_PHASE_TRANSITION` = 15 (boss-proximity.md, detailed rules)
- `ARCADE_ENEMY_COUNT_MULT` = 1.15, `ARCADE_ENEMY_HP_MULT` = 0.85 (arcade-rogue-protocol.md)
- `INTERMISSION_DURATION_ARCADE` = 2.0s (arcade-rogue-protocol.md)

---

**Verdict: PASS** — registry and GDDs agree on all checked values.
