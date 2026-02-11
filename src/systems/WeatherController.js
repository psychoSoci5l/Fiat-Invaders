/**
 * WeatherController.js — Atmospheric weather events + ambient system
 *
 * v4.41: Tier 1 (sheet lightning, meteor shower, wind gust) + rain
 * v4.42: Ambient weather per level (snow, fog, drizzle, distant lightning)
 * Triggered by gameplay events via EventBus + level progression.
 * Designed for minimal draw-call overhead.
 */
(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    let gameWidth = 0, gameHeight = 0;

    // Active effect lifecycle trackers
    let activeEffects = [];   // { type, timer, duration, intensity }

    // Rain particles
    let raindrops = [];

    // Meteor burst particles
    let meteorBurst = [];

    // Wind state (multiplier read by SkyRenderer for cloud/particle speed)
    let windMultiplier = 1.0;
    let windTarget = 1.0;

    // Sheet lightning flash (independent from Bear Market bolts)
    let sheetFlash = 0;
    let sheetFlashTarget = 0;

    // --- Ambient state (v4.42) ---
    let snowParticles = [];
    let fogWisps = [];
    let drizzleDrops = [];
    let distantLightningTimer = 0;
    let distantLightningFlash = 0;
    let distantLightningColor = '#ffcc66';
    let currentLevel = 1;
    let currentBearMarket = false;
    let currentBossActive = false;
    let ambientEffects = [];  // active ambient effect names

    // Prevent duplicate EventBus subscriptions
    let _subscribed = false;

    // Shorthand
    const CU = () => G.ColorUtils;

    function init(w, h) {
        gameWidth = w;
        gameHeight = h;
        reset();

        if (!_subscribed && G.Events) {
            G.Events.on('weather:boss_spawn', function() { trigger('boss_spawn'); });
            G.Events.on('weather:boss_defeat', function() { trigger('boss_defeat'); });
            G.Events.on('weather:wave_clear', function() { trigger('wave_clear'); });
            G.Events.on('GODCHAIN_ACTIVATED', function() { trigger('godchain'); });
            _subscribed = true;
        }
    }

    function setDimensions(w, h) {
        gameWidth = w;
        gameHeight = h;
    }

    function reset() {
        activeEffects = [];
        raindrops = [];
        meteorBurst = [];
        windMultiplier = 1.0;
        windTarget = 1.0;
        sheetFlash = 0;
        sheetFlashTarget = 0;
        // Ambient reset
        snowParticles = [];
        fogWisps = [];
        drizzleDrops = [];
        distantLightningTimer = 0;
        distantLightningFlash = 0;
        currentLevel = 1;
        currentBearMarket = false;
        currentBossActive = false;
        ambientEffects = [];
    }

    /**
     * Trigger a weather event by name (looked up in Balance config)
     */
    function trigger(eventName) {
        var cfg = G.Balance && G.Balance.SKY && G.Balance.SKY.WEATHER;
        if (!cfg || !cfg.ENABLED) return;

        var mapping = cfg.TRIGGERS[eventName];
        if (!mapping) return;

        console.log('[WEATHER] Trigger: ' + eventName + ' (' + mapping.length + ' effects)');

        for (var i = 0; i < mapping.length; i++) {
            var fx = mapping[i];

            // No stacking same effect type
            var alreadyActive = false;
            for (var j = 0; j < activeEffects.length; j++) {
                if (activeEffects[j].type === fx.type) { alreadyActive = true; break; }
            }
            if (alreadyActive) {
                console.log('[WEATHER]   SKIP ' + fx.type + ' (already active)');
                continue;
            }

            activeEffects.push({
                type: fx.type,
                timer: 0,
                duration: fx.duration || 5,
                intensity: fx.intensity || 1.0
            });

            console.log('[WEATHER]   + ' + fx.type + ' (dur=' + (fx.duration || 5) + 's, int=' + (fx.intensity || 1.0) + ')');

            // Immediate side-effects per type
            if (fx.type === 'sheet_lightning') {
                sheetFlashTarget = fx.intensity || 0.3;
            }
            if (fx.type === 'wind_gust') {
                windTarget = fx.intensity || 2.5;
            }
            if (fx.type === 'meteor_shower') {
                _spawnMeteorBurst(fx.count || 8);
                console.log('[WEATHER]   spawned ' + (fx.count || 8) + ' meteors');
            }
            if (fx.type === 'rain') {
                _spawnRain(fx.count || 30);
                console.log('[WEATHER]   spawned ' + raindrops.length + ' raindrops');
            }
        }
    }

    // --- Internal spawners (event) ---

    function _spawnMeteorBurst(count) {
        for (var i = 0; i < count; i++) {
            var angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.25;
            var speed = 280 + Math.random() * 150;
            meteorBurst.push({
                x: Math.random() * gameWidth * 0.85,
                y: Math.random() * gameHeight * 0.2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                len: 30 + Math.random() * 25,
                a: 0.7 + Math.random() * 0.3,
                delay: Math.random() * 0.8
            });
        }
    }

    function _spawnRain(count) {
        var needed = count - raindrops.length;
        for (var i = 0; i < needed; i++) {
            raindrops.push({
                x: Math.random() * (gameWidth + 60) - 30,
                y: -Math.random() * gameHeight,
                spd: 400 + Math.random() * 200,
                len: 12 + Math.random() * 10,
                a: 0.15 + Math.random() * 0.2,
                w: 0.3 + Math.random() * 0.4   // wind factor
            });
        }
    }

    // --- Ambient spawners (v4.42) ---

    function _spawnSnow() {
        var amb = G.Balance && G.Balance.SKY && G.Balance.SKY.AMBIENT;
        if (!amb) return;
        var cfg = amb.SNOW;
        snowParticles = [];
        for (var i = 0; i < cfg.COUNT; i++) {
            snowParticles.push({
                x: Math.random() * gameWidth,
                y: Math.random() * gameHeight,
                spd: cfg.SPEED_MIN + Math.random() * (cfg.SPEED_MAX - cfg.SPEED_MIN),
                size: cfg.SIZE_MIN + Math.random() * (cfg.SIZE_MAX - cfg.SIZE_MIN),
                phase: Math.random() * Math.PI * 2  // wobble phase offset
            });
        }
    }

    function _spawnFog() {
        var amb = G.Balance && G.Balance.SKY && G.Balance.SKY.AMBIENT;
        if (!amb) return;
        var cfg = amb.FOG;
        fogWisps = [];
        for (var i = 0; i < cfg.COUNT; i++) {
            var w = cfg.WIDTH_MIN + Math.random() * (cfg.WIDTH_MAX - cfg.WIDTH_MIN);
            fogWisps.push({
                x: Math.random() * (gameWidth + w) - w * 0.5,
                y: gameHeight * 0.3 + Math.random() * gameHeight * 0.5,
                w: w,
                h: w * cfg.HEIGHT_RATIO,
                a: cfg.ALPHA_MIN + Math.random() * (cfg.ALPHA_MAX - cfg.ALPHA_MIN),
                dir: Math.random() > 0.5 ? 1 : -1
            });
        }
    }

    function _spawnDrizzle() {
        var amb = G.Balance && G.Balance.SKY && G.Balance.SKY.AMBIENT;
        if (!amb) return;
        var cfg = amb.DRIZZLE;
        drizzleDrops = [];
        for (var i = 0; i < cfg.COUNT; i++) {
            drizzleDrops.push({
                x: Math.random() * gameWidth,
                y: -Math.random() * gameHeight,
                spd: cfg.SPEED_MIN + Math.random() * (cfg.SPEED_MAX - cfg.SPEED_MIN),
                len: cfg.LENGTH_MIN + Math.random() * (cfg.LENGTH_MAX - cfg.LENGTH_MIN)
            });
        }
    }

    function _resetDistantLightningTimer() {
        var amb = G.Balance && G.Balance.SKY && G.Balance.SKY.AMBIENT;
        if (!amb) return;
        var cfg = amb.DISTANT_LIGHTNING;
        distantLightningTimer = cfg.INTERVAL_MIN + Math.random() * (cfg.INTERVAL_MAX - cfg.INTERVAL_MIN);
        distantLightningFlash = 0;
    }

    // --- setLevel (v4.42) ---

    function setLevel(level, isBearMarket, bossActive) {
        var amb = G.Balance && G.Balance.SKY && G.Balance.SKY.AMBIENT;
        if (!amb || !amb.ENABLED) return;

        currentLevel = level;
        currentBearMarket = isBearMarket;
        currentBossActive = bossActive;

        // Clear ambient particles
        snowParticles = [];
        fogWisps = [];
        drizzleDrops = [];

        // Build active ambient list from config
        var lvlKey = Math.min(level, 5);
        var effects = (amb.LEVELS[lvlKey] || []).slice();

        // Bear market adds its own effects
        if (isBearMarket && amb.BEAR_MARKET) {
            for (var i = 0; i < amb.BEAR_MARKET.length; i++) {
                if (effects.indexOf(amb.BEAR_MARKET[i]) === -1) {
                    effects.push(amb.BEAR_MARKET[i]);
                }
            }
        }

        // Boss active adds drizzle
        if (bossActive && amb.BOSS_ACTIVE) {
            for (var i = 0; i < amb.BOSS_ACTIVE.length; i++) {
                if (effects.indexOf(amb.BOSS_ACTIVE[i]) === -1) {
                    effects.push(amb.BOSS_ACTIVE[i]);
                }
            }
        }

        ambientEffects = effects;

        // Spawn particles for active effects
        if (effects.indexOf('snow') !== -1 && amb.SNOW.ENABLED) {
            _spawnSnow();
        }
        if (effects.indexOf('fog') !== -1 && amb.FOG.ENABLED) {
            _spawnFog();
        }
        if (effects.indexOf('drizzle') !== -1 && amb.DRIZZLE.ENABLED) {
            _spawnDrizzle();
        }
        if (effects.indexOf('distant_lightning') !== -1 && amb.DISTANT_LIGHTNING.ENABLED) {
            // Pick color based on level/bear
            if (isBearMarket) {
                distantLightningColor = amb.DISTANT_LIGHTNING.BEAR_COLOR;
            } else {
                distantLightningColor = amb.DISTANT_LIGHTNING.COLORS[lvlKey] || '#ffcc66';
            }
            _resetDistantLightningTimer();
        } else {
            distantLightningFlash = 0;
        }

        console.log('[WEATHER] setLevel(' + level + ', bear=' + isBearMarket + ', boss=' + bossActive + ') ambient=' + effects.join(','));
    }

    // --- triggerLevelTransition (v4.42) ---

    function triggerLevelTransition() {
        var amb = G.Balance && G.Balance.SKY && G.Balance.SKY.AMBIENT;
        if (!amb || !amb.ENABLED) return;

        var tr = amb.LEVEL_TRANSITION;
        // Wind burst
        windTarget = tr.WIND_INTENSITY;
        // Schedule wind reset
        activeEffects.push({
            type: 'wind_gust',
            timer: 0,
            duration: tr.WIND_DURATION,
            intensity: tr.WIND_INTENSITY
        });
        // Flash
        sheetFlashTarget = tr.FLASH_INTENSITY;

        console.log('[WEATHER] Level transition burst');
    }

    // --- Update ---

    function update(dt) {
        var cfg = G.Balance && G.Balance.SKY && G.Balance.SKY.WEATHER;
        if (!cfg || !cfg.ENABLED) return;

        // Lifecycle
        for (var i = activeEffects.length - 1; i >= 0; i--) {
            var fx = activeEffects[i];
            fx.timer += dt;
            if (fx.timer >= fx.duration) {
                if (fx.type === 'wind_gust') windTarget = 1.0;
                activeEffects.splice(i, 1);
            }
        }

        // Sheet lightning decay
        if (sheetFlashTarget > 0) {
            sheetFlash += (sheetFlashTarget - sheetFlash) * dt * 25;
            if (sheetFlash >= sheetFlashTarget * 0.9) {
                sheetFlash = sheetFlashTarget;
                sheetFlashTarget = 0;
            }
        } else if (sheetFlash > 0) {
            sheetFlash -= dt * 2.0;
            if (sheetFlash < 0) sheetFlash = 0;
        }

        // Wind interpolation
        windMultiplier += (windTarget - windMultiplier) * dt * 3;

        // Rain update
        var rainActive = false;
        for (var j = 0; j < activeEffects.length; j++) {
            if (activeEffects[j].type === 'rain') { rainActive = true; break; }
        }
        for (var i = raindrops.length - 1; i >= 0; i--) {
            var r = raindrops[i];
            r.y += r.spd * dt;
            r.x += r.spd * r.w * windMultiplier * dt * 0.3;
            if (r.y > gameHeight + 20) {
                if (rainActive) {
                    r.y = -r.len - Math.random() * 40;
                    r.x = Math.random() * (gameWidth + 60) - 30;
                } else {
                    raindrops.splice(i, 1);
                }
            }
        }

        // Meteor update
        for (var i = meteorBurst.length - 1; i >= 0; i--) {
            var m = meteorBurst[i];
            if (m.delay > 0) { m.delay -= dt; continue; }
            m.x += m.vx * dt;
            m.y += m.vy * dt;
            m.a -= dt * 0.4;
            if (m.a <= 0 || m.x > gameWidth + 60 || m.y > gameHeight + 60) {
                meteorBurst.splice(i, 1);
            }
        }

        // --- Ambient updates (v4.42) ---
        var amb = G.Balance && G.Balance.SKY && G.Balance.SKY.AMBIENT;
        if (!amb || !amb.ENABLED) return;

        // Snow: fall + wobble
        if (snowParticles.length > 0) {
            var sCfg = amb.SNOW;
            for (var i = 0; i < snowParticles.length; i++) {
                var s = snowParticles[i];
                s.y += s.spd * dt;
                s.phase += sCfg.WOBBLE_FREQ * Math.PI * 2 * dt;
                s.x += Math.sin(s.phase) * sCfg.WOBBLE_AMP * dt;
                // Wrap around
                if (s.y > gameHeight + 10) {
                    s.y = -10;
                    s.x = Math.random() * gameWidth;
                }
                if (s.x < -20) s.x = gameWidth + 10;
                if (s.x > gameWidth + 20) s.x = -10;
            }
        }

        // Fog: horizontal drift
        if (fogWisps.length > 0) {
            var fCfg = amb.FOG;
            for (var i = 0; i < fogWisps.length; i++) {
                var f = fogWisps[i];
                f.x += fCfg.DRIFT_SPEED * f.dir * dt;
                // Wrap
                if (f.dir > 0 && f.x > gameWidth + f.w) {
                    f.x = -f.w;
                } else if (f.dir < 0 && f.x < -f.w) {
                    f.x = gameWidth + f.w * 0.5;
                }
            }
        }

        // Drizzle: fall
        if (drizzleDrops.length > 0) {
            for (var i = 0; i < drizzleDrops.length; i++) {
                var d = drizzleDrops[i];
                d.y += d.spd * dt;
                d.x += windMultiplier * 5 * dt;
                if (d.y > gameHeight + 15) {
                    d.y = -d.len - Math.random() * 30;
                    d.x = Math.random() * gameWidth;
                }
            }
        }

        // Distant lightning: timer + flash decay
        if (ambientEffects.indexOf('distant_lightning') !== -1 && amb.DISTANT_LIGHTNING.ENABLED) {
            var dlCfg = amb.DISTANT_LIGHTNING;
            if (distantLightningFlash > 0) {
                distantLightningFlash -= dlCfg.DECAY_SPEED * dt;
                if (distantLightningFlash < 0) distantLightningFlash = 0;
            }
            distantLightningTimer -= dt;
            if (distantLightningTimer <= 0) {
                // Fire a distant flash
                distantLightningFlash = dlCfg.ALPHA_MIN + Math.random() * (dlCfg.ALPHA_MAX - dlCfg.ALPHA_MIN);
                // Reset timer
                distantLightningTimer = dlCfg.INTERVAL_MIN + Math.random() * (dlCfg.INTERVAL_MAX - dlCfg.INTERVAL_MIN);
            }
        }
    }

    // --- Draw ---

    function draw(ctx, context) {
        var cfg = G.Balance && G.Balance.SKY && G.Balance.SKY.WEATHER;
        if (!cfg || !cfg.ENABLED) return;

        var isBearMarket = context && context.isBearMarket;

        // Sheet lightning flash (event)
        if (sheetFlash > 0.01) {
            var slCfg = cfg.SHEET_LIGHTNING;
            ctx.globalAlpha = sheetFlash * (slCfg.ALPHA || 0.5);
            ctx.fillStyle = isBearMarket ? (slCfg.BEAR_COLOR || '#ff4444') : (slCfg.COLOR || '#b4a0ff');
            ctx.fillRect(0, 0, gameWidth, gameHeight);
            ctx.globalAlpha = 1;
        }

        // Rain (event)
        if (raindrops.length > 0) {
            var rCfg = cfg.RAIN;
            ctx.strokeStyle = isBearMarket ? (rCfg.BEAR_COLOR || '#882222') : (rCfg.COLOR || '#8899bb');
            ctx.lineWidth = rCfg.WIDTH || 1.5;
            for (var i = 0; i < raindrops.length; i++) {
                var r = raindrops[i];
                ctx.globalAlpha = r.a;
                ctx.beginPath();
                ctx.moveTo(r.x, r.y);
                ctx.lineTo(r.x + r.len * r.w * 0.3, r.y + r.len);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Meteor burst (event)
        if (meteorBurst.length > 0) {
            for (var i = 0; i < meteorBurst.length; i++) {
                var m = meteorBurst[i];
                if (m.delay > 0 || m.a <= 0) continue;
                var mag = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
                var nx = m.vx / mag;
                var ny = m.vy / mag;

                // Trail
                ctx.globalAlpha = m.a * 0.7;
                ctx.strokeStyle = '#ffffcc';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(m.x, m.y);
                ctx.lineTo(m.x - nx * m.len, m.y - ny * m.len);
                ctx.stroke();

                // Bright head
                ctx.globalAlpha = Math.min(1, m.a * 1.3);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // --- Ambient draws (v4.42) — depth order: lightning → fog → drizzle → snow ---
        var amb = G.Balance && G.Balance.SKY && G.Balance.SKY.AMBIENT;
        if (!amb || !amb.ENABLED) return;

        // Distant lightning flash (full-screen tint)
        if (distantLightningFlash > 0.005) {
            ctx.globalAlpha = distantLightningFlash;
            ctx.fillStyle = distantLightningColor;
            ctx.fillRect(0, 0, gameWidth, gameHeight);
            ctx.globalAlpha = 1;
        }

        // Fog wisps (translucent ellipses)
        if (fogWisps.length > 0) {
            var fogColor = isBearMarket ? (amb.FOG.BEAR_COLOR || '#aa4444') : (amb.FOG.COLOR || '#8888cc');
            for (var i = 0; i < fogWisps.length; i++) {
                var f = fogWisps[i];
                ctx.globalAlpha = f.a;
                ctx.fillStyle = fogColor;
                ctx.beginPath();
                ctx.ellipse(f.x + f.w * 0.5, f.y + f.h * 0.5, f.w * 0.5, f.h * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Drizzle (thin vertical strokes)
        if (drizzleDrops.length > 0) {
            var dCfg = amb.DRIZZLE;
            ctx.strokeStyle = isBearMarket ? (dCfg.BEAR_COLOR || '#664444') : (dCfg.COLOR || '#7788aa');
            ctx.lineWidth = dCfg.WIDTH || 1;
            ctx.globalAlpha = dCfg.ALPHA || 0.12;
            for (var i = 0; i < drizzleDrops.length; i++) {
                var d = drizzleDrops[i];
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x, d.y + d.len);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Snow (white arcs)
        if (snowParticles.length > 0) {
            var sCfg = amb.SNOW;
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = sCfg.ALPHA || 0.7;
            for (var i = 0; i < snowParticles.length; i++) {
                var s = snowParticles[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    function getWindMultiplier() {
        return windMultiplier;
    }

    /**
     * Console diagnostic: Game.WeatherController.status()
     */
    function status() {
        var lines = ['=== WEATHER STATUS ==='];
        lines.push('Active effects: ' + activeEffects.length);
        for (var i = 0; i < activeEffects.length; i++) {
            var fx = activeEffects[i];
            lines.push('  ' + fx.type + ': ' + fx.timer.toFixed(1) + '/' + fx.duration + 's (int=' + fx.intensity + ')');
        }
        lines.push('Raindrops: ' + raindrops.length);
        lines.push('Meteors: ' + meteorBurst.length);
        lines.push('Wind: ' + windMultiplier.toFixed(2) + 'x (target=' + windTarget.toFixed(2) + ')');
        lines.push('Sheet flash: ' + sheetFlash.toFixed(3));
        // Ambient
        lines.push('--- AMBIENT ---');
        lines.push('Level: ' + currentLevel + ' (bear=' + currentBearMarket + ', boss=' + currentBossActive + ')');
        lines.push('Ambient effects: ' + ambientEffects.join(', '));
        lines.push('Snow: ' + snowParticles.length);
        lines.push('Fog: ' + fogWisps.length);
        lines.push('Drizzle: ' + drizzleDrops.length);
        lines.push('Distant lightning: flash=' + distantLightningFlash.toFixed(3) + ', timer=' + distantLightningTimer.toFixed(1) + 's');
        // Draw call estimate
        var drawCalls = 0;
        if (sheetFlash > 0.01) drawCalls += 1;
        drawCalls += raindrops.length;
        drawCalls += meteorBurst.length * 2;
        if (distantLightningFlash > 0.005) drawCalls += 1;
        drawCalls += fogWisps.length;
        drawCalls += drizzleDrops.length;
        drawCalls += snowParticles.length;
        lines.push('Est. draw calls: ' + drawCalls);
        console.log(lines.join('\n'));
        return {
            effects: activeEffects.length, rain: raindrops.length, meteors: meteorBurst.length,
            wind: windMultiplier, drawCalls: drawCalls,
            snow: snowParticles.length, fog: fogWisps.length, drizzle: drizzleDrops.length,
            distantLightning: distantLightningFlash, ambientEffects: ambientEffects
        };
    }

    G.WeatherController = {
        init: init,
        setDimensions: setDimensions,
        reset: reset,
        trigger: trigger,
        update: update,
        draw: draw,
        getWindMultiplier: getWindMultiplier,
        setLevel: setLevel,
        triggerLevelTransition: triggerLevelTransition,
        status: status
    };
})();
