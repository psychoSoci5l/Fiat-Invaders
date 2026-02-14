/**
 * StoryBackgrounds.js - Cinematic animated backgrounds for Story chapters
 *
 * Each chapter has a unique atmospheric background:
 * - PROLOGUE: Falling gold coins dissolving into dust
 * - CHAPTER_1: Matrix-style hex rain with pulsing Bitcoin symbol
 * - CHAPTER_2: Network nodes with pulse connections (violet vs cyan)
 * - CHAPTER_3: Lightning network globe with zigzag bolts
 */
(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    let type = null;      // current background type
    let particles = [];   // generic particle array
    let extra = {};       // per-type extra state
    let w = 0, h = 0;     // canvas dimensions
    let elapsed = 0;       // total time
    let cfg = null;        // Balance config ref

    const TWO_PI = Math.PI * 2;
    const HEX_CHARS = '0123456789abcdef';

    // --- PROLOGUE: Falling Coins ---

    function initCoins() {
        const c = cfg.PROLOGUE;
        particles = [];
        for (let i = 0; i < c.COIN_COUNT; i++) {
            particles.push(makeCoin(Math.random() * h));
        }
        extra.sparks = [];
    }

    function makeCoin(startY) {
        const c = cfg.PROLOGUE;
        return {
            x: Math.random() * w,
            y: startY !== undefined ? startY : -20,
            size: c.COIN_SIZE_MIN + Math.random() * (c.COIN_SIZE_MAX - c.COIN_SIZE_MIN),
            speed: c.FALL_SPEED_MIN + Math.random() * (c.FALL_SPEED_MAX - c.FALL_SPEED_MIN),
            rotation: Math.random() * TWO_PI,
            rotSpeed: (0.5 + Math.random()) * (Math.random() < 0.5 ? 1 : -1),
            alpha: 1,
            grey: 0,      // 0=gold, 1=full grey
            dissolving: false
        };
    }

    function updateCoins(dt) {
        const c = cfg.PROLOGUE;
        const dissolveY = h * c.DISSOLVE_START;

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.y += p.speed * dt * 60;
            p.rotation += p.rotSpeed * dt;

            if (p.y > dissolveY && !p.dissolving) {
                p.dissolving = true;
            }

            if (p.dissolving) {
                p.grey = Math.min(1, p.grey + dt * c.GREY_SPEED);
                p.alpha -= dt * c.FADE_SPEED;
                p.size *= (1 - dt * c.SHRINK_SPEED);

                // Emit sparks
                if (Math.random() < c.SPARK_CHANCE * dt * 60 && extra.sparks.length < c.SPARK_MAX) {
                    extra.sparks.push({
                        x: p.x, y: p.y,
                        vx: (Math.random() - 0.5) * 40,
                        vy: -20 - Math.random() * 30,
                        life: 1,
                        size: 1 + Math.random() * 2
                    });
                }

                if (p.alpha <= 0) {
                    particles[i] = makeCoin(-20 - Math.random() * 40);
                }
            }

            if (!p.dissolving && p.y > h + 20) {
                particles[i] = makeCoin(-20 - Math.random() * 40);
            }
        }

        // Update sparks
        for (let i = extra.sparks.length - 1; i >= 0; i--) {
            const s = extra.sparks[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vy += 60 * dt; // gravity
            s.life -= dt * 2;
            if (s.life <= 0) extra.sparks.splice(i, 1);
        }
    }

    function drawCoins(ctx, fadeAlpha) {
        const CU = G.ColorUtils;

        // Draw coins
        for (const p of particles) {
            if (p.alpha <= 0) continue;
            const a = p.alpha * fadeAlpha;
            const squeeze = Math.abs(Math.cos(p.rotation));

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(squeeze, 1);

            // Color: gold → grey
            const r = Math.round(255 * (1 - p.grey * 0.6));
            const g = Math.round(170 * (1 - p.grey * 0.7));
            const b = Math.round(0 + p.grey * 80);

            ctx.fillStyle = CU ? CU.rgba(r, g, b, a * 0.7) : 'rgba(' + r + ',' + g + ',' + b + ',' + (a * 0.7) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, TWO_PI);
            ctx.fill();

            // Inner highlight
            ctx.fillStyle = CU ? CU.rgba(255, 220, 100, a * 0.3 * (1 - p.grey)) : 'rgba(255,220,100,' + (a * 0.3 * (1 - p.grey)) + ')';
            ctx.beginPath();
            ctx.arc(-p.size * 0.2, -p.size * 0.2, p.size * 0.4, 0, TWO_PI);
            ctx.fill();

            ctx.restore();
        }

        // Draw sparks
        for (const s of extra.sparks) {
            const a = s.life * fadeAlpha;
            ctx.fillStyle = CU ? CU.rgba(255, 200, 50, a) : 'rgba(255,200,50,' + a + ')';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, TWO_PI);
            ctx.fill();
        }
    }

    // --- CHAPTER 1: Matrix Rain ---

    function initMatrix() {
        const c = cfg.CHAPTER_1;
        particles = [];
        for (let i = 0; i < c.CHAR_COUNT; i++) {
            particles.push(makeMatrixChar(Math.random() * h));
        }
        extra.btcPulse = 0;
    }

    function makeMatrixChar(startY) {
        const c = cfg.CHAPTER_1;
        return {
            x: Math.random() * w,
            y: startY !== undefined ? startY : -20,
            char: HEX_CHARS[Math.floor(Math.random() * 16)],
            speed: c.FALL_SPEED_MIN + Math.random() * (c.FALL_SPEED_MAX - c.FALL_SPEED_MIN),
            alpha: 0.2 + Math.random() * 0.5,
            size: c.FONT_SIZE_MIN + Math.random() * (c.FONT_SIZE_MAX - c.FONT_SIZE_MIN),
            changeTimer: Math.random() * 2
        };
    }

    function updateMatrix(dt) {
        const c = cfg.CHAPTER_1;
        const cx = w / 2, cy = h / 2;

        extra.btcPulse += dt * c.BTC_PULSE_SPEED;

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.y += p.speed * dt * 60;

            // Attraction towards center
            const dx = cx - p.x;
            const dy = cy - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < c.ATTRACT_RADIUS && dist > 10) {
                const force = c.ATTRACT_FORCE * (1 - dist / c.ATTRACT_RADIUS);
                p.x += (dx / dist) * force * dt * 60;
                p.y += (dy / dist) * force * dt * 60 * 0.3;
            }

            // Random char change
            p.changeTimer -= dt;
            if (p.changeTimer <= 0) {
                p.char = HEX_CHARS[Math.floor(Math.random() * 16)];
                p.changeTimer = 0.5 + Math.random() * 1.5;
            }

            if (p.y > h + 20) {
                particles[i] = makeMatrixChar(-20);
            }
        }
    }

    function drawMatrix(ctx, fadeAlpha) {
        const CU = G.ColorUtils;
        const c = cfg.CHAPTER_1;

        // Draw characters
        for (const p of particles) {
            const a = p.alpha * fadeAlpha;
            ctx.font = Math.round(p.size) + 'px monospace';
            ctx.fillStyle = CU ? CU.rgba(57, 255, 20, a) : 'rgba(57,255,20,' + a + ')';
            ctx.fillText(p.char, p.x, p.y);
        }

        // Bitcoin symbol
        const cx = w / 2, cy = h / 2;
        const pulse = 0.5 + 0.5 * Math.sin(extra.btcPulse);
        const btcAlpha = c.BTC_BASE_ALPHA + pulse * c.BTC_PULSE_ALPHA;

        // Glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.font = 'bold ' + c.BTC_SIZE + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CU ? CU.rgba(255, 170, 0, btcAlpha * 0.3 * fadeAlpha) : 'rgba(255,170,0,' + (btcAlpha * 0.3 * fadeAlpha) + ')';
        ctx.fillText('\u20BF', cx, cy);
        // Core
        ctx.fillStyle = CU ? CU.rgba(255, 170, 0, btcAlpha * fadeAlpha) : 'rgba(255,170,0,' + (btcAlpha * fadeAlpha) + ')';
        ctx.fillText('\u20BF', cx, cy);
        ctx.restore();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // --- CHAPTER 2: Network Nodes ---

    function initNodes() {
        const c = cfg.CHAPTER_2;
        particles = [];
        for (let i = 0; i < c.NODE_COUNT; i++) {
            const isViolet = i < c.NODE_COUNT / 2;
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * c.DRIFT_SPEED,
                vy: (Math.random() - 0.5) * c.DRIFT_SPEED,
                radius: c.NODE_RADIUS_MIN + Math.random() * (c.NODE_RADIUS_MAX - c.NODE_RADIUS_MIN),
                color: isViolet ? 0 : 1, // 0=violet, 1=cyan
                pulse: Math.random() * TWO_PI
            });
        }
        extra.pulseTimer = 0;
        extra.pulseEdge = null; // {from, to, progress}
    }

    function updateNodes(dt) {
        const c = cfg.CHAPTER_2;

        for (const p of particles) {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.pulse += dt;

            // Bounce off edges
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
            p.x = Math.max(0, Math.min(w, p.x));
            p.y = Math.max(0, Math.min(h, p.y));
        }

        // Pulse along connections
        extra.pulseTimer += dt;
        if (extra.pulseTimer > c.PULSE_INTERVAL) {
            extra.pulseTimer = 0;
            // Pick random edge
            const a = Math.floor(Math.random() * particles.length);
            let b = Math.floor(Math.random() * particles.length);
            if (b === a) b = (a + 1) % particles.length;
            extra.pulseEdge = { from: a, to: b, progress: 0 };
        }
        if (extra.pulseEdge) {
            extra.pulseEdge.progress += dt / c.PULSE_TRAVEL_TIME;
            if (extra.pulseEdge.progress >= 1) extra.pulseEdge = null;
        }
    }

    function drawNodes(ctx, fadeAlpha) {
        const CU = G.ColorUtils;
        const c = cfg.CHAPTER_2;

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const a = particles[i], b = particles[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < c.CONNECT_DIST) {
                    const lineAlpha = (1 - dist / c.CONNECT_DIST) * c.LINE_ALPHA * fadeAlpha;
                    ctx.strokeStyle = CU ? CU.rgba(150, 150, 200, lineAlpha) : 'rgba(150,150,200,' + lineAlpha + ')';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        // Draw pulse
        if (extra.pulseEdge) {
            const pe = extra.pulseEdge;
            const a = particles[pe.from], b = particles[pe.to];
            if (a && b) {
                const px = a.x + (b.x - a.x) * pe.progress;
                const py = a.y + (b.y - a.y) * pe.progress;
                const pa = (1 - Math.abs(pe.progress - 0.5) * 2) * fadeAlpha;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = CU ? CU.rgba(200, 180, 255, pa * 0.8) : 'rgba(200,180,255,' + (pa * 0.8) + ')';
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, TWO_PI);
                ctx.fill();
                ctx.restore();
            }
        }

        // Draw nodes
        for (const p of particles) {
            const glow = 0.6 + 0.4 * Math.sin(p.pulse * 2);
            const a = glow * fadeAlpha;
            const r = p.color === 0 ? 187 : 0;
            const g = p.color === 0 ? 68 : 240;
            const b = p.color === 0 ? 255 : 255;

            // Glow
            ctx.fillStyle = CU ? CU.rgba(r, g, b, a * 0.15) : 'rgba(' + r + ',' + g + ',' + b + ',' + (a * 0.15) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 3, 0, TWO_PI);
            ctx.fill();

            // Core
            ctx.fillStyle = CU ? CU.rgba(r, g, b, a * 0.6) : 'rgba(' + r + ',' + g + ',' + b + ',' + (a * 0.6) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, TWO_PI);
            ctx.fill();
        }
    }

    // --- CHAPTER 3: Lightning Network ---

    function initLightning() {
        const c = cfg.CHAPTER_3;
        particles = [];
        const cx = w / 2, cy = h / 2;
        const radius = Math.min(w, h) * c.GLOBE_RADIUS;
        for (let i = 0; i < c.NODE_COUNT; i++) {
            const angle = (i / c.NODE_COUNT) * TWO_PI;
            particles.push({
                baseAngle: angle,
                orbitRadius: radius * (0.85 + Math.random() * 0.3),
                x: 0, y: 0,
                pulse: 0,
                hitTime: -10 // time since last lightning hit
            });
        }
        extra.rotation = 0;
        extra.bolts = [];     // {segments: [{x,y}], life, color}
        extra.boltTimer = 0;
        extra.ripples = [];   // {x, y, radius, life}
    }

    function updateLightning(dt) {
        const c = cfg.CHAPTER_3;
        const cx = w / 2, cy = h / 2;

        extra.rotation += c.ROTATE_SPEED * dt;

        // Update node positions
        for (const p of particles) {
            const angle = p.baseAngle + extra.rotation;
            p.x = cx + Math.cos(angle) * p.orbitRadius;
            p.y = cy + Math.sin(angle) * p.orbitRadius * 0.5; // squash for perspective
            p.hitTime += dt;
        }

        // Spawn bolts
        extra.boltTimer += dt;
        if (extra.boltTimer > c.BOLT_INTERVAL) {
            extra.boltTimer = 0;
            const a = Math.floor(Math.random() * particles.length);
            let b = Math.floor(Math.random() * particles.length);
            if (b === a) b = (a + 1) % particles.length;
            const from = particles[a], to = particles[b];

            // Generate zigzag segments
            const segs = [{x: from.x, y: from.y}];
            const steps = c.BOLT_SEGMENTS;
            for (let i = 1; i < steps; i++) {
                const t = i / steps;
                segs.push({
                    x: from.x + (to.x - from.x) * t + (Math.random() - 0.5) * c.BOLT_JITTER,
                    y: from.y + (to.y - from.y) * t + (Math.random() - 0.5) * c.BOLT_JITTER
                });
            }
            segs.push({x: to.x, y: to.y});

            // Alternate yellow/cyan
            const isCyan = Math.random() < 0.4;
            extra.bolts.push({
                segments: segs,
                life: 1,
                cyan: isCyan
            });

            // Mark hit nodes
            from.hitTime = 0;
            to.hitTime = 0;

            // Add ripple at target
            extra.ripples.push({ x: to.x, y: to.y, radius: 0, life: 1 });
        }

        // Update bolts
        for (let i = extra.bolts.length - 1; i >= 0; i--) {
            extra.bolts[i].life -= dt * c.BOLT_FADE_SPEED;
            if (extra.bolts[i].life <= 0) extra.bolts.splice(i, 1);
        }

        // Update ripples
        for (let i = extra.ripples.length - 1; i >= 0; i--) {
            const r = extra.ripples[i];
            r.radius += dt * c.RIPPLE_SPEED;
            r.life -= dt * c.RIPPLE_FADE;
            if (r.life <= 0) extra.ripples.splice(i, 1);
        }
    }

    function drawLightning(ctx, fadeAlpha) {
        const CU = G.ColorUtils;

        // Draw bolts
        for (const bolt of extra.bolts) {
            const a = bolt.life * fadeAlpha;
            const r = bolt.cyan ? 0 : 255;
            const g = bolt.cyan ? 240 : 230;
            const b = bolt.cyan ? 255 : 50;

            // Glow
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = CU ? CU.rgba(r, g, b, a * 0.4) : 'rgba(' + r + ',' + g + ',' + b + ',' + (a * 0.4) + ')';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
            for (let i = 1; i < bolt.segments.length; i++) {
                ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
            }
            ctx.stroke();

            // Core
            ctx.strokeStyle = CU ? CU.rgba(r, g, b, a * 0.9) : 'rgba(' + r + ',' + g + ',' + b + ',' + (a * 0.9) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
            for (let i = 1; i < bolt.segments.length; i++) {
                ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Draw ripples
        for (const r of extra.ripples) {
            const a = r.life * fadeAlpha * 0.5;
            ctx.strokeStyle = CU ? CU.rgba(0, 240, 255, a) : 'rgba(0,240,255,' + a + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, TWO_PI);
            ctx.stroke();
        }

        // Draw nodes
        for (const p of particles) {
            const hitGlow = Math.max(0, 1 - p.hitTime * 2); // bright when recently hit
            const baseAlpha = 0.4 + hitGlow * 0.6;
            const a = baseAlpha * fadeAlpha;

            // Amber glow
            ctx.fillStyle = CU ? CU.rgba(255, 170, 0, a * 0.2) : 'rgba(255,170,0,' + (a * 0.2) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8 + hitGlow * 4, 0, TWO_PI);
            ctx.fill();

            // Core
            ctx.fillStyle = CU ? CU.rgba(255, 170, 0, a * 0.8) : 'rgba(255,170,0,' + (a * 0.8) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, TWO_PI);
            ctx.fill();
        }
    }

    // --- Dispatch tables ---
    const INIT_FN = {
        FALLING_COINS: initCoins,
        MATRIX_RAIN: initMatrix,
        NETWORK_NODES: initNodes,
        LIGHTNING_NETWORK: initLightning
    };
    const UPDATE_FN = {
        FALLING_COINS: updateCoins,
        MATRIX_RAIN: updateMatrix,
        NETWORK_NODES: updateNodes,
        LIGHTNING_NETWORK: updateLightning
    };
    const DRAW_FN = {
        FALLING_COINS: drawCoins,
        MATRIX_RAIN: drawMatrix,
        NETWORK_NODES: drawNodes,
        LIGHTNING_NETWORK: drawLightning
    };

    // Story ID → background type mapping
    const STORY_MAP = {
        'PROLOGUE': 'FALLING_COINS',
        'CHAPTER_1': 'MATRIX_RAIN',
        'CHAPTER_2': 'NETWORK_NODES',
        'CHAPTER_3': 'LIGHTNING_NETWORK'
    };

    // --- Public API ---

    function init(storyId, canvasW, canvasH) {
        cfg = G.Balance && G.Balance.STORY_BACKGROUNDS;
        if (!cfg || !cfg.ENABLED) { type = null; return; }

        w = canvasW || 400;
        h = canvasH || 700;
        elapsed = 0;

        type = STORY_MAP[storyId] || null;
        if (!type || !cfg[storyId]) { type = null; return; }

        if (INIT_FN[type]) INIT_FN[type]();
    }

    function update(dt) {
        if (!type) return;
        elapsed += dt;
        if (UPDATE_FN[type]) UPDATE_FN[type](dt);
    }

    function draw(ctx, canvasW, canvasH, fadeAlpha) {
        if (!type) return;
        if (DRAW_FN[type]) DRAW_FN[type](ctx, fadeAlpha);
    }

    function resize(canvasW, canvasH) {
        w = canvasW;
        h = canvasH;
        if (type && INIT_FN[type]) {
            cfg = G.Balance && G.Balance.STORY_BACKGROUNDS;
            if (cfg && cfg.ENABLED) INIT_FN[type]();
        }
    }

    function isEnabled() {
        const c = G.Balance && G.Balance.STORY_BACKGROUNDS;
        return !!(c && c.ENABLED);
    }

    G.StoryBackgrounds = {
        init: init,
        update: update,
        draw: draw,
        resize: resize,
        isEnabled: isEnabled
    };

})();
