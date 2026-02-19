# Roadmap: FIAT vs CRYPTO

> **Versione attuale**: v6.5.4 (2026-02-18)
> **Focus**: Mobile-first PWA. Desktop fully supported.

---

## COMPLETATO — Remove PaperTear + Privacy Scroll + Layout Fixes (v6.5.2–v6.5.4)

- [x] v6.5.2: Dynamic Island safe area fix — `--di-safe-top` CSS var heuristic per Safari browser
- [x] v6.5.3: Full-bleed canvas su iOS PWA — container `top:0;bottom:0`, +93px visual area
- [x] v6.5.4: Rimosso sistema PaperTear "Digital Scanline Void" (file, config, 9 ref in main.js)
- [x] v6.5.4: Privacy panel scrolla su iOS (`touch-action: pan-y`)
- [x] v6.5.4: Fix intro icons/version overlap, debug overlay safe-top behind Dynamic Island

---

## COMPLETATO — Browser Compat Check + Debug Logging (v6.4.1)

- [x] Browser compatibility check in `index.html` — `eval('_t?.a??0')` prima di qualsiasi script
- [x] Old browsers (Chrome <80, Safari <14): styled error message invece di freeze silenzioso
- [x] Elite variant spawn logging (`[ELITE] symbol → type (chance%)`) in `createEnemy()`
- [x] Enemy behavior spawn logging (`[BEHAVIOR] symbol → type (gWave)`) in `createEnemy()`
- [x] Testato su Huawei Y5 2018 (Android 8.1, Chrome vecchio): compat check mostra messaggio corretto
- [x] Dopo aggiornamento Chrome su stesso device: gioco funziona

---

## COMPLETATO — Debug Overlay v2: Error Log + Intro Access (v6.4.0)

- [x] Session Log Buffer in DebugSystem (`sessionLog[]` max 40, categorie STATE/WAVE/BOSS/MINIBOSS/QUALITY)
- [x] `flushSessionLog()` salva in localStorage su endAnalyticsRun, onerror, beforeunload
- [x] `getPreviousSessionLog()` legge sessione precedente da localStorage
- [x] LAST ERROR section (msg, location, time-ago da `window._lastError`)
- [x] SESSION LOG section (monospace `+M:SS [CAT] msg`, scrollabile, max 200px)
- [x] Intro access: triple-tap su `#version-tag` in stato INTRO → dati sessione precedente
- [x] Context-aware: GAMEOVER=sessione corrente, INTRO=sessione precedente
- [x] QualityManager logga tier changes nel session log
- [x] Mailto aggiornato: include error + log (budget 600 char per log, 1800 totale)
- [x] Auto-hide su startGame() (copre transizione intro→game)

### Da verificare
- [x] Game over → triple-tap → overlay 6 sezioni (error+log visibili se dati presenti) — verificato v6.5.4 iPhone
- [x] Intro → triple-tap su version tag → dati sessione precedente — verificato v6.5.4 iPhone
- [ ] Errore forzato (`throw new Error('test')`) → LAST ERROR visibile
- [x] Mailto SEND: tutte le sezioni, sotto 1800 chars — verificato
- [x] Auto-hide: RETRY/MENU da game over, lancio gioco da intro — verificato v6.5.4 iPhone

---

## COMPLETATO — Debug Overlay Mobile (v6.3.1)

- [x] Triple-tap detection al game over (3 tap in 800ms su sfondo, ignora pulsanti)
- [x] 4 sezioni report: Device, Performance, Game Session, Quality Judgment
- [x] SEND DEBUG REPORT via mailto (plain text, 1800 char limit)
- [x] iOS-safe scrolling (pattern manual-modal)
- [x] Auto-hide su RETRY/MENU
- [x] z-index 10050, fullscreen su mobile <500px

---

## COMPLETATO — ULTRA Quality Tier (v6.3.0)

