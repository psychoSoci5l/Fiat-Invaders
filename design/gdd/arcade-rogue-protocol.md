# Arcade Rogue Protocol — Game Design Document

**System:** Arcade Rogue Protocol (legacy WaveManager mode + roguelike modifiers)
**Version covered:** v7.31.0 (reverse-documented from code; cite file:line where noted)
**Status:** Active alternative to V8 campaign; WaveManager-driven; no LevelScript involvement
**File audience:** Designers, engineers, QA

---

## Overview

Arcade Rogue Protocol is the roguelike alternative to the V8 campaign in *FIAT vs CRYPTO*. It activates whenever `G.CampaignState.isEnabled()` returns `false` (i.e., the player launches in Arcade mode from the intro screen), which causes `G.ArcadeModifiers.isArcadeMode()` to return `true`. In Arcade mode the V8 LevelScript is fully dormant — `WaveManager.update()` takes over spawning, cycling through 15 pre-defined waves (5 waves × 3 cycles) at higher enemy density and lower enemy HP than Story mode. The core roguelike layer adds three interlocking systems: a **combo multiplier** (kills in rapid succession compound a score bonus that resets on timeout or death), **enhanced mini-bosses** (lower thresholds, shorter cooldown, up to 3 per wave), and **accumulating modifier cards** (chosen from a DOM modal after every boss or mini-boss defeat, stacking indefinitely across the run up to a cap of 20). Post-cycle-3 the game scales infinitely by cycling through C1–C3 wave definitions with remixed formations and accelerated difficulty. A **visual phase progression** mirrors the campaign's sky journey: the arcade background transitions from blue sky (C1) → violet upper atmosphere (C2) → cyberpunk neon void (C3+), using the same `PhaseTransitionController` crossfade system as Story mode. Persistent high scores (best cycle, level, kill count) are tracked in localStorage and displayed on the game-over screen.

---

## Player Fantasy

The player should feel like a one-person trading floor that keeps printing higher and higher numbers. Every kill chain rewards momentum — the combo counter climbs, the score multiplier spikes, the HUD pulses. Modifier cards are the pivotal beat-breath of the loop: two or three seconds of agency between boss explosions to select a permanent power that tilts the next cycle in a chosen direction (faster fire vs. tankier defense vs. degenerate WILD). The visual journey reinforces progress: beating the first central bank lifts the player from blue daylight into violet upper atmosphere (C2), and crushing the second bank plunges them into the full cyberpunk neon void (C3+), where planets, shooting stars, and neon streaks complete the "Bloomberg Terminal in deep space" aesthetic. By cycle 4 the screen is busier than Story mode, the formations are random, and the player's accumulated modifier stack is the only thing keeping them alive. The fantasy is "one more cycle" — just like a roguelite, each run ends in death but teaches exactly which modifiers synergize.

---

## Detailed Rules

### C.1 Activation gating

- Arcade mode is active when `G.ArcadeModifiers.isArcadeMode()` returns `true`.
- `isArcadeMode()` is defined as `!(G.CampaignState && G.CampaignState.isEnabled())`.
  - Source: `src/systems/ArcadeModifiers.js:217-219`
- When `V8_MODE.ENABLED = true` **and** `isArcadeMode() = true`, `WaveManager.update()` takes the active path (V8 dormancy check is skipped).
  - Source: `src/managers/WaveManager.js:49-51`
- HarmonicConductor's V8 fire-ramp (`V8_RAMP`) is **skipped** in Arcade mode.
  - Source: `src/systems/HarmonicConductor.js` (V8 ramp only applies when `!isArcadeMode()`)

### C.2 Wave structure (WaveManager)

- 15 wave definitions: 5 waves × 3 cycles. Each wave has 2–3 streaming phases.
  - Source: `src/config/BalanceConfig.js` (`WAVE_DEFINITIONS.WAVES`)
- WaveManager drives spawning: on every `PLAY` tick it checks enemy count → emits `START_INTERMISSION` (within cycle) or `SPAWN_BOSS` (end of cycle, wave > 5).
  - Source: `src/managers/WaveManager.js:112-122`
- Streaming: phase 0 spawns immediately; subsequent phases trigger when `currentPhaseAlive ≤ threshold` (25% of phase count, min 3, max 4) AND min duration of 3.0 s has elapsed AND adding next phase wouldn't push total above `MAX_CONCURRENT_ENEMIES (18)`.
  - Source: `src/managers/WaveManager.js:63-99`

### C.3 Enemy count and HP (Arcade overrides)

Per wave, **after** bear market and cycle scaling, Arcade applies:
- Count: `× ARCADE.ENEMY_COUNT_MULT (1.15)` → +15% enemies per wave.
- HP: `× ARCADE.ENEMY_HP_MULT (0.85)` → –15% HP per enemy.
- Additionally any active modifier's `enemyHpMult` bonus is multiplied on top of the base HP.
  - Source: `src/managers/WaveManager.js:159-164, 224-229`

### C.4 Intermission durations

- Between waves: `ARCADE.INTERMISSION_DURATION = 2.0 s` (vs. `Balance.TIMING.INTERMISSION_DURATION` in Story).
- After boss defeat: `ARCADE.INTERMISSION_BOSS_DURATION = 4.0 s` (vs. 6.0 s in Story).
  - Source: `src/main.js:2527-2529`; `src/config/BalanceConfig.js:2884-2885`

### C.5 Combo system

Every enemy kill in Arcade mode:
1. Increments `RunState.comboCount` by 1.
2. Resets `RunState.comboTimer` to `COMBO.TIMEOUT (3.0 s)`.
3. Computes `comboMult = min(COMBO.MULT_CAP, 1.0 + comboCount × COMBO.MULT_PER_COMBO)`.
4. Applies `comboMult` to `killScore` via the standard multiplier chain.
5. Updates `bestCombo` if `comboCount > bestCombo`.

If no kill lands within 3.0 s, `comboTimer` reaches 0 → `comboCount` resets to 0, `comboMult` resets to 1.0, `comboDecayAnim` starts (0.5 s fade-out showing last `bestCombo`).

**Graze extends combo timer:** while combo is active (`comboTimer > 0`), each graze adds `COMBO.GRAZE_EXTEND (0.5 s)` to `comboTimer`.

**Death resets combo:** on `executeDeath()`, `comboCount = 0`, `comboTimer = 0`, `comboMult = 1.0`. Same reset fires on Last Stand trigger.
  - Source: `src/core/GameplayCallbacks.js:170-181`; `src/core/GameplayCallbacks.js:123-124`; `src/main.js:2831-2845, 3570-3585`

