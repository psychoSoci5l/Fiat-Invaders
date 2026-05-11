<p align="center">
  <h1 align="center">FIAT vs CRYPTO</h1>
  <p align="center">
    <strong>Stop the FIAT invasion.</strong>
    <br />
    Un arcade shmup satirico — distruggi le banche centrali a colpi di crypto.
    <br />
    Giocabile gratis nel browser. Nessuna installazione. Nessuna dipendenza.
  </p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://fiat-invaders.pages.dev/"><img src="https://img.shields.io/badge/play-now-brightgreen?logo=cloudflare" alt="Play Now"></a>
  <a href="https://github.com/psychoSoci5l/Fiat-Invaders/stargazers"><img src="https://img.shields.io/github/stars/psychoSoci5l/Fiat-Invaders?style=social" alt="Stars"></a>
</p>

---

<p align="center">
  <h3 align="center">
    <a href="https://fiat-invaders.pages.dev/">🎮 GIOCA SUBITO — fiat-invaders.pages.dev</a>
  </h3>
</p>

---

## Cos'è FIAT vs CRYPTO

Uno **shoot-'em-up a scorrimento verticale** in stile Gradius che mette in satira lo scontro tra criptovalute e sistema monetario tradizionale. Scegli la tua nave (BTC, ETH o SOL), fatti strada tra ondate di nemici a tema fiat, potenzia le tue armi e affronta i boss delle banche centrali in epiche battaglie a 3 fasi.

Ogni ciclo è un viaggio dal sistema finanziario terrestre fino allo spazio profondo, tra volatilità di mercato, iperinflazione e collassi sistemici. Il tutto accompagnato da una colonna sonora synthwave generata proceduralmente.

---

## 🎮 Modalità di gioco

| Modalità | Descrizione |
|----------|-------------|
| **📖 Story Mode** | 3 livelli, 3 boss finali (FED, BCE, BOJ), narrativa a scorrimento. Segui l'ascesa di Bitcoin contro il sistema fiat globale. |
| **🃏 Arcade** | Roguelike a run infinite con **16 protocolli modificatori** (JACKPOT, CHAIN_LIGHTNING, DOUBLE_EDGED, ecc.). Ogni scelta cambia le regole del gioco. |
| **📅 Daily Challenge** | Un seed giornaliero uguale per tutti. Un solo tentativo. La classifica si resetta a mezzanotte UTC. |

---

## 🚀 Caratteristiche

### Meccaniche di combattimento

- **Evoluzione armi permanente** — 3 livelli di potenziamento conservati tra i livelli. Raggiungi LV3 per sbloccare il vero potenziale offensivo.
- **HYPER mode** — Uccisioni ravvicinate caricano il **DIP meter**. Quando è pieno, scatena una salva devastante di proiettili potenziati.
- **GODCHAIN** — Colleziona 3 perk elementali in sequenza (🔥 Fuoco → ⚡ Laser → 💎 Elettrico) per attivare la modalità definitiva: danno aumentato, effetti visivi catartici, audio trasformativo.
- **Graze System** — Schiva i proiettili nemici di misura per accumulare un moltiplicatore punteggio fino a **2.5x**. Rischia per massimizzare lo score.
- **Proximity Kill Meter** — Sconfiggi nemici a distanza ravvicinata per riempire la barra e guadagnare bonus.
- **Scudo tattico** — Attivazione manuale con cooldown di 10 secondi. La tua unica difesa attiva.
- **Hitbox ridotta** — Solo il nucleo centrale della nave subisce danni. Il resto è invulnerabile (stile bullet hell).

### Nemici e Boss

- **3 fazioni nemiche** — Dollaro (USA), Euro (EU), Yen (Asia), ognuna con design e pattern d'attacco visivamente distinti.
- **Agents, Elites, Semi-Agents** — 3 tier di nemici con varianti (Armored, Evader, Reflector) e comportamenti (Flanker, Bomber, Healer, Charger).
- **Boss a 3 fasi** — Federal Reserve, Banca Centrale Europea e Bank of Japan. Ogni fase ha pattern d'attacco unici e transizioni spettacolari.
- **BOJ Intervention System** — La Bank of Japan può intervenire durante le battaglie contro altri boss, iniettando caos negli scontri.
- **Formazioni sinfoniche** — I pattern di attacco nemici sono sincronizzati con la musica tramite `HarmonicConductor`.

### Impianto visivo e audio

- **32 layer di rendering** — Background parallattico, entità, effetti particellari, glow, HUD, debug.
- **Phase Sky System** — Il cielo evolve durante la partita: Terra → Atmosfera → Spazio Profondo, con crossfade fluidi e pianeti parallattici.
- **Effetti climatici** — Pioggia, nebbia, tempeste che reagiscono alla fase di gioco e alla difficoltà.
- **Colonna sonora synthwave** — Audio interamente sintetizzato via Web Audio API. Nessun file MP3. Il `HarmonicConductor` sincronizza gli attacchi nemici con la musica.
- **Scanlines + vignette CRT** — Estetica retro-arcade con effetti di curvatura e distorsione.