- [x] Nuovo tier ULTRA sopra HIGH per device flagship
- [x] ~30 parametri VFX boostati (particles, canvas effects, glow, sky, explosions, muzzle, HYPER, vapor, energy skin)
- [x] Auto-promozione >58fps per 8s (più stringente di recover >55fps/5s)
- [x] `_applyTier()` refactorato: clean slate pattern (restore defaults → applica override)
- [x] Settings cycle: AUTO → ULTRA → HIGH → MEDIUM → LOW

---

## COMPLETATO — Streaming Flow Fix (v6.2.0)

- [x] Boss timing: wave++ spostato da `_spawnPhase()` a streaming-complete — boss al livello 5
- [x] Horde elimination: `getHordesPerWave()` → 1 quando streaming attivo — no H2/bullet-clearing/pause
- [x] Firing fix: `areEnemiesEntering()` → false durante streaming — player spara sempre
- [x] C1 formations: DIAMOND rimosso, tutte wave 3 fasi (RECT/WALL/ARROW)
- [x] C2 W1-W3 e C3 W1-W2: aggiunta 3ª fase per compensare rimozione H2
- [x] MAX_Y_RATIO C1: 0.48 → 0.42 (formazioni più piatte)
- [x] Defensive early-return in `startHordeTransition()`
- [x] WaveManager header/commenti aggiornati, doc stale ripuliti

### Verificato da test
- [x] Boss FEDERAL_RESERVE spawna a L5 (wave 6 > 5)
- [x] Zero "HORDE 2!" messaggi — flusso continuo
- [x] Player spara durante entry fasi (HYPER attivato, kill streak 199)
- [x] 3 fasi per wave in C1 (35→49 nemici/livello, progressione graduale)
- [x] Formazioni max Y378 su schermo ~900px (42% ratio rispettato)
- [x] Peak enemies: 20 (sotto cap 22)
- [x] FPS medio 135, verdict EXCELLENT

### Verificato da test v6.4.1 (PC + Android)
- [x] C1 completo: 5 wave × 3 fasi, escalation 35→49 nemici, boss FEDERAL_RESERVE a wave 6 (HP 3223)
- [x] Max concurrent enemies: 22 (cap raggiunto, mai superato)
- [x] Quality Manager: auto-promote a ULTRA, 144fps PC, 0 jank
- [x] Performance: avg frame 0.71ms, P95 1.13ms, P99 1.38ms, verdict EXCELLENT
- [x] HYPER: 3 attivazioni, 52s totale (21% del gameplay)
- [x] Drop economy: 7 spawned, 6 collected (85.7%), adaptive balancer funzionante
- [x] Mobile device reale (Android): gioco funziona su Huawei Y5 2018 con Chrome aggiornato

### Da verificare
- [ ] Arcade mode: confermare che streaming + horde elimination funzionino anche in Arcade
- [ ] C2 completo: verificare che DIAMOND appaia in C2+ e formazioni complesse funzionino
- [ ] C3 completo: verificare wave 3-5 (STAIRCASE, HURRICANE, FINAL_FORM invariate)
- [ ] Boss C2 (BCE) e C3 (BOJ): verificare spawn corretto a L10 e L15
- [ ] Bear Market: verificare scaling nemici (+25%) con streaming
- [ ] Post-C3 Arcade infinite: verificare che cycle rotation funzioni con nuove wave definitions
- [ ] Elite/Behaviors: verificare visualmente con nuovi log (mid-game `dbg.elites()` su W3+)

---

## COMPLETATO — Story Screen Accessibility (v6.1.1)

- [x] Tutti 32 testi narrativi riscritti senza gergo crypto/finance
- [x] HIGHLIGHT_KEYWORDS aggiornati (-8 gergo, +2 honest money/denaro onesto)

---

## COMPLETATO — Adaptive Quality Tiers (v6.1.0)

- [x] QualityManager: FPS monitor + 3-tier (HIGH/MEDIUM/LOW) + AUTO detect
- [x] ParticleSystem runtime API (setMaxParticles/setMaxCanvasEffects)
- [x] Settings UI toggle + localStorage + debug commands

---