### C.6 Mini-boss trigger (Arcade overrides)

Mini-boss spawn conditions checked on each enemy kill:
- No active boss or mini-boss.
- `e.symbol` must be in the `CURRENCY_BOSS_MAP`.
- Not a minion (`!e.isMinion`).
- Boss warning timer ≤ 0.
- `totalTime - lastMiniBossSpawnTime >= ARCADE.MINI_BOSS.COOLDOWN (10.0 s)` (Story: 15.0 s).
- `miniBossThisWave < ARCADE.MINI_BOSS.MAX_PER_WAVE (3)` (Story: 2).

Kill threshold: `floor(mapping.threshold × ARCADE.MINI_BOSS.THRESHOLD_MULT (0.65))`.

Base thresholds (from `Balance.MINI_BOSS.CURRENCY_BOSS_MAP`):
| Currency | Boss | Base threshold | Arcade threshold (×0.65) |
|---|---|---|---|
| $ | FEDERAL_RESERVE | 22 | 14 |
| €, ₣, £ | BCE | 22 | 14 |
| ¥, 元 | BOJ | 18 | 11 |
| ₽, ₹, ₺ | RANDOM | 35 | 22 |
| Ⓒ | CYCLE_BOSS | 24 | 15 |
| (fallback) | — | 15 | 9 |

Source: `src/config/BalanceConfig.js:782-811`; `src/core/GameplayCallbacks.js:296-308`

### C.7 Mini-boss HP (Arcade override)

When `isArcadeMode()` is `true`, the HP multiplier applied to full boss HP is `ARCADE.MINI_BOSS.HP_MULT (0.50)` (Story: `0.6`).

```
miniBossHp = floor(calculateBossHP(level, marketCycle) × 0.50 × perkScaling)
perkScaling = 1 + perks.length × Balance.BOSS.HP.PERK_SCALE
```

Source: `src/managers/MiniBossManager.js:61-64`

### C.8 Post-mini-boss modifier pick

After mini-boss defeat, a `setTimeout(800 ms)` fires `G.ModifierChoiceScreen.show(picks, callback)` with `picks = ARCADE.MODIFIERS.POST_MINIBOSS_PICKS (2)`.
  - Source: `src/managers/MiniBossManager.js:347-360`

### C.9 Post-boss modifier pick

After boss death celebration delay (`Balance.TIMING.BOSS_CELEBRATION_DELAY * 1000` ms), if `isArcadeMode()`:
1. `startIntermission()` is called immediately.
2. After 1500 ms more, `G.ModifierChoiceScreen.show(picks, callback)` fires with `picks = ARCADE.MODIFIERS.POST_BOSS_PICKS (3)`.
3. Callback: if `arcadeBonuses.extraLives` ≠ 0, `adjustLives(extraLives)` fires and resets `extraLives` to 0.
  - Source: `src/core/GameplayCallbacks.js:517-535`

### C.10 Modifier card selection (ModifierChoiceScreen)

When `show(count, onComplete)` is called:
1. `G.ArcadeModifiers.getRandomModifiers(count, rs.arcadeModifiers)` selects `count` modifiers from the eligible pool.
2. For `count >= 3`: guaranteed 1 OFFENSE + 1 DEFENSE; remaining slot drawn from all eligible; final order shuffled.
3. For `count = 2` (or depleted categories): pure random shuffle.
4. DOM overlay `#modifier-overlay` shown with cards. Category color stored in `--cat-color` and `--cat-color-rgb` CSS vars per card.
5. Keyboard: digits `1`–`9` pick by index; Enter/Space on focused card; ArrowLeft/Right navigate between cards; ARIA attributes for screen readers.
6. On selection: card gets `modifier-card-selected` class; others get `modifier-card-rejected`; `G.ArcadeModifiers.applyModifier(modId)` called; `coinScore` SFX; `onComplete` fires after 600 ms animation.
  - Source: `src/ui/ModifierChoiceScreen.js:22-153`

### C.11 Modifier stacking rules

`applyModifier(modId)` appends the id to `RunState.arcadeModifiers[]` and calls `recalculateBonuses()`, which **resets all bonuses to default then replays every modifier in order**. This means:
- **Stackable** modifiers (e.g., OVERCLOCK, ARMOR_PIERCING, CRITICAL_HIT, BULLET_TIME, EXTRA_LIFE) can be picked multiple times up to `maxStacks`.
- **Non-stackable** modifiers (e.g., VOLATILE_ROUNDS, CHAIN_LIGHTNING, NANO_SHIELD) are excluded from the pool once already picked.
- Pool filtering: `available = MODIFIER_POOL.filter(mod => (!non-stackable already picked) && (stack count < maxStacks))`.
  - Source: `src/systems/ArcadeModifiers.js:120-157, 163-207`

Maximum total modifiers: `ARCADE.MODIFIERS.MAX_MODIFIERS (20)` — enforced by pool depletion (no hard cap check in code; pool exhaustion causes `mods.length === 0 → onComplete()` immediately).
  - Source: `src/ui/ModifierChoiceScreen.js:25-28`; `src/config/BalanceConfig.js:2924`

### C.12 Post-C3 infinite scaling

When `cycle >= 4` and `isArcadeMode()`:
- **Wave definitions**: `effectiveCycle = ((cycle - 1) % 3) + 1` — C4 uses C1 waves, C5 uses C2, C6 uses C3, C7 uses C1, etc.
  - Source: `src/config/BalanceConfig.js:2830-2831`
- **Formation remix**: 40% chance per phase (`POST_C3_FORMATION_REMIX = 0.40`) to randomize the formation to a random entry from the full 20-formation list.
  - Source: `src/config/BalanceConfig.js:2839-2853`
- **Difficulty**: `baseDiff += (cycle - 3) × POST_C3_DIFF_PER_CYCLE (0.20)` added before wave-level bonus. C4 = `base + 0.20`, C5 = `base + 0.40`, etc. Capped by `DIFFICULTY.MAX (1.0)`.
  - Source: `src/config/BalanceConfig.js:2622-2624`

### C.13 Drop rate

Arcade applies a global drop rate multiplier of `ARCADE.DROP_RATE_MULT (1.10)` (+10%) on top of the standard adaptive drop rates. Additionally, the JACKPOT modifier halves pity timers (`pityMult × 0.50`), applied via `DropSystem` pity threshold calculation.
  - Source: `src/config/BalanceConfig.js:2890`; `src/systems/DropSystem.js:520`

