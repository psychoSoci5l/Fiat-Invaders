# Piano Ottimizzazione Performance

## Stato: DA IMPLEMENTARE

---

## Priorità 1: Sistema Particelle (Impatto: ALTO)

### Problema
- Nessun limite sul numero di particelle
- `createExplosion()` aggiunge 15-30 particelle per esplosione
- Con molti nemici morti = centinaia di particelle attive
- Drawing complesso: ink splatter, rings, rotazioni, save/restore

### Soluzione
```javascript
// 1. Cap massimo globale
const MAX_PARTICLES = 80;
if (particles.length >= MAX_PARTICLES) return;

// 2. Pool per particelle (come bullets)
const ParticlePool = {
    pool: [],
    acquire() { return this.pool.pop() || {}; },
    release(p) { this.pool.push(p); }
};

// 3. Semplificare forme (rimuovere inkShape complexity)
// Solo cerchi con outline invece di star burst e splat shapes
```

### File da modificare
- `src/main.js`: `createExplosion()`, `drawParticles()`, `updateParticles()`

---

## Priorità 2: Offscreen Culling (Impatto: MEDIO)

### Problema
Tutto viene disegnato anche se fuori viewport.

### Soluzione
```javascript
// In draw loops
if (p.x < -50 || p.x > gameWidth + 50 || p.y < -50 || p.y > gameHeight + 50) continue;
```

### File da modificare
- `src/main.js`: loop di draw per bullets, enemyBullets, particles

---

## Priorità 3: Enemy Draw Optimization (Impatto: MEDIO)

### Problema
- `ctx.save()/restore()` per ogni nemico
- Rotazioni condizionali costose
- Forme complesse (coin notches, bill decorations, bar 3D)
- Telegraph indicator separato

### Soluzione
```javascript
// 1. Usare Path2D cachati per forme statiche
const ENEMY_PATHS = {
    coin: new Path2D(),
    bill: new Path2D(),
    bar: new Path2D(),
    card: new Path2D()
};
// Pre-populate at init

// 2. Batch save/restore
ctx.save();
enemies.forEach(e => e.drawFast(ctx)); // No internal save/restore
ctx.restore();

// 3. Skip rotazioni se non SINE_WAVE pattern
if (wavePattern !== 'SINE_WAVE') this.rotation = 0;
```

### File da modificare
- `src/entities/Enemy.js`: `draw()`, aggiungere `initPaths()`

---

## Priorità 4: Sky/Clouds Optimization (Impatto: BASSO)

### Problema
- 20 nuvole aggiornate ogni frame
- 3 layer colline con calcoli

### Soluzione
```javascript
// 1. Ridurre nuvole a 12
const CLOUD_COUNT = 12;

// 2. Aggiornare colline ogni 2 frame
if (frameCount % 2 === 0) updateHills(dt * 2);

// 3. Pre-calcolare gradienti/colori sky (non cambiano spesso)
let cachedSkyLevel = -1;
let cachedSkyBands = null;
if (level !== cachedSkyLevel) {
    cachedSkyBands = computeSkyBands(level);
    cachedSkyLevel = level;
}
```

### File da modificare
- `src/main.js`: `initSky()`, `updateSky()`, `drawSky()`

---

## Priorità 5: Micro-ottimizzazioni (Impatto: BASSO)

### Cambio da forEach a for classico
```javascript
// Prima
enemies.forEach(e => e.draw(ctx));

// Dopo
for (let i = 0; i < enemies.length; i++) {
    enemies[i].draw(ctx);
}
```

### Evitare allocazioni in hot path
```javascript
// Prima (alloca nuovo oggetto ogni frame)
const dx = target.x - this.x;

// Dopo (riusa variabili)
let _dx = 0, _dy = 0; // module-level
_dx = target.x - this.x;
```

### File da modificare
- `src/main.js`: tutti i loop di update/draw
- `src/entities/*.js`: metodi update/draw

---

## Ordine di Implementazione Consigliato

1. **Particelle** - Maggior impatto, fix veloce
2. **Culling** - Facile, beneficio immediato
3. **Enemy draw** - Richiede refactoring
4. **Sky** - Bassa priorità
5. **Micro-opt** - Da fare insieme agli altri

---

## Metriche da Monitorare

```javascript
// Aggiungere debug overlay (F3 toggle)
let debugMode = false;
function drawDebug(ctx) {
    if (!debugMode) return;
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    ctx.fillText(`Particles: ${particles.length}`, 10, gameHeight - 60);
    ctx.fillText(`Bullets: ${bullets.length}/${enemyBullets.length}`, 10, gameHeight - 45);
    ctx.fillText(`Enemies: ${enemies.length}`, 10, gameHeight - 30);
    ctx.fillText(`FPS: ${Math.round(1/dt)}`, 10, gameHeight - 15);
}
```

---

## Note
- Testare su iPhone reale dopo ogni modifica
- Usare Chrome DevTools Performance tab per profiling
- Target: 60 FPS stabile su iPhone 14 Pro Max