## COMPLETATO — Phase-Based Streaming + Elite + Behaviors (v6.0.0 "RafaX Release")

- [x] Phase-based streaming: waves have 2-3 independent phases with own formation/count/currencies
- [x] Phase trigger on alive-count (<=35% threshold) — replaces batch timer system
- [x] MAX_CONCURRENT_ENEMIES hard cap (22), per-phase escalation (+10% fire, +5% behavior)
- [x] Elite Variants: C1 Armored (HP*2), C2 Evader (dash), C3 Reflector (reflects 1 bullet)
- [x] 4 enemy behaviors: Flanker, Bomber (danger zones), Healer (aura), Charger
- [x] 9 new debug commands (elites/behaviors/streaming/waveReport + toggles)
- [x] NOTES.md removed (stale since v5.11), MEMORY.md consolidated

---

## COMPLETATO — Gameplay Polish + HYPER Rework + Mobile Hardening (v5.31.0)

- [x] Shield Energy Skin (body-conform 8-vertex, 4-layer glow)
- [x] HYPER Aura rework: speed lines + timer bar replace circles/rings
- [x] Bullet Banking (BULLET_FOLLOW: 0.5)
- [x] Mobile hardening: overscroll, contextmenu, gesturestart, resize throttle
- [x] Boss C1 HP nerf, elementals +10% dmg, tutorial rewrite

---

## COMPLETATO — Ship Flight Dynamics (v5.30.0)

- [x] Banking Tilt: rotazione smooth laterale proporzionale a vx (max 12.6°, lerp asimmetrico)
- [x] Hover Bob: oscillazione sinusoidale verticale (2.5px, 1.8Hz) smorzata dalla velocità
- [x] Asymmetric Thrust: fiamma interna curva 1.5×, esterna 0.7× durante banking
- [x] Wing Vapor Trails: particelle additive dai wingtip ad alta velocità (colore reattivo HYPER/GODCHAIN)
- [x] Squash & Stretch: micro-deformazione su accelerazione brusca
- [x] Afterimage banked, `_flight` state zero-alloc, 5 kill-switch individuali

---

## COMPLETATO — Game Over Layout + OLED Deep Black (v5.29.1)

- [x] Game over title ridotto a 1 riga (20-28px), score promosso a HERO (56-80px bianco)
- [x] Meme cyan uppercase, label piccola 11px, stats inline flex row
- [x] Bottoni full-width 280px (retry primary, menu btn-sm)
- [x] 11 inner containers rgba semi-trasparenti → pure `#000000` OLED

---

## COMPLETATO — Game Over Redesign + Icon Regeneration (v5.29.0)

- [x] Tutti overlay/pannelli background → opaque `#000000`
- [x] Container interni → `#000000` (modal-content, boxes, carousel, bar-container)
- [x] Scrollbar tracks → `#000000`
- [x] Icon generator riscritto per nave v5.28 LV3 (scale 8.0, no title, twin engine trail)

---

## COMPLETATO — Ship Redesign "Premium Arsenal" (v5.28.0)

- [x] Nave +30% più grande, 8-vertex ∧ delta swept-back
- [x] Cockpit canopy ellisse vetrata con ₿ reattivo per elemento
- [x] Nose cannon con cannonLen, heavy central barrel LV3, wing pods ridisegnati
- [x] Energy circuit lines LV3, Energy Surge slowmo, setHitStop()
- [x] Hitbox BTC 55/10, HYPER aura 46/75/69, Shield hex r=68

---

## COMPLETATO — Bugfix Countdown + Ship Redesign "Inverted-V Delta" (v5.27.1)

- [x] Fix countdown stuck al 3 (spostato `_startPlayCountdown()` dopo reset)
- [x] Ship rewrite completo: 8-vertex ∧ arrowhead (God Phoenix inspired)
- [x] Wing cannons al 30% leading edge, central barrel da nose, twin exhaust

---

## COMPLETATO — Polish & Feel (v5.27.0)