### C.14 Persistent records

On game over (`triggerGameOver`), the run is checked against `fiat_arcade_records` in localStorage (`{ bestCycle, bestLevel, bestKills }`). A "NEW BEST" badge is shown if any field improved.
  - Source: `src/ui/GameCompletion.js:263-288`; `src/main.js:165-171`

### C.15 Leaderboard submission

Scores submit to the leaderboard in both Story and Arcade modes. In Arcade, `submitWave = G.WaveManager.wave` and `submitCycle = marketCycle` (real values). The leaderboard worker uses `wave` and `cycle` for its score-ceiling check.
  - Source: `src/ui/GameCompletion.js:297-315`

### C.16 Behavior rate (Arcade override)

Behavior assignment (FLANKER, BOMBER, HEALER, CHARGER) uses `BEHAVIOR_RATE_ARCADE (0.22)` chance per enemy in Arcade (vs. `BEHAVIOR_RATE (0.18)` in Story).
  - Source: `src/config/BalanceConfig.js:633`; `src/managers/WaveManager.js:328`

### C.17 Elite variant chances (Arcade override)

Elite variant chances use `ELITE_VARIANTS.CHANCE.ARCADE` array (vs. `CHANCE.STORY`). Exact values referenced as `[0.15, 0.20, 0.25]` per cycle index.
  - Source: `src/config/BalanceConfig.js:597`; `src/managers/WaveManager.js:301`

### C.18 Visual phase progression

Arcade mode inherits the campaign's visual phase system (P1 Earth/LEO → P2 upper atmosphere → P3 deep space) using the shared `PhaseTransitionController`, `SkyRenderer`, and `WeatherController` infrastructure:

- **Phase 1 (C1):** Blue sky gradient, white clouds, green hills, daylight horizon glow, zero stars, zero planets. All arcade runs start here.
- **Phase 2 (C2):** Violet-to-purple sky gradient, thinning violet-white clouds, purple hills, stars emerging in upper half of screen, violet NEAR streaks. Triggered after C1 boss defeat.
- **Phase 3 (C3+):** Black void, zero clouds (silhouette with neon rim), black hills with cyan underglow, full starfield + shooting stars, 3 gas-giant planets with rings, cyberpunk neon streaks (`#00f0ff`, `#ff2d95`), floating crypto symbols. Triggered after C2 boss defeat.

**Transition triggers** (in `onBossDeath` arcade branch, `src/core/GameplayCallbacks.js:536-548`):
- `marketCycle === 1` (C1 boss defeated) → `PhaseTransitionController.startTransition(1, 2)` — P1→P2, 10s crossfade
- `marketCycle === 2` (C2 boss defeated) → `PhaseTransitionController.startTransition(2, 3)` — P2→P3, 10s crossfade
- `marketCycle >= 3` → no transition (already at P3, infinite loop)

The crossfade overlaps with the modifier pick screen and intermission, completing ~10s after boss death. `SkyRenderer.setPhase()` and `WeatherController.setPhase()` update immediately with the new phase; the `PhaseTransitionController` manages the visual blend via per-layer easing curves (linear for sky/clouds/hills/streaks, sigmoid for stars).

**CSS UI theming** updates automatically via the `'phase-change'` event emitted by `PhaseTransitionController` at transition completion — `--terminal-border`, `--neon-accent`, `--hud-glow-rgb` shift from blue (P1) → violet (P2) → cyan (P3).

**Edge case — campaign/arcade isolation:** the phase triggers are inside the `if (_isArcadeMode)` branch only. Campaign mode uses its own `advanceToNextV8Level()` phase mapping. The two paths never overlap.

**Reset on new game:** `regularGameStart()` unconditionally resets `PhaseTransitionController`, `SkyRenderer`, and `WeatherController` to Phase 1 for both modes.

Source: `src/core/GameplayCallbacks.js:536-548`; `src/systems/PhaseTransitionController.js`; `src/systems/SkyRenderer.js`; `art-bible.md §6.5-6.6`

---

## Formulas

### D.1 Combo multiplier

```
On each kill (Arcade only):
  comboCount++
  comboTimer = COMBO.TIMEOUT  // 3.0 s

comboMult = min(COMBO.MULT_CAP, 1.0 + comboCount × COMBO.MULT_PER_COMBO)
          = min(5.0, 1.0 + comboCount × 0.05)
```

To reach `MULT_CAP (5.0)`:
```
  1.0 + n × 0.05 = 5.0
  n = 80 kills without a 3-second gap
```

Source: `src/core/GameplayCallbacks.js:173-181`; `src/config/BalanceConfig.js:2897-2910`

### D.2 Kill score (Arcade)

```
killScore = floor(e.scoreVal × totalMult)

totalMult = bearMult × perkMult × killStreakMult × grazeKillBonus
          × hyperMult × lastEnemyMult × comboMult × arcadeScoreMult

arcadeScoreMult = RunState.arcadeBonuses.scoreMult   // DOUBLE_SCORE: ×2.0
comboMult       = RunState.comboMult                 // 1.0–5.0
```

Total multiplier is capped by `Balance.HYPERGOD.TOTAL_MULT_CAP` if set.
Source: `src/core/GameplayCallbacks.js:184-200`

### D.3 Enemy HP in Arcade

```
scaledHP = calculateEnemyHP(calculateDifficulty(level, cycle), cycle)
         × apcMult                          // Adaptive Power Calibration
         × ARCADE.ENEMY_HP_MULT (0.85)      // Arcade base discount
         × arcadeBonuses.enemyHpMult        // Modifier stack (DOUBLE_SCORE: ×1.25)
```

For cycles > 3:
```
calculateDifficulty:
  baseDiff = DIFFICULTY.CYCLE_BASE[min(cycle-1, 2)]   // [0.0, 0.40, 0.60]
           + max(0, cycle - 3) × 0.20                  // post-C3 scaling
  + waveInCycle × DIFFICULTY.WAVE_SCALE (0.04)
  = min(1.0, baseDiff + waveBonus)
```

Source: `src/managers/WaveManager.js:220-229`; `src/config/BalanceConfig.js:2616-2634`

### D.4 Enemy count per wave (Arcade)

```
targetCount = waveDef.phases[0].count
            × bearMarketMult          // if bear market: ×1.25
             × CYCLE_COUNT_MULT[i]     // [1.0, 1.25, 1.45] per cycle
            × ARCADE.ENEMY_COUNT_MULT (1.15)
            × RankSystem.getEnemyCountMultiplier()
```