### Qualità della vita

- **PWA installabile** — Aggiungi alla home screen del telefono. Funziona offline grazie al Service Worker che cachea tutti gli asset.
- **Mobile-first** — Controlli touch nativi (swipe, tilt, joystick virtuale) + gamepad + tastiera.
- **Bear Market Mode** — Modalità difficile con nemici potenziati e **punteggio doppio**.
- **Leaderboard online** — Backend Cloudflare Worker + KV. Protezione anti-spam con HMAC, nonce replay, rate limiting.
- **Debug overlay** — Report completo di performance, errori, sessione, device. Invia con un tap per bug report.
- **Tutorial interattivo** — Primo avvio guidato con lesson modals che spiegano ogni meccanica al primo incontro.
- **Localizzazione IT/EN** — Interfaccia e tutorial in italiano e inglese, switchabile al volo da Settings.

---

## 🛠️ Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| **Linguaggio** | Vanilla JavaScript ES6+ (nessun framework, nessuna build step) |
| **Rendering** | Canvas 2D API — 32-layer `DrawPipeline`, additive blending, glow pass, offscreen canvas |
| **Audio** | Web Audio API — sintesi procedurale di tutti i suoni e musica |
| **Frontend** | HTML5 + CSS3 — single-page, scanlines CRT, layout responsive |
| **PWA** | Service Worker (cache-first + network-first), Web App Manifest, icone adattive |
| **Backend** | Cloudflare Worker + KV — API leaderboard con HMAC, rate limiting, replay protection |
| **Hosting** | Cloudflare Pages — deploy continuo da `main`, CDN globale, SSL automatico |
| **Tooling** | Claude Code Game Studios — 49 agenti AI specializzati per game design, architettura, QA |

---

## 🎯 Design

Il gioco segue 7 pilastri di design documentati in [`design/gdd/game-pillars.md`](design/gdd/game-pillars.md):

1. Satira economica accessibile
2. Profondità meccanica progressiva
3. Accessibilità universale (mobile + desktop + offline)
4. Rigiocabilità infinita
5. Feedback catartico
6. Estetica synthwave/cyberpunk
7. Performance senza compromessi

14 Architecture Decision Records in [`docs/architecture/`](docs/architecture/), 7 GDD completi in [`design/gdd/`](design/gdd/), test suite con 790+ unit test.

---

## 🏗️ Struttura del progetto

```
├── src/
│   ├── core/          EventBus, GameStateMachine, AudioSystem, InputSystem
│   ├── entities/      Player, Enemy, Boss, Bullet, PowerUp
│   ├── managers/      WaveManager, CampaignState, LeaderboardClient
│   ├── systems/       CollisionSystem, ParticleSystem, DrawPipeline, SkyRenderer
│   ├── ui/            IntroScreen, UIManager, TutorialManager, GameCompletion
│   ├── story/         StoryManager, DialogueData, StoryScreen
│   ├── v8/            LevelScript — V8 scroller Gradius-style
│   ├── utils/         Constants, DebugSystem, ColorUtils, RNG
│   ├── config/        BalanceConfig — single source of truth (~3700 linee)
│   └── audio/         MusicData — generazione musicale procedurale
├── design/            GDD, art bible, UX specs, difficulty curve
├── docs/              ADR, architettura, traceability, control manifest
├── tests/             Suite di test con runner HTML
├── workers/           Cloudflare Worker per leaderboard
└── index.html         Entry point
```

---

## 🤔 Perché l'ho costruito

Volevo dimostrare che si può costruire un gioco arcade **completo, bilanciato e divertente** con tool moderni ma senza engine commerciali. Niente Unity, niente Godot, niente Phaser — solo JavaScript vanilla, Canvas 2D e Web Audio API.

L'ho sviluppato con **Claude Code** e un framework di 49 agenti AI specializzati per game development (`Claude Code Game Studios`), che mi hanno aiutato a mantenere architettura, design e qualità a livello professionale pur lavorando da solo.

Il tema crypto-vs-fiat è una scusa perfetta per un gioco satirico: volatilità come meccanica di difficoltà, banche centrali come boss, iperinflazione come bullet pattern. Divertente e attuale.

---

## 📄 Licenza

MIT — vedi [LICENSE](LICENSE) per i dettagli.

Sviluppato da [psychoSocial](https://www.psychosoci5l.com).

---

<p align="center">
  <a href="https://fiat-invaders.pages.dev/">🎮 GIOCA ORA</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/psychoSoci5l/Fiat-Invaders/issues">🐛 Segnala un bug</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/psychoSoci5l/Fiat-Invaders">⭐ Metti una stella</a>
</p>