- [x] Boss HP bar semplificata (solo barra + notch diamante threshold)
- [x] Tutorial testo arcade EN/IT con tono videogioco
- [x] Elemental cannon tint (CANNON_TINT config, priorità GC>Elec>Laser>Fire)
- [x] Game start countdown 3→2→1→GO!

---

## COMPLETATO — Unified Combat HUD + HYPERGOD State (v5.26.0)

- [x] Message-strip ridimensionato a 48px Combat HUD Bar con fill bar animata
- [x] HYPER/GODCHAIN/HYPERGOD unificati nella stessa barra (gold/red-orange/prismatic)
- [x] HYPERGOD state: HYPER+GODCHAIN simultanei = 5× score multiplier
- [x] Combat bar non interrotta da messaggi low-priority (wave/info/pickup)
- [x] Pulse-before-fade su transient messages e bottom status popup
- [x] Rimossi drawHyperUI/drawGodchainUI canvas (~150 righe)
- [x] Status text bottom 14→16px

---

## COMPLETATO — Power-Up Redesign + Status HUD + Tuning (v5.25.0)

- [x] Power-up unificati come cerchi 3D con icona bianca + blink
- [x] HOMING bullet come orb tracker (arancione, opposto a MISSILE blu)
- [x] Status HUD: meme-popup riusato per stato nave durante PLAY
- [x] Shield blink ultimi 1.5s, durate special/utility 12→8s, perk threshold 70→100

---

## COMPLETATO — Boss UX + Leaderboard Dedup + C1 Nerf (v5.23.8)

- [x] Boss HP bar/nome spostati sotto il boss (larghezza = larghezza visiva boss)
- [x] Game over nasconde HUD layer (graze meter, DIP bar)
- [x] Rank leaderboard usa high score da localStorage (non score stale)
- [x] Nickname dedup: 1 solo entry per nickname (best score only)
- [x] Device binding: 1 nickname per dispositivo (UUID in localStorage)
- [x] Device ID nell'HMAC (backward-compatible)
- [x] C1 FED nerf: HP -10% (3000→2700), fire rate -10%
- [x] What's New aggiornato con v5.18–v5.23

---

## COMPLETATO — PWA Safe Area + Touch Polish (v5.23.0–v5.23.7)

- [x] Game container `position: fixed` — eliminates black band on iOS PWA standalone
- [x] JS heuristic safe area (`screen.height - innerHeight` top, 34px bottom) — replaces unreliable env()
- [x] Unified `resize()` — single code path, CSS vars `--safe-top/--safe-bottom`
- [x] Relative drag touch mode + sensitivity slider for all control modes
- [x] Offline score queue — failed submissions saved to localStorage, flushed on next start/gameover
- [x] Nickname SKIP button — first launch prompt skippable (once per session)
- [x] New record without nickname — triggers callsign prompt on game over

- [x] Game container `position: fixed` — eliminates black band on iOS PWA standalone
- [x] Unified `resize()` — single code path, `--safe-top`/`--safe-bottom` CSS vars replace `--pwa-*-inset`
- [x] Player respects `safeBottom` — ship stays above home indicator zone
- [x] Offline score queue — failed submissions saved to localStorage, flushed on next start/gameover
- [x] Nickname SKIP button — first launch prompt skippable (once per session)
- [x] New record without nickname — triggers callsign prompt on game over
- [x] 3 new i18n keys: `LB_QUEUED`, `NICK_SKIP`, `NICK_RECORD_TITLE` (EN/IT)

---

## COMPLETATO — Online Leaderboard + Platform Tags (v5.17.0–v5.17.2)

- [x] Cloudflare Workers + KV backend for global online leaderboard (top 100)
- [x] Callsign system (3-6 chars, alphanumeric + spaces)
- [x] HMAC-SHA256 score signing, rate limiting, score ceiling validation
- [x] Trophy button in intro, gameover rank + top 5 inline, tier badges (TOP 3/5/10)
- [x] Platform detection (Desktop/Mobile) with emoji icons in leaderboard
- [x] Full EN/IT localization for leaderboard and nickname UI

---

