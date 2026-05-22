# Checkpoint / Save System

## 1. Overview

The Checkpoint System saves the player's complete game state after each boss
defeat in V8 Campaign Mode (story mode). A single auto-save slot stores the
loadout, progression, and run state so the player can close the game and resume
exactly where they left off — directly into the next level, with no progress
lost.

## 2. Player Fantasy

> "I can play in short sessions and never lose progress."

The checkpoint system removes the commitment problem: a player can fight a boss,
save, close the browser, come back a day later, and pick up exactly where they
stopped — weapons intact, perks active, score preserved. This is especially
important for a PWA played on mobile in short bursts.

## 3. Detailed Rules

### 3.1 Autosave Trigger

The save occurs **once per boss defeat**, at this specific point in the flow:

```
Boss destroyed → defeat animation → boss:defeated event →
CampaignState.defeatBoss() → STORY_SCREEN (chapter crawl) →
crawl completes → SAVE CHECKPOINT → INTERMISSION → PLAY (next level)
```

The save fires **after** the story crawl completes but **before** transition to
the next level. This ensures:
- The story chapter for the defeated boss has been shown
- `CampaignState` has already recorded the boss as defeated and unlocked the next
- The player's final state (HP, weapon levels, perks, score) is captured

### 3.2 Save Content

The checkpoint serialises the following into a single localStorage entry:

| Field | Source | Description |
|-------|--------|-------------|
| `version` | — | Schema version for migration |
| `timestamp` | `Date.now()` | When the save was created |
| `shipType` | `RunState.shipType` | Selected ship (BTC / ETH / SOL) |
| `nextBoss` | `CampaignState.getNextBoss()` | Boss to fight on resume |
| `levelNumber` | `RunState.currentLevel` | Current V8 level (1-4) |
| `weaponLevel` | `Upgrades.weaponLevel` | Current weapon level (1-3) |
| `perks` | `Upgrades.perks` | Array of acquired perks |
| `perkOrder` | `Upgrades.order` | [fire, laser, electric] |
| `godchainActive` | `Upgrades.godchainActive` | GODCHAIN fusion unlocked? |
| `hyperActive` | `RunState.hyperActive` | HYPER mode active? |
| `lives` | `RunState.lives` | Lives remaining |
| `score` | `RunState.score` | Current score at checkpoint |
| `specials` | `Upgrades.specials` | Active special buffs |
| `utilities` | `Upgrades.utilities` | Active utility buffs |
| `ngPlusLevel` | `CampaignState.ngPlusLevel` | NG+ cycle |
| `bossesDefeated` | `CampaignState.bosses` | Which bosses are defeated |
| `storyProgress` | `CampaignState.storyProgress` | Chapters seen |

### 3.3 Resume Flow

When a checkpoint exists, the IntroScreen shows a **"Continua"** button:

```
INTRO → [Continua] → skip HANGAR → skip ship select →
restore saved state to RunState/Upgrades →
short countdown (3-2-1) → PLAY (level = nextBoss's level)
```

**"Continua" replaces the normal HANGAR flow** — the player does not re-select
a ship. The ship type, weapon levels, perks, and score from the checkpoint are
restored automatically.

### 3.4 How "Nuova Partita" Interacts

- **"Nuova Partita"** clears the checkpoint. The player starts fresh from
  level 1, no ship selected, no perks.
- **"Continua"** is only available when a checkpoint exists.
- The checkpoint is **not** cleared on death or game over — the player can
  still resume from their last checkpoint even if they die in the next level.
- The checkpoint is **replaced** only when a new boss is defeated (a new save
  overwrites the old one).

### 3.5 What Is NOT Saved

| State | Reason |
|-------|--------|
| Current HP / shield | Would be stale on resume; player starts next level at full HP |
| DIP meter | Per-boss mechanic, resets per encounter |
| Combo counter | Per-run volatile state, too short-lived |
| Active enemies / bullets | Battlefield state is ephemeral |
| Temporary buffs (HOMING/PIERCE/MISSILE/SHIELD/SPEED) | Transient, would be stale on resume |
| Bear market level | Recalculated on game start |

### 3.6 localStorage Key

All checkpoint data is stored under a single key:

```
Key:   fiat_checkpoint
Schema version: 1
```

Written via `MigrationSystem.set()` and read via `MigrationSystem.get()`.

## 4. Formulas

No mathematical formulas. Save data is direct serialisation of existing game
state objects with no transformation.

## 5. Edge Cases

### 5.1 Starting New Game While Checkpoint Exists

- "Nuova Partita" calls `CheckpointManager.clearCheckpoint()` + `CampaignState.fullReset()`
- The checkpoint is deleted; the player starts entirely fresh

### 5.2 Checkpoint After Campaign Completion

