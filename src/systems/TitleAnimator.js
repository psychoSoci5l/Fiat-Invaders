/**
 * TitleAnimator.js - Animated Title Screen Controller (v4.35.0)
 *
 * Self-contained state machine for the intro title animation sequence.
 * States: IDLE -> ANIMATING -> LOOPING -> HIDDEN (+ SKIPPED shortcut)
 *
 * Uses CSS for text animations (GPU-accelerated) and canvas for particles.
 * Config: G.Balance.TITLE_ANIM
 */
(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    const STATES = { IDLE: 'IDLE', ANIMATING: 'ANIMATING', LOOPING: 'LOOPING', HIDDEN: 'HIDDEN' };

    G.TitleAnimator = {
        _state: STATES.IDLE,
        _timer: 0,
        _width: 600,
        _height: 900,
        _particles: [],
        _callbacks: null,
        _controlsRevealed: false,

        // Track which timeline events have fired
        _fired: null,

        init(w, h, callbacks) {
            this._width = w;
            this._height = h;
            this._callbacks = callbacks || {};
            this._state = STATES.IDLE;
            this._timer = 0;
            this._particles = [];
            this._controlsRevealed = false;
            this._fired = {
                subtitle: false,
                fiat: false,
                vs: false,
                crypto: false,
                loop: false,
                controls: false
            };
        },

        start(skipAnimation) {
            const cfg = G.Balance && G.Balance.TITLE_ANIM;
            const disabled = !cfg || cfg.ENABLED === false;

            if (skipAnimation || disabled || this._prefersReducedMotion()) {
                // Jump straight to loop state — everything visible
                this._state = STATES.LOOPING;
                this._timer = 0;
                this._showAllImmediate();
                return;
            }

            this._state = STATES.ANIMATING;
            this._timer = 0;
            this._particles = [];
            this._controlsRevealed = false;
            this._fired = {
                subtitle: false,
                fiat: false,
                vs: false,
                crypto: false,
                loop: false,
                controls: false
            };
        },

        skip() {
            if (this._state !== STATES.ANIMATING) return;
            this._state = STATES.LOOPING;
            this._showAllImmediate();
        },

        hide() {
            this._state = STATES.HIDDEN;
            this._particles = [];
        },

        update(dt) {
            if (this._state !== STATES.ANIMATING) {
                // Still update particles in LOOPING for tail-end
                this._updateParticles(dt);
                return;
            }

            this._timer += dt;
            const cfg = G.Balance.TITLE_ANIM;
            const TL = cfg.TIMELINE;

            // Timeline events
            if (!this._fired.subtitle && this._timer >= TL.SUBTITLE_IN) {
                this._fired.subtitle = true;
                const sub = document.getElementById('title-subtitle');
                if (sub) sub.classList.add('anim-visible');
            }

            if (!this._fired.fiat && this._timer >= TL.FIAT_IN) {
                this._fired.fiat = true;
                const fiat = document.querySelector('.intro-title .title-fiat');
                if (fiat) fiat.classList.add('anim-bounce-in-top');
                this._spawnParticles('fiat');
                if (G.Audio) G.Audio.play('titleBoom');
            }

            if (!this._fired.vs && this._timer >= TL.VS_IN) {
                this._fired.vs = true;
                const vs = document.querySelector('.intro-title .title-vs');
                if (vs) vs.classList.add('anim-fade-rotate');
            }

            if (!this._fired.crypto && this._timer >= TL.CRYPTO_IN) {
                this._fired.crypto = true;
                const crypto = document.querySelector('.intro-title .title-crypto');
                if (crypto) crypto.classList.add('anim-bounce-in-bottom');
                this._spawnParticles('crypto');
                if (G.Audio) G.Audio.play('titleZap');
            }

            if (!this._fired.controls && this._timer >= TL.CONTROLS_IN) {
                this._fired.controls = true;
                this._controlsRevealed = true;
                this._revealControls();
                // Transition to LOOPING
                this._state = STATES.LOOPING;
                // Remove anim-active to restore loop animations (fiatPulse/cryptoGlow)
                const title = document.getElementById('intro-title');
                if (title) title.classList.remove('anim-active');
            }

            this._updateParticles(dt);
        },

        draw(ctx) {
            if (this._particles.length === 0) return;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            for (let i = 0; i < this._particles.length; i++) {
                const p = this._particles[i];
                const alpha = p.life / p.maxLife;
                if (alpha <= 0) continue;

                ctx.globalAlpha = alpha * 0.8;
                ctx.fillStyle = p.color;

                if (p.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Square for crypto particles
                    const s = p.size;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.angle);
                    ctx.fillRect(-s, -s, s * 2, s * 2);
                    ctx.restore();
                }
            }

            ctx.restore();
        },

        isAnimating() {
            return this._state === STATES.ANIMATING;
        },

        isActive() {
            return this._state === STATES.ANIMATING || this._state === STATES.LOOPING;
        },

        setDimensions(w, h) {
            this._width = w;
            this._height = h;
        },

        // --- Private methods ---

        _prefersReducedMotion() {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },

        _showAllImmediate() {
            // Show subtitle
            const sub = document.getElementById('title-subtitle');
            if (sub) sub.classList.add('anim-visible');

            // Remove anim-active (restores existing fiatPulse/cryptoGlow animations)
            const title = document.getElementById('intro-title');
            if (title) title.classList.remove('anim-active');

            // Reveal controls immediately
            if (!this._controlsRevealed) {
                this._controlsRevealed = true;
                this._revealControls();
            }
        },

        _revealControls() {
            // Remove anim-hidden and add anim-show to controls
            const targets = [
                document.getElementById('mode-selector'),
                document.getElementById('mode-explanation'),
                document.querySelector('.primary-action-container'),
                document.querySelector('.intro-icons'),
                document.querySelector('.intro-version')
            ];

            targets.forEach(el => {
                if (el) {
                    el.classList.remove('anim-hidden');
                    el.classList.add('anim-show');
                }
            });

            if (this._callbacks.onControlsReady) {
                this._callbacks.onControlsReady();
            }
        },

        _spawnParticles(type) {
            const cfg = G.Balance.TITLE_ANIM.PARTICLES;
            const count = cfg.COUNT;
            const isFiat = type === 'fiat';
            const color = isFiat ? cfg.FIAT_COLOR : cfg.CRYPTO_COLOR;
            const shape = isFiat ? 'circle' : 'square';

            // Get position from DOM element
            let cx = this._width / 2;
            let cy = this._height * 0.2; // fallback

            const selector = isFiat ? '.intro-title .title-fiat' : '.intro-title .title-crypto';
            const el = document.querySelector(selector);
            if (el) {
                const rect = el.getBoundingClientRect();
                const canvas = document.getElementById('gameCanvas');
                if (canvas) {
                    const canvasRect = canvas.getBoundingClientRect();
                    cx = rect.left + rect.width / 2 - canvasRect.left;
                    cy = rect.top + rect.height / 2 - canvasRect.top;
                }
            }

            for (let i = 0; i < count; i++) {
                if (this._particles.length >= cfg.MAX_TOTAL) break;

                const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
                const speed = cfg.SPEED_MIN + Math.random() * (cfg.SPEED_MAX - cfg.SPEED_MIN);
                const life = cfg.DECAY_MIN + Math.random() * (cfg.DECAY_MAX - cfg.DECAY_MIN);

                this._particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed * 60, // convert to px/s
                    vy: Math.sin(angle) * speed * 60,
                    life: life,
                    maxLife: life,
                    color: color,
                    size: 2 + Math.random() * 3,
                    shape: shape,
                    angle: Math.random() * Math.PI * 2
                });
            }
        },

        _updateParticles(dt) {
            for (let i = this._particles.length - 1; i >= 0; i--) {
                const p = this._particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 60 * dt; // gravity
                p.life -= dt;
                p.angle += 3 * dt; // spin for squares

                if (p.life <= 0) {
                    this._particles.splice(i, 1);
                }
            }
        }
    };
})();