## COMPLETATO — Score Pulse + Cyber Destruction + Drop Tuning (v5.14.0–v5.16.1)

- [x] 5-tier HUD-reactive score pulse (MICRO/NORMAL/BIG/MASSIVE/LEGENDARY) with CSS animations
- [x] Rectangular rotating fragment particles with elemental tint on destruction
- [x] Coordinated SALVO system (row-by-row fire, safe corridor, progressive aim)
- [x] C1 rebalance: LV1 buff, boss HP -27%, drop pacing tuning
- [x] Guaranteed SPECIAL weapon drop from wave 4+ pre-boss

---

## COMPLETATO — Spectacular Elemental VFX (v5.13.0)

- [x] Napalm impact: expanding ring + 6 directional flame tongues + 5 gravity embers (replaces 8 plain circles)
- [x] Lightning bolt: jagged multi-segment lines with random branches, 3-layer glow, alpha fade
- [x] Laser beam impact: perpendicular spark burst on hit, white pierce flash on penetration
- [x] Contagion cascade VFX: visible connection lines + ripple rings between chained kills
- [x] Canvas effect system: `canvasEffects[]` in ParticleSystem (lightning, lines, ripples), capped at 20
- [x] Ship aura per element: fire embers, laser trail, electric mini-arcs — additive glow with stacking
- [x] Elemental pickup burst + ship pulse + colored screen flash per element
- [x] GODCHAIN apotheosis: symbol burst (emoji) + gold expanding rings + central glow
- [x] Full config in `Balance.ELEMENTAL_VFX` with kill-switches for every effect

---

## COMPLETATO — Progressive Tutorial (v5.12.0)

- [x] 3-step sequential tutorial (Mission/Controls/Shield) with slide animations
- [x] Progress dots, platform-aware text, `prefers-reduced-motion` support

---

## COMPLETATO — Ship Redesign: Crypto Viper (v5.9.0)