- After BOJ is defeated, the save is written as normal
- "Continua" loads the player at CAMPAIGN_VICTORY → INTRO loop
- Starting NG+ from "Continua" applies NG+ difficulty with saved perk carryover

### 5.3 Save Data Corruption

- If `MigrationSystem.get('fiat_checkpoint')` returns invalid data (missing
  required fields, version mismatch), the checkpoint is silently deleted and
  "Continua" is hidden
- A console warning is logged for debugging

### 5.4 NG+ with Checkpoint

- NG+ level is saved in the checkpoint
- On resume, `CampaignState.ngPlusLevel` is restored; difficulty multipliers
  apply as normal
- Perk carryover from the checkpoint is applied on resume

### 5.5 Empty Checkpoint State Before First Boss

- No checkpoint exists before the first boss is defeated
- "Continua" button is hidden in IntroScreen
- Player must go through normal HANGAR flow

### 5.6 Multiple Tabs / Storage Race

- The last tab to save wins (no merge logic required)
- A version field on the save data allows future schema migrations

### 5.7 Graceful Degradation on Ship Removal

If the checkpoint contains a ship type (`shipType`) that no longer exists in the
current game version (e.g., a ship was removed in an update), the resume
defaults to the first available ship (BTC) and logs a warning. The rest of the
checkpoint data (weapons, perks, score) is preserved.

### 5.8 Game Over After Checkpoint Save

- Player dies after a checkpoint save → GAMEOVER → INTRO
- "Continua" is still available — clicking it resumes from the last checkpoint
- The death and subsequent game-over runs do NOT clear the checkpoint

## 6. Dependencies

| System | Type | Notes |
|--------|------|-------|
| CampaignState | Internal | Reads boss progression and NG+ state |
| RunState | Internal | Reads score, lives, ship type, HYPER state |
| Upgrades | Internal | Reads weapon level, perks, specials, utilities |
| GameStateMachine | Internal | Transitions through PLAY → STORY_SCREEN → save |
| IntroScreen | UI | Must show/hide "Continua" button |
| main.js | Wiring | Save hook after story crawl completes |
| MigrationSystem | Persistence | localStorage write/read wrapper |
| GameplayCallbacks | Trigger | `_maybeShowStoryChapter()` → save after crawl |
| DialogueUI / StoryScreen | UI | No direct dep — save fires after crawl completes |

## 7. Tuning Knobs

| Knob | Default | Purpose |
|------|---------|---------|
| `CHECKPOINT_ENABLED` | `true` | Kill-switch for the entire system |
| `CHECKPOINT_KEY` | `"fiat_checkpoint"` | localStorage key |
| `CHECKPOINT_VERSION` | `1` | Schema version |

All knobs live in `BalanceConfig.js`.

### 7.1 Module: CheckpointManager

A new module `src/managers/CheckpointManager.js` (singleton `Game.CheckpointManager`)
encapsulates all checkpoint logic:

- `save()` — serialises state from CampaignState, RunState, Upgrades into localStorage
- `load()` — reads and validates localStorage, returns parsed checkpoint or null
- `clearCheckpoint()` — deletes the localStorage key
- `hasCheckpoint()` — returns boolean
- `resumeFromCheckpoint()` — restores state to RunState/Upgrades and transitions to PLAY

No UI logic — CheckpointManager is data-only. UI (IntroScreen) calls `hasCheckpoint()`
to show/hide "Continua".

### 7.2 IntroScreen — "Continua" Button

The "Continua" button appears in the main menu as the **first option**, above
"Nuova Partita":


## 8. Acceptance Criteria

1. **Autosave fires after boss defeat** — After defeating FEDERAL_RESERVE, after
   CHAPTER_1 crawl completes, a checkpoint is written to localStorage. Verified
   via `MigrationSystem.get('fiat_checkpoint')`.
2. **"Continua" appears in IntroScreen** — With a valid checkpoint, the main
   menu shows a "Continua" button. Verified visually.
3. **Resume restores full state** — Clicking "Continua" skips HANGAR, restores
   ship type, weapon level, perks, lives, and score from the checkpoint. Player
   starts the next level with saved loadout. Verified via debug inspection.
4. **"Nuova Partita" clears checkpoint** — After clicking "Nuova Partita", the
   checkpoint is deleted, "Continua" disappears, and the player starts fresh.
5. **Checkpoint survives game over** — Player dies after checkpoint save →
   GAMEOVER → INTRO → "Continua" still present. Verified.
6. **Save data corruption handled gracefully** — Corrupted localStorage data is
   silently deleted; "Continua" hidden. Verified by manually corrupting the key.
7. **NG+ with checkpoint** — NG+ level is part of save data; on resume,
   difficulty multiplier applies correctly. Verified.
8. **No checkpoint before first boss** — Fresh game has no "Continua" button.
   Verified.
