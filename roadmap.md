# Roadmap: FIAT vs CRYPTO

> **Versione attuale**: v5.26.0 (2026-02-17)
> **Focus**: Mobile-first PWA. Desktop fully supported.

---

## PROSSIMA SESSIONE — v5.27 Polish & Feel

### 1. Game Start Countdown (Wave 1)
- Dopo il tutorial, il player viene schierato in campo senza nessun messaggio
- Aggiungere countdown fullscreen rapido **3 → 2 → 1 → GO!** prima della Wave 1
- Al termine del countdown, mostrare messaggio iniziale nel Combat HUD

### 2. Boss HP Bar Only — Clean Boss Display
- Rimuovere il nome del boss dalla visualizzazione durante il fight
- Rimuovere qualsiasi altra info testuale sotto/sopra la barra HP
- Solo boss visivo + barra energia sotto, nient'altro. Su tutti e 3 i boss (FED/BCE/BOJ)

### 3. Elemental Cannon Tint
- Quando il player raccoglie un perk elementale, la punta del cannone (nose/barrel attivo) cambia colore per riflettere l'elemento attivo
- Fire → arancio/rosso, Laser → cyan, Electric → viola
- Il colore segue il perk attualmente in uso (ultimo raccolto o GODCHAIN)

### 4. Ship Silhouette Redesign — Ali Aerodinamiche
- Le ali della Crypto Viper sono troppo "tozze": piccole, parallele, non slanciate
- Ridisegnare le ali con punte rivolte all'indietro (swept-back), non laterali
- Mantenere il body chevron e la palette metallic-tech attuali
- Risultato: silhouette più aerodinamica e aggressiva

### 5. Tutorial Text Rewrite — Tono Videogioco
- Il testo attuale è troppo "istruzioni IKEA" — freddo e tecnico
- Riscrivere con tono da videogioco: più coinvolgente, breve, motivante
- L'estetica visiva (card, step, animazioni) resta invariata
- Leggermente più grande come font/padding per leggibilità

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

## DA VERIFICARE — Conseguenze Ship Redesign (v5.9.x)

- [x] PWA icon: rigenerati in v5.10.1 con Crypto Viper chevron
- [ ] Splashscreen video: `splashscreen.mp4` potrebbe mostrare vecchia silhouette — verificare
- [x] Hangar/intro screen: ship preview aggiornata in v5.10.0 con palette per-ship
- [ ] Player manual screenshots: aggiornare se contengono immagini della vecchia nave
- [x] Touch responsiveness: tap-on-ship shield testato e funzionante (v5.7.0+)
- [ ] Visual balance: verificare che la nave 42px non sia troppo grande rispetto ai nemici 58px

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

## COMPLETATO — Digital Scanline Void (v5.6.0)

- [x] Neon violet scanline split replaces paper tear effect
- [x] Glitch segments, CRT void scanlines, shimmer/breathing, opening/closing flash

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
- New enemy types (elite variants, shield enemies)
- ~~Boss attack pattern variety (per-phase unique patterns)~~ ✅ v5.0.4
- ~~Boss visual redesign (premium cyberpunk aesthetic)~~ ✅ v5.7.0
- ~~Combo system (chain kills for multiplier)~~ ✅ v5.8.0
- Daily challenge mode
- ~~Leaderboard (local, no server)~~ ✅ v5.17.0 (online with Cloudflare Workers)

### Technical
- WebGL renderer option for low-end devices
- Asset preloading with progress bar

### Content
- New bosses (IMF, World Bank)
- Story mode Chapter 4+
- Achievement system
- Ship upgrades (persistent progression)