- [x] Chevron body 42px (6-vertex: tip/shoulder/wing/waist/rear/center) — was 30px triangle
- [x] Metallic tech palette (#2a2040 body, #4d3366 nose, #1a4455 fins, #1a1028 outline)
- [x] BTC cockpit as path-drawn strokes (3-layer glow/bright/core) — replaces text+circle
- [x] Dramatic weapon evolution: bodyHalfW 22→33, finExt 0→10, panel lines LV3+, diagonals LV4+
- [x] Deploy animation: finExt lerped, new hidden positions proportional to larger hull
- [x] Proportional hitboxes: BTC 42/8, ETH 50/9, SOL 24/5
- [x] Hex shield radius 52 (was 40), HYPER aura 35/58/53 (was 28/50/45)
- [x] Bullet dimensions 7x22 (was 5x20), spread ±8/±13 (was ±6/±10)
- [x] Afterimage 6-vertex chevron, side thrusters ±34/18, reactor flame Y=14
- [x] Tap zone 65px (was 55px), hitbox fallbacks updated (42/8)

---

## DA VERIFICARE — Conseguenze Ship Redesign

- [x] PWA icon: rigenerati in v5.29.0 con Premium Arsenal LV3
- [x] Splashscreen video: verificato OK
- [x] Hangar/intro screen: ship preview aggiornata
- [x] Touch responsiveness: tap-on-ship shield testato e funzionante

---

## COMPLETATO — Arcade "Rogue Protocol" (v5.8.0)

- [x] Arcade mode unlocked — fully playable distinct experience
- [x] 15 roguelike modifiers (5 OFFENSE / 5 DEFENSE / 5 WILD) with apply/stack/recalculate
- [x] Post-boss 3-card modifier choice, post-mini-boss 2-card choice (DOM modal)
- [x] Combo scoring system (3s timeout, graze extends, 0.05x/kill, cap 5.0x at 80 combo)
- [x] Canvas combo HUD with color gradient (white→yellow→orange→red) and pulse animation
- [x] Arcade pacing: 2s intermission, 0.5s horde transition, +15% enemies, -15% enemy HP
- [x] Mini-boss enhancement: lower thresholds (×0.65), 10s cooldown, max 3/wave, modifier rewards
- [x] Post-C3 infinite scaling: wave definitions cycle C1→C3, +20%/cycle difficulty, formation remix 40%
- [x] Modifier effects: fire rate, damage, pierce, critical hit, AoE, chain lightning, bullet time, nano shield, last stand, etc.
- [x] Arcade gameover stats: best combo, modifier picks
- [x] Comprehensive debug utility: `dbg.arcade()`, `dbg.arcadeMod()`, `dbg.arcadePick()`, presets
- [x] New files: `ArcadeModifiers.js`, `ModifierChoiceScreen.js`

---

## COMPLETATO — Premium Boss Redesign + Tap Shield (v5.7.0)

- [x] FED boss: Illuminati Pyramid — All-Seeing Eye with tracking pupil, orbiting $, CRT scanlines, P3 matrix rain
- [x] BCE boss: Star Fortress — 12 energy nodes, segmented golden ring, holographic €, P3 light-leak cracks
- [x] BOJ boss: Golden Torii — rising sun rays, ¥ glow, P2 yield curve EKG, P3 meltdown with heat haze
- [x] Boss HP bar: rounded rect, gradient fill, additive glow, phase threshold markers
- [x] Hexgrid energy shield: honeycomb pattern, radial wave, multi-layer glow, fade-out
- [x] Tap-on-ship shield activation (mobile) — replaces shield button
- [x] Pulsing diegetic ready indicator with rotating dash accents
- [x] Status text sizes +2-3px for better readability
- [x] `dbg.boss(type)` debug command for boss testing

---

## COMPLETATO — Digital Scanline Void (v5.6.0) — RIMOSSO in v6.5.4

- [x] ~~Neon violet scanline split replaces paper tear effect~~ — rimosso (interferiva con Dynamic Island)
- [x] ~~Glitch segments, CRT void scanlines, shimmer/breathing, opening/closing flash~~ — rimosso

---

## COMPLETATO — Cinematic Story Backgrounds (v5.5.0)

- [x] Per-chapter animated backgrounds (falling coins, Matrix rain, network nodes, lightning globe)
- [x] Kill-switch + legacy stars fallback

---

## COMPLETATO — Weapon Deployment Animation (v5.2.0)

- [x] Mechanical slide-out animation on weapon upgrade (ease-out-back, 0.35s)
- [x] LV1 nose barrel (always visible, pulsing glow)
- [x] Geometry cache `_geom` — shared by `_drawShipBody` + `_drawMuzzleFlash`
- [x] Procedural SFX: `weaponDeploy` (whoosh) + `weaponDeployLock` (clank)
- [x] Screen shake + haptic at lock-in (85% progress)
- [x] Deploy cancelled on death/reset

---

## COMPLETATO — Shooting VFX (v5.1.0)

- [x] Nuovo effetto sparo: canvas V-flash direzionale a diamante, 3 layer (inner→outer)
- [x] L'effetto scala con weapon level (+12%/livello, include HYPER boost)
- [x] Variante elementale: Fire (wider), Laser (taller), Electric (side sparks), GODCHAIN (fire tongues)

---

## COMPLETATO — Visual Polish + Elemental Tuning (v5.0.9)

- [x] Rimosso muzzle flash "bolla" (cerchio + ring burst + glow additivo)
- [x] Rimosso flash ring particle dal sistema muzzle spark
- [x] Evoluzione nave più evidente: pod più larghi, staffe montaggio, body scaling progressivo
- [x] Elemental tuning round 2: fire splash 1.2×, electric chain 0.8×, contagion decay 0.7
- [x] Kill rate contagion: 3.4% → 26.9% (target raggiunto)

---

## COMPLETATO — Balance Tuning v5.0.x

### Boss Damage Rebalance (v5.0.5)
- [x] Ricalcolare enemy HP vs DPS effettivo per la nuova curva di progressione
- [x] Boss damage scala con weapon level (`damageMult`) — era flat dal lancio
- [x] Fix missile AoE che non danneggiava i boss (`takeDamage` → `damage`)
- [x] Rimosso boss HP `CYCLE_MULT` (calibrato per vecchio sistema compound)
- [x] Aggiunto `BOSS.DMG_DIVISOR` tunabile da config
- [x] Playtest C1→C2: boss FED kill ~34s (target 35-40s), C2 raggiunto L10 — confermato

---

## COMPLETATO — v5.0 Clean Slate

- [x] Rimosso Sacrifice system (~400 righe di codice morto)
- [x] Rimosso script.js (prototipo v2.0, ~700 righe)
- [x] Rimosso legacy WEAPONS/SHIP_POWERUPS/modifiers
- [x] Rimosso ship selection UI (locked to BTC da v4.55)
- [x] Puliti console.log in WeatherController
- [x] Rimossa localStorage migration shim (v4.50)
- [x] Aggiornati docs: SYSTEM_REFERENCE, README, NOTES, roadmap

---

## COMPLETATO — Elemental Perk Drop System (v4.61)

- [x] Perk elementali droppano come power-up fisici (cristalli diamante)
- [x] Pity timer dedicato: KILLS_FOR_PERK = 50
- [x] PERK bypassa suppression (come UPGRADE)
- [x] HYPER meter: accumulo bloccato durante HYPER, riparte da zero
- [x] Rimosso HODL (incompatibile con mobile autofire)

---

## COMPLETATO — Elemental Perk System + Meter Rebalance (v4.60)

- [x] 3 perk elementali sequenziali: Fire (splash 30%), Laser (+25% speed, +1 pierce), Electric (chain 20%)
- [x] GODCHAIN trigger: 3 elementi raccolti → GODCHAIN 10s
- [x] GODCHAIN re-trigger su perk 4+
- [x] HYPER durata fissa 10s, meter decay raddoppiato (2→4/sec)

---

## COMPLETATO — Premium Purple Neon Unification (v4.53)

- [x] Palette neon violet (#bb44ff) per tutto il UI
- [x] ~130 edit su style.css + Constants + Player + StoryScreen

---

## COMPLETATO — Visual Overhaul: Dark Cyberpunk Neon (v4.52)

- [x] Palette neon: magenta, cyan, gold, green su deep space viola-nero

---

## COMPLETATO — Refactor Architetturale (v4.49)

- [x] 4 moduli estratti da main.js (FloatingTextManager, PerkIconManager, PerkManager, MiniBossManager)
- [x] Test suite: 103 assertions

---

## COMPLETATO — Weapon Evolution Redesign (v4.47)

- [x] Linear 5-level system, LASER rimosso, SHIELD/SPEED utility

---

## FUTURE IDEAS

### Gameplay
- ~~New enemy types (elite variants, shield enemies)~~ ✅ v6.0.0 (Elite Variants + Enemy Behaviors)
- ~~Boss attack pattern variety (per-phase unique patterns)~~ ✅ v5.0.4
- ~~Boss visual redesign (premium cyberpunk aesthetic)~~ ✅ v5.7.0
- ~~Combo system (chain kills for multiplier)~~ ✅ v5.8.0
- ~~Ship redesign (premium arsenal)~~ ✅ v5.28.0
- ~~Game completion cinematic~~ ✅ v5.21.0
- ~~Adaptive drop balancer~~ ✅ v5.19.0
- Daily challenge mode
- ~~Accelerometer ship control option (tilt-to-move alternative input)~~ ✅ v6.8.0 (TILT mode)
- ~~Unify two-wave deployment pause into single continuous enemy flow~~ ✅ v6.0.0 (Phase-Based Streaming)
- ~~Leaderboard (local, no server)~~ ✅ v5.17.0 (online with Cloudflare Workers)

### Technical
- ~~WebGL renderer option for low-end devices~~ ✅ done


### Content
- New bosses (IMF, World Bank)
- Story mode Chapter 4+
- Achievement system
- Ship upgrades (persistent progression)
