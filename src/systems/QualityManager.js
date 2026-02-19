/**
 * QualityManager.js — Adaptive Quality Tiers (v6.3)
 *
 * Monitors FPS and automatically adjusts visual quality by toggling
 * existing Balance kill-switches. Four tiers: ULTRA / HIGH / MEDIUM / LOW.
 * Hysteresis prevents tier flicker (different thresholds for drop/recover).
 * ULTRA promotion requires higher FPS (58+) sustained for longer (8s).
 *
 * localStorage key: fiat_quality_tier ('AUTO' | 'ULTRA' | 'HIGH' | 'MEDIUM' | 'LOW')
 */
(function () {
    'use strict';
    const G = window.Game;
    if (!G) return;

    const STORAGE_KEY = 'fiat_quality_tier';
    const TIER_ORDER = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW'];

    // Saved default values (captured at init before any override)
    let _defaults = null;

    // State
    let _tier = 'HIGH';
    let _auto = true;
    let _fpsSamples = [];       // circular buffer
    let _sampleTimer = 0;       // accumulates dt for 1-sec ticks
    let _frameCount = 0;
    let _lastTimestamp = 0;
    let _playSeconds = 0;       // time spent in PLAY state
    let _recoverTimer = 0;      // seconds above RECOVER_THRESHOLD
    let _initialized = false;

    // ── Snapshot defaults ────────────────────────────────────────
    function _captureDefaults() {
        const B = G.Balance;
        const vfx = B.VFX;
        _defaults = {
            // Kill-switches (boolean)
            GLOW_ENABLED:          B.GLOW?.ENABLED ?? true,
            ENEMY_GLOW:            B.GLOW?.ENEMY?.ENABLED ?? true,
            DEATH_FLASH:           B.GLOW?.DEATH_FLASH?.ENABLED ?? true,
            PARTICLES_MAX:         G.ParticleSystem?.MAX_PARTICLES ?? 180,
            CANVAS_EFFECTS_MAX:    20,
            SKY_CLOUDS:            B.SKY?.CLOUDS?.ENABLED ?? true,
            SKY_PARTICLES_COUNT:   B.SKY?.PARTICLES?.COUNT ?? 20,
            SKY_WEATHER:           B.SKY?.WEATHER?.ENABLED ?? true,
            SKY_HILLS_REDRAW:      B.SKY?.OFFSCREEN?.HILLS_REDRAW_INTERVAL ?? 2,
            HORIZON_GLOW:          B.SKY?.HORIZON_GLOW?.ENABLED ?? true,
            MUZZLE_FLASH:          vfx?.MUZZLE_FLASH?.ENABLED ?? true,
            WEAPON_DEPLOY:         vfx?.WEAPON_DEPLOY?.ENABLED ?? true,
            // Ship flight — individual flags
            BANKING_TILT:          vfx?.SHIP_FLIGHT?.BANKING?.ENABLED ?? true,
            HOVER_BOB:             vfx?.SHIP_FLIGHT?.HOVER_BOB?.ENABLED ?? true,
            ASYMMETRIC_THRUST:     vfx?.SHIP_FLIGHT?.THRUST?.ENABLED ?? true,
            WING_VAPOR_TRAILS:     vfx?.SHIP_FLIGHT?.VAPOR_TRAILS?.ENABLED ?? true,
            SQUASH_STRETCH:        vfx?.SHIP_FLIGHT?.SQUASH_STRETCH?.ENABLED ?? true,

            // Numeric values (for ULTRA boost + restore)
            GLOW_BULLET_RADIUS:    B.GLOW?.BULLET?.RADIUS ?? 24,
            GLOW_BULLET_ALPHA:     B.GLOW?.BULLET?.ALPHA ?? 0.6,
            GLOW_ENGINE_RADIUS:    B.GLOW?.ENGINE?.RADIUS ?? 24,
            GLOW_ENGINE_ALPHA:     B.GLOW?.ENGINE?.ALPHA ?? 0.55,
            GLOW_MUZZLE_RADIUS_MULT: B.GLOW?.MUZZLE?.RADIUS_MULT ?? 1.8,
            GLOW_MUZZLE_ALPHA:     B.GLOW?.MUZZLE?.ALPHA ?? 0.6,
            GLOW_POWERUP_RADIUS_MULT: B.GLOW?.POWERUP?.RADIUS_MULT ?? 1.5,
            GLOW_POWERUP_ALPHA:    B.GLOW?.POWERUP?.ALPHA ?? 0.5,
            GLOW_RING_ALPHA_MULT:  B.GLOW?.PARTICLES?.RING_ALPHA_MULT ?? 1.3,
            GLOW_DEATH_RADIUS:     B.GLOW?.DEATH_FLASH?.RADIUS ?? 40,
            GLOW_DEATH_DURATION:   B.GLOW?.DEATH_FLASH?.DURATION ?? 0.4,
            GLOW_ENEMY_RADIUS:     B.GLOW?.ENEMY?.RADIUS ?? 20,
            GLOW_ENEMY_ALPHA:      B.GLOW?.ENEMY?.ALPHA ?? 0.35,
            // Sky numeric
            SKY_STARS_COUNT:       B.SKY?.STARS?.COUNT ?? 90,
            SKY_SHOOTING_MAX:      B.SKY?.STARS?.SHOOTING_STARS?.MAX_ACTIVE ?? 2,
            SKY_CLOUDS_COUNT:      B.SKY?.CLOUDS?.COUNT ?? 12,
            // Explosions
            EXPLOSION_WEAK_P:      vfx?.EXPLOSION_WEAK?.particles ?? 6,
            EXPLOSION_WEAK_D:      vfx?.EXPLOSION_WEAK?.debrisCount ?? 2,
            EXPLOSION_MEDIUM_P:    vfx?.EXPLOSION_MEDIUM?.particles ?? 10,
            EXPLOSION_MEDIUM_D:    vfx?.EXPLOSION_MEDIUM?.debrisCount ?? 4,
            EXPLOSION_STRONG_P:    vfx?.EXPLOSION_STRONG?.particles ?? 14,
            EXPLOSION_STRONG_D:    vfx?.EXPLOSION_STRONG?.debrisCount ?? 6,
            // Muzzle sparks
            MUZZLE_SPARK_BASE:     vfx?.MUZZLE_SPARK_BASE ?? 2,
            MUZZLE_SPARK_PER_LEVEL: vfx?.MUZZLE_SPARK_PER_LEVEL ?? 1,
            // HYPER aura
            HYPER_SPEED_LINES_COUNT: vfx?.HYPER_AURA?.SPEED_LINES?.COUNT ?? 8,
            HYPER_SPEED_LINES_ALPHA: vfx?.HYPER_AURA?.SPEED_LINES?.ALPHA ?? 0.7,
            HYPER_BODY_GLOW_RADIUS:  vfx?.HYPER_AURA?.BODY_GLOW?.RADIUS ?? 35,
            HYPER_BODY_GLOW_ALPHA:   vfx?.HYPER_AURA?.BODY_GLOW?.ALPHA ?? 0.25,
            // Vapor trails
            VAPOR_MAX_PER_FRAME:   vfx?.SHIP_FLIGHT?.VAPOR_TRAILS?.MAX_PER_FRAME ?? 2,
            // Energy skin
            ENERGY_SKIN_OUTER_STROKE: vfx?.ENERGY_SKIN?.OUTER_STROKE ?? 8,
            ENERGY_SKIN_SPARK_COUNT:  vfx?.ENERGY_SKIN?.SPARK_COUNT ?? 3,
        };
    }

    // ── Restore all defaults ───────────────────────────────────────
    function _restoreDefaults() {
        if (!_defaults) return;
        const B = G.Balance;
        const vfx = B.VFX;

        // Boolean kill-switches
        if (B.GLOW) B.GLOW.ENABLED = _defaults.GLOW_ENABLED;
        if (B.GLOW?.ENEMY) B.GLOW.ENEMY.ENABLED = _defaults.ENEMY_GLOW;
        if (B.GLOW?.DEATH_FLASH) B.GLOW.DEATH_FLASH.ENABLED = _defaults.DEATH_FLASH;
        if (G.ParticleSystem?.setMaxParticles) G.ParticleSystem.setMaxParticles(_defaults.PARTICLES_MAX);
        if (G.ParticleSystem?.setMaxCanvasEffects) G.ParticleSystem.setMaxCanvasEffects(_defaults.CANVAS_EFFECTS_MAX);
        if (B.SKY?.CLOUDS) B.SKY.CLOUDS.ENABLED = _defaults.SKY_CLOUDS;
        if (B.SKY?.PARTICLES) B.SKY.PARTICLES.COUNT = _defaults.SKY_PARTICLES_COUNT;
        if (B.SKY?.WEATHER) B.SKY.WEATHER.ENABLED = _defaults.SKY_WEATHER;
        if (B.SKY?.OFFSCREEN) B.SKY.OFFSCREEN.HILLS_REDRAW_INTERVAL = _defaults.SKY_HILLS_REDRAW;
        if (B.SKY?.HORIZON_GLOW) B.SKY.HORIZON_GLOW.ENABLED = _defaults.HORIZON_GLOW;
        if (vfx?.MUZZLE_FLASH) vfx.MUZZLE_FLASH.ENABLED = _defaults.MUZZLE_FLASH;
        if (vfx?.WEAPON_DEPLOY) vfx.WEAPON_DEPLOY.ENABLED = _defaults.WEAPON_DEPLOY;
        if (vfx?.SHIP_FLIGHT) {
            if (vfx.SHIP_FLIGHT.BANKING) vfx.SHIP_FLIGHT.BANKING.ENABLED = _defaults.BANKING_TILT;
            if (vfx.SHIP_FLIGHT.HOVER_BOB) vfx.SHIP_FLIGHT.HOVER_BOB.ENABLED = _defaults.HOVER_BOB;
            if (vfx.SHIP_FLIGHT.THRUST) vfx.SHIP_FLIGHT.THRUST.ENABLED = _defaults.ASYMMETRIC_THRUST;
            if (vfx.SHIP_FLIGHT.VAPOR_TRAILS) vfx.SHIP_FLIGHT.VAPOR_TRAILS.ENABLED = _defaults.WING_VAPOR_TRAILS;
            if (vfx.SHIP_FLIGHT.SQUASH_STRETCH) vfx.SHIP_FLIGHT.SQUASH_STRETCH.ENABLED = _defaults.SQUASH_STRETCH;
        }

        // Numeric values
        if (B.GLOW?.BULLET) { B.GLOW.BULLET.RADIUS = _defaults.GLOW_BULLET_RADIUS; B.GLOW.BULLET.ALPHA = _defaults.GLOW_BULLET_ALPHA; }
        if (B.GLOW?.ENGINE) { B.GLOW.ENGINE.RADIUS = _defaults.GLOW_ENGINE_RADIUS; B.GLOW.ENGINE.ALPHA = _defaults.GLOW_ENGINE_ALPHA; }
        if (B.GLOW?.MUZZLE) { B.GLOW.MUZZLE.RADIUS_MULT = _defaults.GLOW_MUZZLE_RADIUS_MULT; B.GLOW.MUZZLE.ALPHA = _defaults.GLOW_MUZZLE_ALPHA; }
        if (B.GLOW?.POWERUP) { B.GLOW.POWERUP.RADIUS_MULT = _defaults.GLOW_POWERUP_RADIUS_MULT; B.GLOW.POWERUP.ALPHA = _defaults.GLOW_POWERUP_ALPHA; }
        if (B.GLOW?.PARTICLES) B.GLOW.PARTICLES.RING_ALPHA_MULT = _defaults.GLOW_RING_ALPHA_MULT;
        if (B.GLOW?.DEATH_FLASH) { B.GLOW.DEATH_FLASH.RADIUS = _defaults.GLOW_DEATH_RADIUS; B.GLOW.DEATH_FLASH.DURATION = _defaults.GLOW_DEATH_DURATION; }
        if (B.GLOW?.ENEMY) { B.GLOW.ENEMY.RADIUS = _defaults.GLOW_ENEMY_RADIUS; B.GLOW.ENEMY.ALPHA = _defaults.GLOW_ENEMY_ALPHA; }
        if (B.SKY?.STARS) B.SKY.STARS.COUNT = _defaults.SKY_STARS_COUNT;
        if (B.SKY?.STARS?.SHOOTING_STARS) B.SKY.STARS.SHOOTING_STARS.MAX_ACTIVE = _defaults.SKY_SHOOTING_MAX;
        if (B.SKY?.CLOUDS) B.SKY.CLOUDS.COUNT = _defaults.SKY_CLOUDS_COUNT;
        if (vfx?.EXPLOSION_WEAK) { vfx.EXPLOSION_WEAK.particles = _defaults.EXPLOSION_WEAK_P; vfx.EXPLOSION_WEAK.debrisCount = _defaults.EXPLOSION_WEAK_D; }
        if (vfx?.EXPLOSION_MEDIUM) { vfx.EXPLOSION_MEDIUM.particles = _defaults.EXPLOSION_MEDIUM_P; vfx.EXPLOSION_MEDIUM.debrisCount = _defaults.EXPLOSION_MEDIUM_D; }
        if (vfx?.EXPLOSION_STRONG) { vfx.EXPLOSION_STRONG.particles = _defaults.EXPLOSION_STRONG_P; vfx.EXPLOSION_STRONG.debrisCount = _defaults.EXPLOSION_STRONG_D; }
        if (vfx) { vfx.MUZZLE_SPARK_BASE = _defaults.MUZZLE_SPARK_BASE; vfx.MUZZLE_SPARK_PER_LEVEL = _defaults.MUZZLE_SPARK_PER_LEVEL; }
        if (vfx?.HYPER_AURA?.SPEED_LINES) { vfx.HYPER_AURA.SPEED_LINES.COUNT = _defaults.HYPER_SPEED_LINES_COUNT; vfx.HYPER_AURA.SPEED_LINES.ALPHA = _defaults.HYPER_SPEED_LINES_ALPHA; }
        if (vfx?.HYPER_AURA?.BODY_GLOW) { vfx.HYPER_AURA.BODY_GLOW.RADIUS = _defaults.HYPER_BODY_GLOW_RADIUS; vfx.HYPER_AURA.BODY_GLOW.ALPHA = _defaults.HYPER_BODY_GLOW_ALPHA; }
        if (vfx?.SHIP_FLIGHT?.VAPOR_TRAILS) vfx.SHIP_FLIGHT.VAPOR_TRAILS.MAX_PER_FRAME = _defaults.VAPOR_MAX_PER_FRAME;
        if (vfx?.ENERGY_SKIN) { vfx.ENERGY_SKIN.OUTER_STROKE = _defaults.ENERGY_SKIN_OUTER_STROKE; vfx.ENERGY_SKIN.SPARK_COUNT = _defaults.ENERGY_SKIN_SPARK_COUNT; }
    }

    // ── Apply tier overrides ─────────────────────────────────────
    function _applyTier(tierName) {
        const B = G.Balance;
        const cfg = B.QUALITY;
        if (!cfg) return;

        const tier = cfg.TIERS[tierName];
        if (!tier) return;

        _tier = tierName;
        cfg.CURRENT_TIER = tierName;
        if (G.Debug?._addSessionLog) G.Debug._addSessionLog('QUALITY', tierName);

        // Step 1: Always restore all defaults (clean slate)
        _restoreDefaults();

        // Step 2: HIGH = defaults, done
        if (tierName === 'HIGH') return;

        // Step 3: Apply tier-specific overrides on top of defaults
        const vfx = B.VFX;

        // Boolean kill-switches (MEDIUM/LOW)
        if ('GLOW_ENABLED' in tier && B.GLOW) B.GLOW.ENABLED = tier.GLOW_ENABLED;
        if ('ENEMY_GLOW' in tier && B.GLOW?.ENEMY) B.GLOW.ENEMY.ENABLED = tier.ENEMY_GLOW;
        if ('DEATH_FLASH' in tier && B.GLOW?.DEATH_FLASH) B.GLOW.DEATH_FLASH.ENABLED = tier.DEATH_FLASH;

        // Particles
        if ('PARTICLES_MAX' in tier && G.ParticleSystem?.setMaxParticles) G.ParticleSystem.setMaxParticles(tier.PARTICLES_MAX);
        if ('CANVAS_EFFECTS_MAX' in tier && G.ParticleSystem?.setMaxCanvasEffects) G.ParticleSystem.setMaxCanvasEffects(tier.CANVAS_EFFECTS_MAX);

        // Sky booleans
        if ('SKY_CLOUDS' in tier && B.SKY?.CLOUDS) B.SKY.CLOUDS.ENABLED = tier.SKY_CLOUDS;
        if ('SKY_PARTICLES_COUNT' in tier && B.SKY?.PARTICLES) B.SKY.PARTICLES.COUNT = tier.SKY_PARTICLES_COUNT;
        if ('SKY_WEATHER' in tier && B.SKY?.WEATHER) B.SKY.WEATHER.ENABLED = tier.SKY_WEATHER;
        if ('SKY_HILLS_REDRAW' in tier && B.SKY?.OFFSCREEN) B.SKY.OFFSCREEN.HILLS_REDRAW_INTERVAL = tier.SKY_HILLS_REDRAW;
        if ('HORIZON_GLOW' in tier && B.SKY?.HORIZON_GLOW) B.SKY.HORIZON_GLOW.ENABLED = tier.HORIZON_GLOW;

        // Ship flight dynamics
        if (tier.SHIP_FLIGHT_ALL === false && vfx?.SHIP_FLIGHT) {
            if (vfx.SHIP_FLIGHT.BANKING) vfx.SHIP_FLIGHT.BANKING.ENABLED = false;
            if (vfx.SHIP_FLIGHT.HOVER_BOB) vfx.SHIP_FLIGHT.HOVER_BOB.ENABLED = false;
            if (vfx.SHIP_FLIGHT.THRUST) vfx.SHIP_FLIGHT.THRUST.ENABLED = false;
            if (vfx.SHIP_FLIGHT.VAPOR_TRAILS) vfx.SHIP_FLIGHT.VAPOR_TRAILS.ENABLED = false;
            if (vfx.SHIP_FLIGHT.SQUASH_STRETCH) vfx.SHIP_FLIGHT.SQUASH_STRETCH.ENABLED = false;
        }
        if ('SHIP_FLIGHT_VAPOR' in tier && vfx?.SHIP_FLIGHT?.VAPOR_TRAILS) {
            vfx.SHIP_FLIGHT.VAPOR_TRAILS.ENABLED = tier.SHIP_FLIGHT_VAPOR;
        }
        if ('SHIP_FLIGHT_SQUASH' in tier && vfx?.SHIP_FLIGHT?.SQUASH_STRETCH) {
            vfx.SHIP_FLIGHT.SQUASH_STRETCH.ENABLED = tier.SHIP_FLIGHT_SQUASH;
        }

        // VFX booleans
        if ('MUZZLE_FLASH' in tier && vfx?.MUZZLE_FLASH) vfx.MUZZLE_FLASH.ENABLED = tier.MUZZLE_FLASH;
        if ('WEAPON_DEPLOY' in tier && vfx?.WEAPON_DEPLOY) vfx.WEAPON_DEPLOY.ENABLED = tier.WEAPON_DEPLOY;

        // ── Numeric overrides (ULTRA boosts) ──
        // Glow radii & alpha
        if ('GLOW_BULLET_RADIUS' in tier && B.GLOW?.BULLET) B.GLOW.BULLET.RADIUS = tier.GLOW_BULLET_RADIUS;
        if ('GLOW_BULLET_ALPHA' in tier && B.GLOW?.BULLET) B.GLOW.BULLET.ALPHA = tier.GLOW_BULLET_ALPHA;
        if ('GLOW_ENGINE_RADIUS' in tier && B.GLOW?.ENGINE) B.GLOW.ENGINE.RADIUS = tier.GLOW_ENGINE_RADIUS;
        if ('GLOW_ENGINE_ALPHA' in tier && B.GLOW?.ENGINE) B.GLOW.ENGINE.ALPHA = tier.GLOW_ENGINE_ALPHA;
        if ('GLOW_MUZZLE_RADIUS_MULT' in tier && B.GLOW?.MUZZLE) B.GLOW.MUZZLE.RADIUS_MULT = tier.GLOW_MUZZLE_RADIUS_MULT;
        if ('GLOW_MUZZLE_ALPHA' in tier && B.GLOW?.MUZZLE) B.GLOW.MUZZLE.ALPHA = tier.GLOW_MUZZLE_ALPHA;
        if ('GLOW_POWERUP_RADIUS_MULT' in tier && B.GLOW?.POWERUP) B.GLOW.POWERUP.RADIUS_MULT = tier.GLOW_POWERUP_RADIUS_MULT;
        if ('GLOW_POWERUP_ALPHA' in tier && B.GLOW?.POWERUP) B.GLOW.POWERUP.ALPHA = tier.GLOW_POWERUP_ALPHA;
        if ('GLOW_RING_ALPHA_MULT' in tier && B.GLOW?.PARTICLES) B.GLOW.PARTICLES.RING_ALPHA_MULT = tier.GLOW_RING_ALPHA_MULT;
        if ('GLOW_DEATH_RADIUS' in tier && B.GLOW?.DEATH_FLASH) B.GLOW.DEATH_FLASH.RADIUS = tier.GLOW_DEATH_RADIUS;
        if ('GLOW_DEATH_DURATION' in tier && B.GLOW?.DEATH_FLASH) B.GLOW.DEATH_FLASH.DURATION = tier.GLOW_DEATH_DURATION;
        if ('GLOW_ENEMY_RADIUS' in tier && B.GLOW?.ENEMY) B.GLOW.ENEMY.RADIUS = tier.GLOW_ENEMY_RADIUS;
        if ('GLOW_ENEMY_ALPHA' in tier && B.GLOW?.ENEMY) B.GLOW.ENEMY.ALPHA = tier.GLOW_ENEMY_ALPHA;

        // Sky numeric
        if ('SKY_STARS_COUNT' in tier && B.SKY?.STARS) B.SKY.STARS.COUNT = tier.SKY_STARS_COUNT;
        if ('SKY_SHOOTING_MAX' in tier && B.SKY?.STARS?.SHOOTING_STARS) B.SKY.STARS.SHOOTING_STARS.MAX_ACTIVE = tier.SKY_SHOOTING_MAX;
        if ('SKY_CLOUDS_COUNT' in tier && B.SKY?.CLOUDS) B.SKY.CLOUDS.COUNT = tier.SKY_CLOUDS_COUNT;

        // Explosions
        if (tier.EXPLOSION_WEAK && vfx?.EXPLOSION_WEAK) {
            if (tier.EXPLOSION_WEAK.particles != null) vfx.EXPLOSION_WEAK.particles = tier.EXPLOSION_WEAK.particles;
            if (tier.EXPLOSION_WEAK.debrisCount != null) vfx.EXPLOSION_WEAK.debrisCount = tier.EXPLOSION_WEAK.debrisCount;
        }
        if (tier.EXPLOSION_MEDIUM && vfx?.EXPLOSION_MEDIUM) {
            if (tier.EXPLOSION_MEDIUM.particles != null) vfx.EXPLOSION_MEDIUM.particles = tier.EXPLOSION_MEDIUM.particles;
            if (tier.EXPLOSION_MEDIUM.debrisCount != null) vfx.EXPLOSION_MEDIUM.debrisCount = tier.EXPLOSION_MEDIUM.debrisCount;
        }
        if (tier.EXPLOSION_STRONG && vfx?.EXPLOSION_STRONG) {
            if (tier.EXPLOSION_STRONG.particles != null) vfx.EXPLOSION_STRONG.particles = tier.EXPLOSION_STRONG.particles;
            if (tier.EXPLOSION_STRONG.debrisCount != null) vfx.EXPLOSION_STRONG.debrisCount = tier.EXPLOSION_STRONG.debrisCount;
        }

        // Muzzle sparks
        if ('MUZZLE_SPARK_BASE' in tier && vfx) vfx.MUZZLE_SPARK_BASE = tier.MUZZLE_SPARK_BASE;
        if ('MUZZLE_SPARK_PER_LEVEL' in tier && vfx) vfx.MUZZLE_SPARK_PER_LEVEL = tier.MUZZLE_SPARK_PER_LEVEL;

        // HYPER aura
        if ('HYPER_SPEED_LINES_COUNT' in tier && vfx?.HYPER_AURA?.SPEED_LINES) vfx.HYPER_AURA.SPEED_LINES.COUNT = tier.HYPER_SPEED_LINES_COUNT;
        if ('HYPER_SPEED_LINES_ALPHA' in tier && vfx?.HYPER_AURA?.SPEED_LINES) vfx.HYPER_AURA.SPEED_LINES.ALPHA = tier.HYPER_SPEED_LINES_ALPHA;
        if ('HYPER_BODY_GLOW_RADIUS' in tier && vfx?.HYPER_AURA?.BODY_GLOW) vfx.HYPER_AURA.BODY_GLOW.RADIUS = tier.HYPER_BODY_GLOW_RADIUS;
        if ('HYPER_BODY_GLOW_ALPHA' in tier && vfx?.HYPER_AURA?.BODY_GLOW) vfx.HYPER_AURA.BODY_GLOW.ALPHA = tier.HYPER_BODY_GLOW_ALPHA;

        // Vapor trails
        if ('VAPOR_MAX_PER_FRAME' in tier && vfx?.SHIP_FLIGHT?.VAPOR_TRAILS) vfx.SHIP_FLIGHT.VAPOR_TRAILS.MAX_PER_FRAME = tier.VAPOR_MAX_PER_FRAME;

        // Energy skin
        if ('ENERGY_SKIN_OUTER_STROKE' in tier && vfx?.ENERGY_SKIN) vfx.ENERGY_SKIN.OUTER_STROKE = tier.ENERGY_SKIN_OUTER_STROKE;
        if ('ENERGY_SKIN_SPARK_COUNT' in tier && vfx?.ENERGY_SKIN) vfx.ENERGY_SKIN.SPARK_COUNT = tier.ENERGY_SKIN_SPARK_COUNT;

        // v6.7: Audio richness tier scaling
        if (G.Audio?.applyQualityTier) G.Audio.applyQualityTier(tierName);
    }

    // ── FPS calculation ──────────────────────────────────────────
    function _getAvgFps() {
        if (_fpsSamples.length === 0) return 60;
        let sum = 0;
        for (let i = 0; i < _fpsSamples.length; i++) sum += _fpsSamples[i];
        return sum / _fpsSamples.length;
    }

    function _getCurrentFps() {
        if (_fpsSamples.length === 0) return 60;
        return _fpsSamples[_fpsSamples.length - 1];
    }

    // ── Tier transition logic ────────────────────────────────────
    function _tierIndex() {
        return TIER_ORDER.indexOf(_tier);
    }

    function _checkTierDown(avgFps) {
        const cfg = G.Balance.QUALITY;
        if (avgFps < cfg.DROP_THRESHOLD) {
            const idx = _tierIndex();
            if (idx < TIER_ORDER.length - 1) {
                _applyTier(TIER_ORDER[idx + 1]);
                _recoverTimer = 0;
                _fpsSamples = []; // reset samples for fresh evaluation
                return true;
            }
        }
        return false;
    }

    function _checkTierUp(avgFps, dt) {
        const cfg = G.Balance.QUALITY;
        const idx = _tierIndex();
        if (idx <= 0) return false; // already ULTRA, can't go higher

        // Differentiated thresholds for ULTRA promotion
        const targetTier = TIER_ORDER[idx - 1];
        const threshold = (targetTier === 'ULTRA')
            ? (cfg.ULTRA_PROMOTE_THRESHOLD ?? 58)
            : cfg.RECOVER_THRESHOLD;
        const holdTime = (targetTier === 'ULTRA')
            ? (cfg.ULTRA_PROMOTE_HOLD ?? 8)
            : cfg.RECOVER_HOLD;

        if (avgFps > threshold) {
            _recoverTimer += dt;
            if (_recoverTimer >= holdTime) {
                _applyTier(targetTier);
                _recoverTimer = 0;
                _fpsSamples = [];
                return true;
            }
        } else {
            _recoverTimer = 0;
        }
        return false;
    }

    // ── Public API ───────────────────────────────────────────────
    G.QualityManager = {
        init() {
            _captureDefaults();

            // Read localStorage preference
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && stored !== 'AUTO') {
                if (TIER_ORDER.includes(stored)) {
                    _auto = false;
                    _applyTier(stored);
                }
            } else {
                _auto = true;
                _tier = 'HIGH';
            }

            // Early low-end detection (before gameplay FPS sampling)
            if (_auto) {
                const mem = navigator.deviceMemory || 8;
                const cores = navigator.hardwareConcurrency || 4;
                if (mem <= 2 || cores <= 2) {
                    _applyTier('MEDIUM');
                }
            }

            _fpsSamples = [];
            _sampleTimer = 0;
            _frameCount = 0;
            _playSeconds = 0;
            _recoverTimer = 0;
            _initialized = true;
        },

        update(timestamp) {
            if (!_initialized) return;

            // Calculate frame dt
            const dt = _lastTimestamp ? (timestamp - _lastTimestamp) / 1000 : 0;
            _lastTimestamp = timestamp;
            if (dt <= 0 || dt > 0.5) return; // skip bogus frames

            _frameCount++;
            _sampleTimer += dt;

            // Sample FPS every second
            if (_sampleTimer >= 1.0) {
                const fps = _frameCount / _sampleTimer;
                const window = G.Balance.QUALITY?.SAMPLE_WINDOW ?? 3;
                _fpsSamples.push(fps);
                if (_fpsSamples.length > window) _fpsSamples.shift();
                _frameCount = 0;
                _sampleTimer = 0;
            }

            // Only auto-adjust during PLAY state
            if (!_auto) return;
            if (!G.GameState?.is('PLAY')) {
                _playSeconds = 0;
                return;
            }

            _playSeconds += dt;
            const minSeconds = G.Balance.QUALITY?.MIN_PLAY_SECONDS ?? 5;
            if (_playSeconds < minSeconds) return;
            if (_fpsSamples.length < 2) return;

            const avgFps = _getAvgFps();
            if (!_checkTierDown(avgFps)) {
                _checkTierUp(avgFps, dt);
            }
        },

        getTier() {
            return _tier;
        },

        setTier(tier, persist) {
            if (!TIER_ORDER.includes(tier)) return;
            _applyTier(tier);
            _recoverTimer = 0;
            _fpsSamples = [];
            if (persist) {
                localStorage.setItem(STORAGE_KEY, tier);
            }
        },

        isAuto() {
            return _auto;
        },

        setAuto(bool) {
            _auto = !!bool;
            if (_auto) {
                localStorage.setItem(STORAGE_KEY, 'AUTO');
                // Reset to HIGH and let auto-detect find the right tier
                _applyTier('HIGH');
                _recoverTimer = 0;
                _fpsSamples = [];
                _playSeconds = 0;
            }
        },

        getStats() {
            return {
                fps: Math.round(_getCurrentFps()),
                avgFps: _getAvgFps(),
                tier: _tier,
                auto: _auto,
                samples: _fpsSamples.length
            };
        }
    };
})();
