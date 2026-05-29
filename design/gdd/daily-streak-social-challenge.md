# Daily Streak & Social Challenge

## Overview

Epic di retention e acquisizione organica. Aggiunge un ciclo giornaliero (daily seed run) con streak counter, bonus multiplier crescente, classifica separata per il seed del giorno, e meccanismi di condivisione (URL challenge + screenshot Web Share) che trasformano ogni run in un potenziale viral loop.

Il sistema si appoggia interamente a infrastruttura esistente: `DailyMode.js`, `LeaderboardClient.js`, Cloudflare Worker KV, `MigrationSystem.js`, PWA Service Worker. Nessun asset grafico o audio nuovo richiesto.

## Player Fantasy

> "Torno ogni giorno per battere il mio record e sfidare gli amici sullo stesso seed. Se arrivo a 7 giorni di fila, il mio punteggio vale il doppio. Dopo una run epica condivido lo screenshot con il mio punteggio e il seed — chi clicca il link entra direttamente nella classifica di quel giorno."

## Detailed Rules

### Daily Streak

1. Ogni giorno UTC (00:00–23:59) in cui il giocatore completa almeno un Daily Run conta come "streak day".
2. Lo streak è salvato in `MigrationSystem` chiave `fiat_daily_streak` con struttura: `{ current: number, lastDate: YYYYMMDD, best: number }`.
3. Se `lastDate` è ieri UTC → streak incrementa. Se è oggi → nessun cambio. Se > 48h fa → reset a 1.
4. Bonus multiplier applicato allo score finale: `1 + current * 0.05`, cap a 2.0x (40 giorni).

### Daily Leaderboard

1. Endpoint worker: `GET /daily?seed=YYYYMMDD_SALT` → top 50 punteggi per quel seed.
2. `DailyMode.modeToken()` genera il token giornaliero: `SHA256(UTC_YYYY-MM-DD + HMAC_SECRET).slice(0, 8)`.
3. Tab "DAILY" nella leaderboard panel (accanto a STORY / ARCADE).
4. Al cambio UTC il tab mostra il nuovo seed con countdown "Resets in HH:MM".

### Challenge URL

1. Al gameover della Daily Run, URL share generato: `https://fiatvscrypto.pages.dev/?daily=SEED&score=12345&nick=XYZ`.
2. Chi visita il link: il parametro `daily=SEED` attiva `DailyMode` con quel seed e apre la leaderboard tab DAILY pre-selezionata.
3. Se il seed è scaduto (> 24h), mostra "Seed scaduto — gioca il Daily di oggi".

### Web Share Screenshot

1. Al gameover: `canvas.toBlob()` → genera PNG 600×400 con HUD overlay (score, seed, nick).
2. `navigator.share()` con: title, text, file (PNG). Fallback: copia text + link in clipboard.
3. Solo se `navigator.canShare({ files })` è true (mobile moderno + desktop Chrome).

### PWA Push Notification

1. Opt-in: bottone nelle Settings "Daily reminder".
2. Registra `PushManager` subscription nel SW.
3. Allo scadere UTC, SW emette `self.registration.showNotification()` con: "Il nuovo Daily è pronto! 🚀".
4. Click sulla notifica apre il gioco in modalità Daily.

## Formulas

| Variabile | Formula |
|-----------|---------|
| `streakMultiplier` | `min(2.0, 1.0 + currentStreak * 0.05)` |
| `seedToken` | `SHA256(YYYY-MM-DD + HMAC_SECRET).slice(0, 8)` |
| `bonusScore` | `rawScore * streakMultiplier` |
| `streakResetThreshold` | `48` ore |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Giocatore gioca alle 23:59 UTC → vince alle 00:01 | Conta per il giorno di inizio run (timestamp `markAttempt()`). |
| Skip > 48h | Streak resetta a 1. Nessun bonus giorno 0. |
| Web Share non supportato | Fallback a `navigator.clipboard.writeText()` con messaggio testo + link. |
| Seed scaduto in URL | Mostra toast "Seed scaduto" e reindirizza al Daily odierno. |
| Push notification negata dall'utente | Salva flag `fiat_push_denied`. Non richiedere più. |
| Streak persistence corrotta | `MigrationSystem` versioning. Se `fiat_daily_streak` non ha schema v1, reset a `{ current: 0, lastDate: '', best: 0 }`. |

## Dependencies

- `src/managers/DailyMode.js` — seed generation, active state
- `src/managers/LeaderboardClient.js` — submit + fetch, nuovo tab DAILY
- `workers/leaderboard-worker.js` — endpoint `/daily`, KV key prefix `daily:`
- `src/utils/MigrationSystem.js` — persistence streak
- `src/ui/GameCompletion.js` — share URL + screenshot trigger
- `sw.js` — push notification handler
- `src/ui/IntroScreen.js` — daily tab pre-selection da URL param

## Tuning Knobs

| Knob | Default | Dove |
|------|---------|------|
| `STREAK_MAX_DAYS` | 40 (cap multiplier) | `BalanceConfig.js` |
| `STREAK_BONUS_PER_DAY` | 0.05 | `BalanceConfig.js` |
| `STREAK_RESET_HOURS` | 48 | `BalanceConfig.js` |
| `DAILY_LEADERBOARD_TOP_N` | 50 | Worker config |
| `SHARE_IMAGE_SCALE` | 0.5 (canvas → 600px) | `GameCompletion.js` |
| `PUSH_HOUR_UTC` | 0 (mezzanotte) | `sw.js` |

## Acceptance Criteria

| # | Criterio | Test |
|---|----------|------|
| 1 | Streak salvato e caricato correttamente | `tests/unit/daily_streak_test.js` |
| 2 | Bonus multiplier applicato al submit score | Assert `submittedScore === rawScore * multiplier` |
| 3 | Daily tab leaderboard mostra top 50 per seed | Browser test: fetch mock con seed fittizio |
| 4 | Challenge URL `?daily=SEED` attiva DailyMode e pre-seleziona tab | Browser test: `URLSearchParams` + stato intro |
| 5 | Screenshot generato con overlay HUD (score, seed, nick) | Manual: screenshot verifica contenuto PNG |
| 6 | Push notification opt-in salvato in MigrationSystem | `tests/unit/push_preference_test.js` |
| 7 | Streak reset dopo 48h di inattività | Mock `Date.now()` a +49h |
| 8 | Nessuna regressione test suite esistente | `run-unit-tests.js` → 2173+ asserts PASS |
