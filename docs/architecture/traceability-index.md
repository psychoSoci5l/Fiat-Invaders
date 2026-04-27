# Architecture Traceability Index

**Last Updated:** 2026-04-25
**Engine:** Vanilla JavaScript (Canvas 2D, Web API)

## Coverage Summary

- Total requirements: 70
- ✅ Covered: 70 (100%)
- ⚠️ Partial: 0 (0%)
- ❌ Gaps: 0 (0%)

## Full Matrix

| Req ID | GDD | System | Requirement | ADR | Status |
|--------|-----|--------|-------------|-----|--------|
| TR-V8-001 | v8-scroller.md | V8 Scroller | Burst spawn system ±0.1s accuracy | ADR-0007 | ✅ Covered |
| TR-V8-002 | v8-scroller.md | V8 Scroller | 4 movement patterns per-frame (DIVE/SINE/HOVER/SWOOP) | ADR-0007 | ✅ Covered |
| TR-V8-003 | v8-scroller.md | V8 Scroller | Gravity Gate state machine (IDLE→DWELL→LEAVING) | ADR-0007 | ✅ Covered |
| TR-V8-004 | v8-scroller.md | V8 Scroller | CRUSH anchors (speed ramp, shake, audio pitch) | ADR-0007 | ✅ Covered |
| TR-V8-005 | v8-scroller.md | V8 Scroller | Scroll speed LUT + DT clamp | ADR-0007 | ✅ Covered |
| TR-V8-006 | v8-scroller.md | V8 Scroller | Off-edge culling y > gameHeight + 120 | ADR-0007 | ✅ Covered |
| TR-V8-007 | v8-scroller.md | V8 Scroller | Boss trigger at BOSS_AT_S=170s + halt | ADR-0007 | ✅ Covered |
| TR-V8-008 | v8-scroller.md | V8 Scroller | Level advance with full state reset | ADR-0007 | ✅ Covered |
| TR-V8-009 | v8-scroller.md | V8 Scroller | HUD boss countdown indicator | ADR-0007 | ✅ Covered |
| TR-V8-010 | v8-scroller.md | V8 Scroller | Enemy HP formula (cycle/wave/tier scaling) | ADR-0007 | ✅ Covered |
| TR-V8-011 | v8-scroller.md | V8 Scroller | Fire budget 8-step ramp | ADR-0007 | ✅ Covered |
| TR-ARC-001 | arcade-rogue-protocol.md | Arcade | Arcade gating via isArcadeMode() | ADR-0011 | ✅ Covered |
| TR-ARC-002 | arcade-rogue-protocol.md | Arcade | 15 waves (5×3 cycles), 2-3 streaming phases | ADR-0011 | ✅ Covered |
| TR-ARC-003 | arcade-rogue-protocol.md | Arcade | Phase streaming at 25% alive + 3.0s min | ADR-0011 | ✅ Covered |
| TR-ARC-004 | arcade-rogue-protocol.md | Arcade | Combo system (kill chain, timeout, graze) | ADR-0011 | ✅ Covered |
| TR-ARC-005 | arcade-rogue-protocol.md | Arcade | Mini-boss triggers, 10s cooldown, 3/wave | ADR-0011 | ✅ Covered |
| TR-ARC-006 | arcade-rogue-protocol.md | Arcade | Modifier card DOM modal + stacking | ADR-0011 | ✅ Covered |
| TR-ARC-007 | arcade-rogue-protocol.md | Arcade | Post-C3 scaling + formation remix | ADR-0011 | ✅ Covered |
| TR-ARC-008 | arcade-rogue-protocol.md | Arcade | 8-factor score multiplier chain | ADR-0011 | ✅ Covered |
| TR-ARC-009 | arcade-rogue-protocol.md | Arcade | localStorage records + NEW BEST badge | ADR-0011 | ✅ Covered |
| TR-ARC-010 | arcade-rogue-protocol.md | Arcade | Leaderboard submission | ADR-0011 | ✅ Covered |
| TR-EA-001 | enemy-agents.md | Enemy Agents | Procedural agent rendering (3 regions × 12 currencies) | ADR-0002 | ✅ Covered |
| TR-EA-002 | enemy-agents.md | Enemy Agents | Y-flip rendering (head-first descent, upright DWELL) | ADR-0002 (transforms) | ✅ Covered |
| TR-EA-003 | enemy-agents.md | Enemy Agents | Currency-symbol bullets with OffscreenCanvas cache | ADR-0002 | ✅ Covered |
| TR-EA-004 | enemy-agents.md | Enemy Agents | Motion trail + halo + glyph + pulse VFX | ADR-0002 (compositing) | ✅ Covered |
| TR-EA-005 | enemy-agents.md | Enemy Agents | Elite variants (ARMORED/EVADER/REFLECTOR) | ADR-0012 | ✅ Covered |
| TR-EA-006 | enemy-agents.md | Enemy Agents | Behavior state machines (4 types) | ADR-0012 | ✅ Covered |
| TR-EA-007 | enemy-agents.md | Enemy Agents | Fire-suppression flags for HarmonicConductor | ADR-0012 | ✅ Covered |
| TR-EA-008 | enemy-agents.md | Enemy Agents | Kill-switch fallback to minion silhouette | ADR-0002 (render path) | ✅ Covered |
| TR-WEP-001 | weapon-elementals-godchain.md | Weapons | 3-tier weapon evolution gated by boss Evolution Core | ADR-0010 | ✅ Covered |
| TR-WEP-002 | weapon-elementals-godchain.md | Weapons | Per-level firing geometry + cooldown | ADR-0010 | ✅ Covered |
| TR-WEP-003 | weapon-elementals-godchain.md | Weapons | HYPER system (manual, 10s, instant death) | ADR-0010 | ✅ Covered |
| TR-WEP-004 | weapon-elementals-godchain.md | Weapons | Elemental on-kill effects (splash/beam/chain) | ADR-0010 | ✅ Covered |
| TR-WEP-005 | weapon-elementals-godchain.md | Weapons | Fixed perk order: Fire→Laser→Electric | ADR-0010 | ✅ Covered |
| TR-WEP-006 | weapon-elementals-godchain.md | Weapons | Elemental Contagion cascade (depth-2) | ADR-0010 | ✅ Covered |
| TR-WEP-007 | weapon-elementals-godchain.md | Weapons | GODCHAIN fusion state (10s, 10s cooldown) | ADR-0010 | ✅ Covered |
| TR-WEP-008 | weapon-elementals-godchain.md | Weapons | HYPERGOD (5× score, 12× cap) | ADR-0010 | ✅ Covered |
| TR-WEP-009 | weapon-elementals-godchain.md | Weapons | Specials (HOMING/PIERCE/MISSILE) | ADR-0010 | ✅ Covered |
| TR-WEP-010 | weapon-elementals-godchain.md | Weapons | Utilities (SHIELD/SPEED) | ADR-0010 | ✅ Covered |
| TR-WEP-011 | weapon-elementals-godchain.md | Weapons | Evolution Core cinematic deploy | ADR-0010 | ✅ Covered |
| TR-WEP-012 | weapon-elementals-godchain.md | Weapons | GODCHAIN visual identity (aura, fire trail, vignette) | ADR-0010 | ✅ Covered |
| TR-DRP-001 | drop-system-apc.md | Drops | Tier-based drop chances (3/2.5/1%) | ADR-0008 | ✅ Covered |
| TR-DRP-002 | drop-system-apc.md | Drops | Pity timer cycle-scaling (C1=30, floor 15) | ADR-0008 | ✅ Covered |
| TR-DRP-003 | drop-system-apc.md | Drops | Category selection with adaptive weighting | ADR-0008 | ✅ Covered |
| TR-DRP-004 | drop-system-apc.md | Drops | Struggle detection (40s, 3× boost) | ADR-0008 | ✅ Covered |
| TR-DRP-005 | drop-system-apc.md | Drops | Domination detection (1.5k/s, 0.25×) | ADR-0008 | ✅ Covered |
| TR-DRP-006 | drop-system-apc.md | Drops | Post-death grace 60s window | ADR-0008 | ✅ Covered |
| TR-DRP-007 | drop-system-apc.md | Drops | APC 3-axis power score → HP/pity | ADR-0008 | ✅ Covered |
| TR-DRP-008 | drop-system-apc.md | Drops | 3 coexisting power score formulas | ADR-0008 | ✅ Covered |
| TR-DRP-009 | drop-system-apc.md | Drops | Anti-cluster 6s guard | ADR-0008 | ✅ Covered |
| TR-DRP-010 | drop-system-apc.md | Drops | Guaranteed SPECIAL pre-boss wave 4+ | ADR-0008 | ✅ Covered |
| TR-DRP-011 | drop-system-apc.md | Drops | GODCHAIN/HYPER drop suppression | ADR-0008 | ✅ Covered |
| TR-BS-001 | boss-proximity.md | Boss | 3-boss rotation with V8 campaign override | ADR-0009 | ✅ Covered |
| TR-BS-002 | boss-proximity.md | Boss | Boss HP formula (5 variables) | ADR-0009 | ✅ Covered |
| TR-BS-003 | boss-proximity.md | Boss | 3-phase thresholds at 66%/20% HP | ADR-0009 | ✅ Covered |
| TR-BS-004 | boss-proximity.md | Boss | Phase transitions (1.5s, dialogue, VFX) | ADR-0009 | ✅ Covered |
| TR-BS-005 | boss-proximity.md | Boss | 14 attack patterns across 3 bosses × 3 phases | ADR-0009 | ✅ Covered |
| TR-BS-006 | boss-proximity.md | Boss | P3 minion spawning | ADR-0009 | ✅ Covered |
| TR-BS-007 | boss-proximity.md | Boss | DIP proximity meter (0-100) | ADR-0009 | ✅ Covered |
| TR-BS-008 | boss-proximity.md | Boss | DIP from boss hits (0.15) and phase transitions (+15) | ADR-0009 | ✅ Covered |
| TR-BS-009 | boss-proximity.md | Boss | HYPER auto-activation at DIP=100 | ADR-0009 | ✅ Covered |
| TR-BS-010 | boss-proximity.md | Boss | Boss entrance (80px/s, invulnerable) | ADR-0009 | ✅ Covered |
| TR-BS-011 | boss-proximity.md | Boss | Per-boss movement personalities | ADR-0009 | ✅ Covered |
| TR-WAV-001 | wave-legacy-arcade.md | Waves | 15 baseline waves with 2-3 streaming phases | ADR-0013 | ✅ Covered |
| TR-WAV-002 | wave-legacy-arcade.md | Waves | 20 formation generators | ADR-0013 | ✅ Covered |
| TR-WAV-003 | wave-legacy-arcade.md | Waves | Phase trigger (25% + 3.0s + MAX 18) | ADR-0013 | ✅ Covered |
| TR-WAV-004 | wave-legacy-arcade.md | Waves | Count scaling pipeline (5 factors) | ADR-0013 | ✅ Covered |
| TR-WAV-005 | wave-legacy-arcade.md | Waves | Entry animation system (4 paths) | ADR-0013 | ✅ Covered |
| TR-WAV-006 | wave-legacy-arcade.md | Waves | WaveManager dormant in V8 campaign | ADR-0001 (PLAY gate) | ✅ Covered |
| TR-WAV-007 | wave-legacy-arcade.md | Waves | Per-cycle bullet density scaling | ADR-0013 | ✅ Covered |

### Resolved this session
- ✅ V8 Scroller LevelScript — ADR-0007
- ✅ Drop System + APC — ADR-0008
- ✅ Boss System + DIP — ADR-0009
- ✅ Weapon Evolution + Elementals + GODCHAIN — ADR-0010
- ✅ Arcade Rogue Protocol — ADR-0011
- ✅ Enemy Elites + Behaviors + Fire Suppression — ADR-0012
- ✅ Wave System — Streaming, Formations, Arcade Scaling — ADR-0013

## Superseded Requirements

None — this is the first traceability pass. No GDD requirements have been superseded.