Source: `src/managers/WaveManager.js:152-169`

### D.5 Mini-boss HP (Arcade)

```
fullBossHp = calculateBossHP(level, marketCycle)
perkScaling = 1 + perks.length × Balance.BOSS.HP.PERK_SCALE
miniBossHp = floor(fullBossHp × 0.50 × perkScaling)
```

Story mini-boss uses multiplier `0.60` in the same formula.
Source: `src/managers/MiniBossManager.js:60-64`

### D.6 Mini-boss threshold (Arcade)

```
effectiveThreshold = floor(mapping.threshold × ARCADE.MINI_BOSS.THRESHOLD_MULT)
                   = floor(mapping.threshold × 0.65)
```

Example: `$` in Arcade: `floor(22 × 0.65) = 14` kills.
Source: `src/core/GameplayCallbacks.js:305-306`

### D.7 Post-C3 difficulty ramp

```
baseDiff(cycle > 3) = CYCLE_BASE[2]                         // 0.60 (clamped to C3 index)
                    + (cycle - 3) × POST_C3_DIFF_PER_CYCLE  // 0.20 per cycle
```

| Cycle | baseDiff | +wave bonus (W5) | effective diff |
|---|---|---|---|
| C3 | 0.60 | +0.16 | 0.76 |
| C4 | 0.80 | +0.16 | 0.96 |
| C5 | 1.00 | +0.16 | 1.00 (cap) |
| C6+ | 1.00+ | +0.16 | 1.00 (cap) |

Source: `src/config/BalanceConfig.js:2622-2624`; `DIFFICULTY.MAX = 1.0`

### D.8 Combo timer — graze extension

```
comboTimer += COMBO.GRAZE_EXTEND (0.5 s)   // only if comboTimer > 0
```

Applied in `onBulletGraze` handler. Each graze during an active combo resets the decay clock by 0.5 s (partial, not a full TIMEOUT reset). A theoretical graze-only combo hold is bounded by graze frequency.
Source: `src/core/GameplayCallbacks.js:123-124`

### D.9 Nano Shield cooldown (NANO_SHIELD modifier)

```
nanoShieldCooldown = 22 s
nanoShieldTimer    = 22 s   // initialized to full on pick

Each tick (Arcade, shield not active):
  nanoShieldTimer -= dt
  if nanoShieldTimer <= 0:
    player.activateShield()
    nanoShieldTimer = nanoShieldCooldown   // reset
```

Source: `src/main.js:2848-2855`; `src/systems/ArcadeModifiers.js:50`

---

## Edge Cases

### E.1 Death mid-modifier-pick

`ModifierChoiceScreen.isVisible()` returns `true` during pick. The game state is not explicitly paused during a post-mini-boss pick (state remains `PLAY`). If the player dies during the pick (enemy bullets survive mini-boss death for one frame gap before `clearBattlefield` runs), `executeDeath()` fires normally. The modifier pick `onComplete` callback still fires after the 600 ms animation delay — `adjustLives(extraLives)` will apply any queued Extra Life. The pick is not cancelled. **No explicit guard exists in `selectCard` or `hide()` for mid-pick death.**

### E.2 Combo expiration mid-kill frame

`comboTimer` decays in the main update loop. If a kill occurs in the same frame that `comboTimer` reached 0 (checked earlier in the loop), `comboCount` will have been reset to 0 before `onEnemyKilled` runs — the kill restarts a fresh combo from 1. No visual glitch; `comboDecayAnim` is also zeroed by the new kill.

### E.3 Mini-boss during boss warning

Guard: `d.getBossWarningTimer() <= 0` — while the boss warning countdown is active (2.0 s), the kill-counter check returns early. Mini-boss cannot spawn during that window.
Source: `src/core/GameplayCallbacks.js:301`

### E.4 Mini-boss during active boss fight

Guard: `!boss` — if `boss` is active (full boss fight), the mini-boss trigger block is skipped entirely. Boss fights suppress mini-boss spawning.
Source: `src/core/GameplayCallbacks.js:301`

### E.5 Modifier pick while paused

Modifier picks fire via `setTimeout` (800 ms post-mini-boss, 1500 ms post-boss). If the player pauses during that window, the timeout fires regardless since `setTimeout` ignores `gameState`. `ModifierChoiceScreen.show()` will display the overlay over the pause screen. The keydown listener is attached, so digit keys still select cards while paused. **No explicit guard for PAUSE state in `_onKeyDown`.**

### E.6 Pool exhaustion (all modifiers at max stacks)

If the pool returns 0 eligible modifiers (`mods.length === 0`), `ModifierChoiceScreen.show()` calls `onComplete()` immediately without showing the overlay. The run continues normally. The 20-modifier safety cap in config (`MAX_MODIFIERS`) is never checked in code — only pool depletion enforces this limit in practice.
Source: `src/ui/ModifierChoiceScreen.js:25-28`; `src/config/BalanceConfig.js:2924`

### E.7 Post-C3 difficulty cap at C5+

`calculateDifficulty` applies `min(DIFFICULTY.MAX, baseDiff + waveBonus)`. At C5: `baseDiff = 0.60 + 2×0.20 = 1.00`. Adding any wave bonus hits the cap immediately. From C5 onward, enemy HP scales only via `ENEMY_HP.CYCLE_MULT` (clamped to index 2 = `2.8×`) — the HP difficulty is frozen, but enemy count continues rising via `CYCLE_COUNT_MULT` cycling.

### E.8 Formation remix applied to Story runs (bug risk)

`getWaveDefinition(cycle, wave)` applies the `cycle >= 4` remix path regardless of mode — the `_isArcade && arcadeCfg ? arcadeCfg.POST_C3_FORMATION_REMIX : 0.30` line means **Story runs reaching C4 also remix formations at 30%** (not Arcade's 40%). In practice Story mode ends at C3 boss (BOJ) and goes to campaign victory, so C4 is unreachable in normal play. No impact at runtime.
Source: `src/config/BalanceConfig.js:2843`

### E.9 Last Stand resets combo but preserves modifier stack

On `executeDeath()` when `lastStandAvailable = true`: the stand fires, `comboCount/comboTimer/comboMult` reset, but `arcadeModifiers[]` and `arcadeBonuses{}` are **not** reset. Modifiers persist through Last Stand. `lastStandAvailable` is set to `false` immediately, so only one Last Stand fires per pick (it resets on the next NANO_SHIELD-style recalculation only if the modifier is re-applied — which it cannot be since it is non-stackable).
Source: `src/main.js:3559-3574`

### E.10 Extra Life timing on boss pick

After boss defeat, `startIntermission()` fires immediately, then 1500 ms later the card modal shows. The `onComplete` callback calls `adjustLives(extraLives)` only **after** the pick animation (600 ms). Total delay from boss death: celebration delay + 1500 ms + 600 ms. Lives are added after the intermission label has already shown, meaning the lives count in the UI updates silently mid-intermission.
Source: `src/core/GameplayCallbacks.js:524-535`

### E.11 Visual phase transition during intermission

The P1→P2 and P2→P3 transitions are 10-second crossfades triggered at the same time as the modifier pick screen (post-celebration delay). Gameplay remains paused during the modifier pick and subsequent intermission, but `PhaseTransitionController.update(dt)` runs unconditionally in the main loop regardless of `gameState` — the transition continues to blend through the intermission and into the first waves of the next cycle. By the time `START_WAVE` fires (~8s after transition start), the sky is at ~80% blend, completing fully after ~10s. If the player pauses the game during the transition, `dt` goes to 0 in the update loop, causing the transition to freeze alongside gameplay. The `PhaseTransitionController` has no explicit PAUSE guard — this is handled implicitly by the zero-dt game loop.

### E.12 Phase reset on new arcade run

`regularGameStart()` unconditionally calls `PhaseTransitionController.init()` + `setCurrentPhase(1)`, `SkyRenderer.setPhase(1)`, and `WeatherController.setPhase(1)` for every game start regardless of mode. Any in-progress transition from a previous arcade run is reset. Phase 1 is the guaranteed starting state.

---

## Dependencies

| System | File | Interaction |
|---|---|---|
| WaveManager | `src/managers/WaveManager.js` | Primary spawn driver; Arcade gating at line 49-51; count/HP scaling at lines 159-229; behavior-rate override at line 328; formation remix via `getWaveDefinition()` |
| ArcadeModifiers | `src/systems/ArcadeModifiers.js` | `isArcadeMode()` predicate; `MODIFIER_POOL` (15 defs); `getRandomModifiers()`; `applyModifier()`; `recalculateBonuses()` |
| ModifierChoiceScreen | `src/ui/ModifierChoiceScreen.js` | DOM modal; `show(count, cb)`; `hide()`; `isVisible()`; keyboard accessibility handler `_onKeyDown` |
| RunState | `src/utils/RunState.js` | `comboCount`, `comboTimer`, `comboMult`, `bestCombo`, `comboDecayAnim`; `arcadeModifiers[]`; `arcadeBonuses{}`; `arcadeModifierPicks` |
| GameplayCallbacks | `src/core/GameplayCallbacks.js` | `onEnemyKilled` combo logic (lines 170-181); graze extend (line 123); mini-boss trigger (lines 296-317); post-boss pick flow (lines 517-535) |
| MiniBossManager | `src/managers/MiniBossManager.js` | HP_MULT override (line 61); post-mini-boss pick trigger (lines 347-360) |
| BalanceConfig | `src/config/BalanceConfig.js` | `Balance.ARCADE` block (lines 2882-2932); `calculateDifficulty` post-C3 branch (2622-2624); `getWaveDefinition` remix (2830-2853) |
| GameCompletion | `src/ui/GameCompletion.js` | `triggerGameOver`: arcade stats row, combo stats, record check, leaderboard submit (lines 263-316) |
| Leaderboard worker | `src/managers/LeaderboardClient.js` | Receives `mode='arcade'`, real `wave`/`cycle` values; score-ceiling computed as `12000 × wave × cycle × 1.5` |
| DropSystem | `src/systems/DropSystem.js` | Reads `arcadeBonuses.pityMult` (line 520); `DROP_RATE_MULT` applied upstream |
| main.js | `src/main.js` | Combo decay loop (2831-2855); Nano Shield tick (2848-2855); Last Stand in `executeDeath()` (3559-3574); combo HUD `drawArcadeComboHUD()` (3401-3453) |
| Player | `src/entities/Player.js` | Reads `arcadeBonuses.critChance`/`critMult` for bullet damage (line 857-858); `speedMult`, `fireRateMult`, `piercePlus` applied in fire/move logic |
| EventBus | `G.Events` | No dedicated Arcade events; runs use the same `enemy_killed` hook |
| HarmonicConductor | `src/systems/HarmonicConductor.js` | V8 ramp skipped in Arcade; base fire budget (`BULLETS_PER_SECOND`) applies normally |
| PhaseTransitionController | `src/systems/PhaseTransitionController.js` | `startTransition(1,2)` / `startTransition(2,3)` after C1/C2 boss defeat; manages 10s crossfade blend with per-layer easing curves |
| SkyRenderer | `src/systems/SkyRenderer.js` | `setPhase(2)` / `setPhase(3)` updates sky, clouds, stars, hills, planets, streaks, symbols to target phase; renders phase-aware visuals every frame |
| WeatherController | `src/systems/WeatherController.js` | `setPhase(2)` / `setPhase(3)` updates weather effects (sheet lightning, rain, snow, fog) to phase-specific colors and intensities |

---

## Tuning Knobs

All keys under `G.Balance.ARCADE` (`src/config/BalanceConfig.js:2882-2932`) unless noted.

### G.1 Pacing

| Key | Value | Effect |
|---|---|---|
| `ARCADE.INTERMISSION_DURATION` | `2.0 s` | Wave-to-wave pause (Story: ~3.2 s) |
| `ARCADE.INTERMISSION_BOSS_DURATION` | `4.0 s` | Post-boss pause (Story: 6.0 s) |

### G.2 Enemy scaling

| Key | Value | Effect |
|---|---|---|
| `ARCADE.ENEMY_COUNT_MULT` | `1.15` | +15% enemies per wave vs. Story base |
| `ARCADE.ENEMY_HP_MULT` | `0.85` | –15% HP per enemy before modifier stack |
| `ARCADE.DROP_RATE_MULT` | `1.10` | +10% drop rate multiplier |

### G.3 Post-C3 infinite scaling

| Key | Value | Effect |
|---|---|---|
| `ARCADE.POST_C3_DIFF_PER_CYCLE` | `0.20` | Difficulty delta per cycle above C3 |
| `ARCADE.POST_C3_FORMATION_REMIX` | `0.40` | Probability per phase of randomizing formation |

Wave definitions cycle as C4=C1, C5=C2, C6=C3, C7=C1, etc. Difficulty caps at `DIFFICULTY.MAX (1.0)` from C5 onward.

### G.4 Combo system (`ARCADE.COMBO`)

| Key | Value | Effect |
|---|---|---|
| `COMBO.TIMEOUT` | `3.0 s` | Seconds without a kill before combo resets |
| `COMBO.GRAZE_EXTEND` | `0.5 s` | Seconds added to timer per graze (active combo only) |
| `COMBO.MULT_PER_COMBO` | `0.05` | Score multiplier added per combo kill (above 1.0) |
| `COMBO.MULT_CAP` | `5.0` | Maximum combo multiplier (reached at 80 consecutive kills) |
| `COMBO.DECAY_ANIM` | `0.5 s` | Fade-out duration for combo HUD after reset |
| `COMBO.COLORS.WHITE` | `10` | Combo ≥ 1 and < 10: white |
| `COMBO.COLORS.YELLOW` | `30` | Combo ≥ 10 and < 30: yellow (note: HUD uses ORANGE threshold label for yellow branch) |
| `COMBO.COLORS.ORANGE` | `50` | Combo ≥ 30 and < 50: orange |
| `COMBO.COLORS.RED` | `999` | Combo ≥ 50: red |

Note: HUD `drawArcadeComboHUD` checks `>= ORANGE` for red, `>= YELLOW` for orange, `>= WHITE` for yellow, else white — the color labels in config are inverted relative to HUD rendering. See `src/main.js:3420-3424`.

### G.5 Mini-boss overrides (`ARCADE.MINI_BOSS`)

| Key | Value | Effect |
|---|---|---|
| `MINI_BOSS.COOLDOWN` | `10.0 s` | Minimum time between mini-boss spawns (Story: 15.0 s) |
| `MINI_BOSS.MAX_PER_WAVE` | `3` | Cap on mini-bosses per wave (Story: 2) |
| `MINI_BOSS.HP_MULT` | `0.50` | Mini-boss HP as fraction of full boss HP (Story: 0.60) |
| `MINI_BOSS.THRESHOLD_MULT` | `0.65` | Multiplied against per-currency kill threshold |

### G.6 Modifier system (`ARCADE.MODIFIERS`)

| Key | Value | Effect |
|---|---|---|
| `MODIFIERS.POST_BOSS_PICKS` | `3` | Cards shown after full boss defeat |
| `MODIFIERS.POST_MINIBOSS_PICKS` | `2` | Cards shown after mini-boss defeat |
| `MODIFIERS.MAX_MODIFIERS` | `20` | Safety cap (enforced by pool depletion; no runtime check) |

### G.7 Modifier tuning (`ARCADE.MODIFIER_TUNING`)

| Sub-key | Value | Effect |
|---|---|---|
| `VOLATILE_ROUNDS.AOE_RADIUS` | `30 px` | Kill AoE radius |
| `VOLATILE_ROUNDS.DMG_MULT` | `0.5` | AoE damage fraction of player base damage |
| `VOLATILE_ROUNDS.HIT_FLASH` | `0.1 s` | Hit flash duration on AoE targets |
| `CHAIN_LIGHTNING.RANGE` | `100 px` | Max range for chain kill |
| `CHAIN_LIGHTNING.DMG_MULT` | `0.3` | Chain damage fraction of player base damage |
| `CHAIN_LIGHTNING.HIT_FLASH` | `0.15 s` | Hit flash duration on chain target |

Source: `src/config/BalanceConfig.js:2928-2931`; `src/core/GameplayCallbacks.js:218-248`

### G.8 The 15 modifiers

| ID | Name | Category | Effect | Stackable | Max stacks |
|---|---|---|---|---|---|
| OVERCLOCK | Overclock | OFFENSE | `fireRateMult × 0.80` (lower cooldown = faster rate) | Yes | 2 |
| ARMOR_PIERCING | Armor Piercing | OFFENSE | `piercePlus += 1` | Yes | 2 |
| VOLATILE_ROUNDS | Volatile Rounds | OFFENSE | `volatileRounds = true` → kill AoE 30 px, 50% dmg | No | — |
| CRITICAL_HIT | Critical Hit | OFFENSE | `critChance = min(0.30, critChance + 0.15)` → 15% chance ×3 dmg | Yes | 2 |
| CHAIN_LIGHTNING | Chain Lightning | OFFENSE | `chainLightning = true` → kill chains to 1 nearby enemy (100 px, 30% dmg) | No | — |
| NANO_SHIELD | Nano Shield | DEFENSE | `nanoShieldCooldown = 22 s`, auto-shield every 22 s | No | — |
| EXTRA_LIFE | Extra Life | DEFENSE | `extraLives += 1` (applied on pick callback) | Yes | 99 |
| BULLET_TIME | Bullet Time | DEFENSE | `enemyBulletSpeedMult × 0.80` | Yes | 2 |
| WIDER_GRAZE | Wider Graze | DEFENSE | `grazeRadiusMult = 1.40` | No | — |
| EMERGENCY_HEAL | Last Stand | DEFENSE | `lastStandAvailable = true` → survive 1 lethal hit | No | — |
| DOUBLE_SCORE | Double Score | WILD | `scoreMult × 2.0`, `enemyHpMult × 1.25` | No | — |
| BULLET_HELL | Bullet Hell | WILD | `enemyBulletSpeedMult × 1.40`, `dropRateMult × 1.60` | No | — |
| SPEED_DEMON | Speed Demon | WILD | `speedMult × 1.25` | No | — |
| JACKPOT | Jackpot | WILD | `pityMult × 0.50`, `grazeGainMult × 0.50` | No | — |
| BERSERKER | Berserker | WILD | `damageMult × 1.50`, `noShieldDrops = true` | No | — |

Source: `src/systems/ArcadeModifiers.js:12-107`

**Stack math for multiplicative bonuses (recalculate-from-scratch pattern):**
- `OVERCLOCK × 2`: `1.0 × 0.80 × 0.80 = 0.64` (36% faster fire rate)
- `BULLET_TIME × 2`: `1.0 × 0.80 × 0.80 = 0.64` (36% slower enemy bullets)
- `CRITICAL_HIT × 2`: `critChance = min(0.30, 0 + 0.15 + 0.15) = 0.30` (30% crit cap)
- `DOUBLE_SCORE + BULLET_HELL`: `scoreMult = 2.0`, `enemyBulletSpeedMult = 1.0 × 1.40 = 1.40`

Source: `src/systems/ArcadeModifiers.js:178-206`

### G.9 Category colors (UI)

| Category | Color hex |
|---|---|
| OFFENSE | `#ff6b35` (orange-red) |
| DEFENSE | `#00f0ff` (cyan) |
| WILD | `#ff2d95` (magenta) |

Source: `src/systems/ArcadeModifiers.js:111-115`

### G.10 Visual phase progression

Visual phases are governed by `Balance.SKY.PHASE_TRANSITION` (`src/config/BalanceConfig.js`) — the same config used by campaign mode. No arcade-specific keys; the trigger points (which cycle triggers which transition) are hardcoded in `GameplayCallbacks.js:536-548`.

| Key | Value | Effect |
|---|---|---|
| `SKY.PHASE_TRANSITION.P1P2_DURATION` | `10 s` | Crossfade duration for C1→C2 transition |
| `SKY.PHASE_TRANSITION.P2P3_DURATION` | `10 s` | Crossfade duration for C2→C3 transition |
| Trigger: `marketCycle === 1` | P1→P2 | After C1 boss (FED) defeat |
| Trigger: `marketCycle === 2` | P2→P3 | After C2 boss (BCE) defeat |
| Trigger: `marketCycle >= 3` | None | Already at P3; infinite loop |

The transition is not configurable on/off — it always runs in Arcade mode because the `PhaseTransitionController`/`SkyRenderer`/`WeatherController` are always available. Disabling would require a kill-switch in the trigger code.

---

## Acceptance Criteria

Each criterion is independently testable.

### H.1 Arcade gating: WaveManager active, V8 dormant

**Test:** Launch in Arcade. Verify `G.ArcadeModifiers.isArcadeMode()` returns `true`. Set breakpoint on `G.LevelScript.tick()`.
**Pass:** No `tick()` calls; `WaveManager.wave` increments normally; enemies spawn in formations.

### H.2 Enemy count +15% vs. Story baseline

**Test:** On the same C1W1 definition, compare spawned count in Arcade vs. Story on identical rank/bear settings.
**Pass:** Arcade count = `floor(Story count × 1.15)` ± 1 (rounding).

### H.3 Enemy HP −15% vs. Story baseline

**Test:** Spawn C1W1 in Arcade; read `enemy.hp` on a WEAK enemy. Compare to Story same wave.
**Pass:** `arcadeHP ≈ storyHP × 0.85` ± 1 (floor).

### H.4 Combo counter increments and resets on timeout

**Test:** Kill 5 enemies within 3 s. Verify `rs.comboCount = 5`, `rs.comboMult = 1 + 5×0.05 = 1.25`. Then wait 3.1 s without killing.
**Pass:** `rs.comboCount = 0`, `rs.comboMult = 1.0`, `rs.comboDecayAnim > 0`.

### H.5 Combo multiplier cap at 80 kills

**Test:** Kill 80 enemies without a 3-second gap (use `dbg.maxWeapon()` + wave of weak enemies).
**Pass:** `rs.comboMult === 5.0` (capped); killing enemy 81 does not increase it further.

### H.6 Graze extends active combo timer

**Test:** Achieve combo of 3. Let timer decay to ≈1.0 s. Graze a bullet.
**Pass:** `rs.comboTimer` jumps to `≥ 1.5 s` (added 0.5 s). No graze extension when `comboTimer ≤ 0`.

### H.7 Death resets combo, preserves modifiers

**Test:** Build combo to 20. Die (exhaust lives > 1). Verify `rs.comboCount = 0`, `rs.comboMult = 1.0`. Verify `rs.arcadeModifiers` array unchanged.
**Pass:** Combo reset; modifier stack intact.

### H.8 Mini-boss threshold is 0.65× of base

**Test:** In Arcade C1, track `$` kills. Mini-boss should spawn at kill 14 (`floor(22 × 0.65)`).
**Pass:** `G.MiniBossManager.isActive() === true` after kill #14 (no earlier, barring cooldown).

### H.9 Mini-boss cooldown: 10 s between spawns

**Test:** Trigger mini-boss. Kill it. Immediately trigger kill threshold again.
**Pass:** Second mini-boss does not spawn until ≥ 10.0 s after first spawn time.

### H.10 Mini-boss HP is 50% of full boss HP (Arcade)

**Test:** Read `G.MiniBossManager.get().hp` after spawn in Arcade C1.
**Pass:** `miniBossHp ≈ floor(calculateBossHP(1, 1) × 0.50 × perkScaling)`.

### H.11 Post-mini-boss pick shows 2 cards

**Test:** Kill mini-boss in Arcade. Wait 800 ms.
**Pass:** `G.ModifierChoiceScreen.isVisible() === true`; 2 cards visible in DOM.

### H.12 Post-boss pick shows 3 cards with category guarantee

**Test:** Kill full boss in Arcade. Wait celebration delay + 1500 ms.
**Pass:** 3 cards visible; at least 1 is OFFENSE and at least 1 is DEFENSE (when pool has both available).

### H.13 Keyboard selection works (digits 1–3)

**Test:** Open modifier pick with 3 cards. Press `2` on keyboard.
**Pass:** Second card gets `modifier-card-selected` class; modifier applied; screen closes after 600 ms.

### H.14 Non-stackable modifier excluded from subsequent pools

**Test:** Pick VOLATILE_ROUNDS. Kill next mini-boss and open pick.
**Pass:** VOLATILE_ROUNDS does not appear in the new card selection.

### H.15 Stackable modifier reaches max stacks then excluded

**Test:** Pick OVERCLOCK twice (it has `maxStacks: 2`). Open next pick.
**Pass:** OVERCLOCK does not appear; `fireRateMult = 1.0 × 0.80 × 0.80 = 0.64`.

### H.16 Post-C3 wave definitions cycle C4=C1, C5=C2

**Test:** Reach C4 in Arcade. Observe formation patterns.
**Pass:** `Balance.getWaveDefinition(4, 1)` returns a (possibly remixed) clone of `getWaveDefinition(1, 1)` base; `effectiveCycle === 1` confirmed via debug.

### H.17 Formation remix at 40% chance post-C3

**Test:** Sample `getWaveDefinition(4, 1)` 100 times. Count phases with formation differing from C1W1 original.
**Pass:** ~40% ± 10% of phases have a remixed formation.

### H.18 Difficulty caps at C5+

**Test:** Log `Balance.calculateDifficulty(1, 5)` and `Balance.calculateDifficulty(1, 6)`.
**Pass:** Both return `1.0` (capped); C5 `baseDiff = 0.60 + 2×0.20 = 1.00`.

### H.19 Last Stand triggers once, not twice

**Test:** Pick EMERGENCY_HEAL. Reduce lives to 1. Take lethal hit.
**Pass:** Player survives with `hp = 1`; `lastStandAvailable = false`. Second lethal hit triggers normal death.

### H.20 Arcade records update on game over

**Test:** Reach cycle 3, die. Verify `fiat_arcade_records` in localStorage has `bestCycle ≥ 3`. Immediately play again and die at cycle 1. Verify record is NOT downgraded.
**Pass:** Records hold the best values across runs; lower run doesn't overwrite.

### H.21 Leaderboard uses real wave/cycle

**Test:** Intercept `G.Leaderboard.renderGameoverRank()` call in Arcade. Read `submitWave` and `submitCycle` arguments.
**Pass:** `submitWave === G.WaveManager.wave`, `submitCycle === window.marketCycle`.

### H.22 Nano Shield auto-triggers every 22 s

**Test:** Pick NANO_SHIELD. Wait 22 s without manually activating shield.
**Pass:** `player.shieldActive === true` fires at 22 s ± 0.5 s; `nanoShieldTimer` resets to 22.

### H.23 BERSERKER blocks shield drops

**Test:** Pick BERSERKER. Kill 100 enemies, count UTILITY shield drops.
**Pass:** Zero shield drop power-ups appear (while BERSERKER active).

### H.24 `dbg.arcade()` reports active modifier stack

**Test:** Pick OVERCLOCK + DOUBLE_SCORE. Run `dbg.arcade()` in console.
**Pass:** Output lists both modifiers, their bonuses (`fireRateMult: 0.80`, `scoreMult: 2.0`), comboCount, best combo.

### H.25 Visual phase transitions on C1 and C2 boss defeat

**Test:** Start an arcade run. Defeat the C1 boss (FED). Within 2s of the modifier pick screen appearing, verify `G.PhaseTransitionController.isTransitioning() === true` and `getFromPhase() === 1, getToPhase() === 2`.
**Pass:** `G.SkyRenderer` and `G.WeatherController` phase set to 2; sky crossfade visible. Repeat for C2 boss → P2→P3.

### H.26 No visual phase transition on C3+ boss defeat

**Test:** Reach C3 in arcade (defeat two bosses). Defeat the C3 boss (BOJ). Verify no transition fires.
**Pass:** `G.PhaseTransitionController.isTransitioning() === false` before and after the boss defeat; `getCurrentPhase() === 3` unchanged.

### H.27 Visual phase resets to P1 on new arcade game

**Test:** Complete an arcade run to C2+ (sky at P2 or P3). Start a new arcade game.
**Pass:** `G.PhaseTransitionController.getCurrentPhase() === 1`; `G.SkyRenderer` phase is 1; sky shows blue daylight, green hills, no stars.

---

## Documented Gaps

### Gap 1 — COMBO.COLORS label inversion

`Balance.ARCADE.COMBO.COLORS` names (`WHITE=10, YELLOW=30, ORANGE=50, RED=999`) are thresholds but the HUD code checks `>= ORANGE (50)` for red, `>= YELLOW (30)` for orange, `>= WHITE (10)` for yellow. The labels describe the *next* tier's color, not the color applied at that threshold. This is confusing to read in config. No gameplay impact.
Source: `src/main.js:3419-3424`; `src/config/BalanceConfig.js:2903-2909`

### Gap 2 — ~~`MAX_MODIFIERS (20)` not enforced~~ — **Resolved v7.12.6**: dead config key removed.

### Gap 3 — ~~`grazeGainMult` declared but not read~~ — **Resolved v7.12.6**: malus now consumed in `GameplayCallbacks.js:278` (proximity kill gain) and `main.js:4391` (`addProximityMeter` for boss hits). JACKPOT is now a real trade-off (+pity halved / -DIP gain halved).

### Gap 4 — CLAUDE.md says "15 modifiers" but `MODIFIER_POOL` has 15 entries

Count confirmed: 5 OFFENSE + 5 DEFENSE + 5 WILD = 15. No discrepancy.

### Gap 5 — Post-C3 difficulty `ARCADE` reference in non-Arcade path

`calculateDifficulty` checks `window.Game.ArcadeModifiers && window.Game.ArcadeModifiers.isArcadeMode()` before applying `POST_C3_DIFF_PER_CYCLE`. In Story mode, if cycle ever exceeded 3 (it can't in practice), the branch would be skipped and baseDiff would be clamped to `CYCLE_BASE[2] = 0.60`. Safely gated.

### Gap 6 — ~~`CHAIN_LIGHTNING` 30% chance missing~~ — **Resolved v7.12.6**: `Math.random() < CHANCE` guard added in `GameplayCallbacks.js:235`; `Balance.ARCADE.MODIFIER_TUNING.CHAIN_LIGHTNING.CHANCE = 0.30` extracted as tunable config key.

### Gap 7 — ~~Visual phase progression missing (Pillar 4)~~ — **Resolved v7.31.0**

Arcade mode was visually frozen at Phase 1 (blue sky / daylight) for the entire infinite run despite the `PhaseTransitionController`/`SkyRenderer`/`WeatherController` infrastructure supporting all three phases. Phase transitions now trigger at C1 boss (P1→P2) and C2 boss (P2→P3) in `GameplayCallbacks.js:536-548`, giving arcade the same visual journey as campaign.

### Gap 8 — ~~CYCLE_COUNT_MULT / MAX_CONCURRENT / PHASE_TRIGGER drifted from wave GDD~~ — **Resolved v7.31.0**

Arcade GDD had stale values from pre-v6.5 tuning:
- `CYCLE_COUNT_MULT`: `[1.0, 1.2, 1.5]` → corrected to `[1.0, 1.25, 1.45]` (v4.40 nerf)
- `MAX_CONCURRENT_ENEMIES`: `22` → corrected to `18` (v6.5: "22→18")
- `PHASE_TRIGGER`: `THRESHOLD_RATIO 0.35`, `MAX_THRESHOLD 6` → corrected to `0.25` / `4` (v6.5 tuning)

The wave-legacy-arcade.md GDD is the authoritative reference for these values since it documents the tuning history. Arcade GDD now matches.

*End of GDD — Arcade Rogue Protocol v7.31.0*
