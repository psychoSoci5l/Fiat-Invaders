window.Game = window.Game || {};

class InputSystem {
    constructor() {
        this.keys = {};
        this.touch = { active: false, x: 0, shield: false, hyper: false, axisX: 0, joystickActive: false, joystickId: null, useJoystick: false, deadzone: 0.15, sensitivity: 1.0 };
        // v5.7: Tap-on-ship shield activation
        this._tapStart = null; // {x, y, time}
        this._playerPos = { x: 0, y: 0 }; // Canvas coords, updated by Player
        this.callbacks = {};
        this.debugMode = false;  // Touch debug overlay
        this.debugOverlay = null;
        this.vibrationSupported = !!(navigator.vibrate);
        this.vibrationFallbackCallback = null;  // Visual fallback when no vibration
    }

    init() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            this.handleGlobalKeys(e.code);
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        const handleTouch = (e) => {
            // Allow UI interactions (Buttons, modals, scrollable panels)
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('btn-coin')) {
                return;
            }
            // v4.21: Don't intercept touches on modals/overlays or intro screen
            if (e.target.closest('#manual-modal') || e.target.closest('#settings-modal') || e.target.closest('#help-panel') || e.target.closest('#tutorial-overlay') || e.target.closest('#intro-screen') || e.target.closest('#whatsnew-panel')) {
                return;
            }

            // v5.7: Record tap start for shield (before joystick check, works in all modes)
            if (e.type === 'touchstart' && e.touches.length > 0) {
                this._tapStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
            }

            if (this.touch.useJoystick) return;
            if (this.touch.joystickActive) return;
            if (e.cancelable) e.preventDefault();
            this.touch.active = true;
            if (e.touches.length > 0) {
                // Normalize X to 0.0 - 1.0 range based on screen/window width
                // Since game is usually fullscreen or close to it on mobile:
                this.touch.xPct = e.touches[0].clientX / window.innerWidth;
                this.touch.x = e.touches[0].clientX; // Keep raw just in case
            }
        };

        window.addEventListener('touchstart', handleTouch, { passive: false });
        window.addEventListener('touchmove', handleTouch, { passive: false });
        window.addEventListener('touchend', (e) => {
            if (!this.touch.joystickActive) this.touch.active = false;
            // v5.7: Tap-on-ship shield activation
            if (this._tapStart && e.changedTouches.length > 0) {
                const t = e.changedTouches[0];
                const elapsed = Date.now() - this._tapStart.time;
                const dx = t.clientX - this._tapStart.x;
                const dy = t.clientY - this._tapStart.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (elapsed < 300 && dist < 20 && this._isNearShip(t.clientX, t.clientY)) {
                    this.touch.shield = true;
                    setTimeout(() => { this.touch.shield = false; }, 150);
                }
                this._tapStart = null;
            }
        }, { passive: true });

        // v5.7: Shield button removed — shield activates via tap-on-ship
        const tShield = document.getElementById('t-shield');
        if (tShield) tShield.style.display = 'none';

        // v4.0.4: HYPER button touch handler
        const tHyper = document.getElementById('t-hyper');
        if (tHyper) {
            tHyper.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.touch.hyper = true; }, { passive: false });
            tHyper.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); this.touch.hyper = false; }, { passive: false });
        }

        // Pause button - explicit touch handler for iOS
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
            pauseBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.togglePause === 'function') {
                    window.togglePause();
                }
            }, { passive: false });
        }

        const joy = document.getElementById('joystick');
        const joyStick = document.getElementById('joystick-stick');
        if (joy && joyStick) {
            const radius = 25;
            const center = { x: 37.5, y: 37.5 };
            const saved = localStorage.getItem('fiat_control_mode') || 'SWIPE';
            this.touch.useJoystick = (saved === 'JOYSTICK');
            joy.style.display = this.touch.useJoystick ? 'block' : 'none';
            const savedDeadzone = parseFloat(localStorage.getItem('fiat_joy_deadzone'));
            const savedSensitivity = parseFloat(localStorage.getItem('fiat_joy_sensitivity'));
            if (!Number.isNaN(savedDeadzone)) this.touch.deadzone = savedDeadzone;
            if (!Number.isNaN(savedSensitivity)) this.touch.sensitivity = savedSensitivity;

            const updateStick = (dx, dy) => {
                const dist = Math.sqrt(dx * dx + dy * dy);
                const clamped = dist > radius ? radius / dist : 1;
                const cx = dx * clamped;
                const cy = dy * clamped;
                joyStick.style.transform = `translate(${cx}px, ${cy}px)`;
                let axis = (cx / radius) * this.touch.sensitivity;
                // Smooth deadzone - gradual transition instead of hard cutoff
                axis = this._applyDeadzone(axis);
                this.touch.axisX = Math.max(-1, Math.min(1, axis));
                this.touch.active = true;
            };

            const resetStick = () => {
                joyStick.style.transform = 'translate(0, 0)';
                this.touch.axisX = 0;
                this.touch.active = false;
            };

            const onJoyStart = (e) => {
                if (e.cancelable) e.preventDefault();
                this.touch.joystickActive = true;
                const t = e.changedTouches[0];
                this.touch.joystickId = t.identifier;
                const rect = joy.getBoundingClientRect();
                const dx = t.clientX - (rect.left + center.x);
                const dy = t.clientY - (rect.top + center.y);
                updateStick(dx, dy);
            };

            const onJoyMove = (e) => {
                if (!this.touch.joystickActive) return;
                // Direct iteration (no Array.from allocation)
                let t = null;
                const touches = e.changedTouches;
                for (let i = 0, len = touches.length; i < len; i++) {
                    if (touches[i].identifier === this.touch.joystickId) {
                        t = touches[i];
                        break;
                    }
                }
                if (!t) return;
                const rect = joy.getBoundingClientRect();
                const dx = t.clientX - (rect.left + center.x);
                const dy = t.clientY - (rect.top + center.y);
                updateStick(dx, dy);
            };

            const onJoyEnd = (e) => {
                // Direct iteration (no Array.from allocation)
                let t = null;
                const touches = e.changedTouches;
                for (let i = 0, len = touches.length; i < len; i++) {
                    if (touches[i].identifier === this.touch.joystickId) {
                        t = touches[i];
                        break;
                    }
                }
                if (!t) return;
                this.touch.joystickActive = false;
                this.touch.joystickId = null;
                resetStick();
            };

            joy.addEventListener('touchstart', onJoyStart, { passive: false });
            joy.addEventListener('touchmove', onJoyMove, { passive: false });
            joy.addEventListener('touchend', onJoyEnd, { passive: false });
            joy.addEventListener('touchcancel', onJoyEnd, { passive: false });
        }
    }

    on(event, activeCallback) {
        this.callbacks[event] = activeCallback;
    }

    trigger(event) {
        if (this.callbacks[event]) this.callbacks[event]();
    }

    handleGlobalKeys(code) {
        if (code === 'Escape' && this.callbacks['escape']) this.callbacks['escape']();
        if ((code === 'Enter' || code === 'Space') && this.callbacks['start']) this.callbacks['start']();
        if (code === 'F3' && this.callbacks['toggleDebug']) this.callbacks['toggleDebug']();
        if (code === 'F4') this.toggleDebugMode();  // Touch debug overlay
        if (this.callbacks['navigate']) this.callbacks['navigate'](code);
    }

    vibrate(pattern) {
        if (!navigator.vibrate) return;
        try { navigator.vibrate(pattern); } catch (e) { }
    }

    isDown(key) {
        return !!this.keys[key];
    }

    setControlMode(mode) {
        const useJoy = (mode === 'JOYSTICK');
        this.touch.useJoystick = useJoy;
        const joy = document.getElementById('joystick');
        if (joy) joy.style.display = useJoy ? 'block' : 'none';
        localStorage.setItem('fiat_control_mode', useJoy ? 'JOYSTICK' : 'SWIPE');
    }

    setJoystickSettings(deadzone, sensitivity) {
        if (typeof deadzone === 'number') this.touch.deadzone = Math.max(0, Math.min(0.6, deadzone));
        if (typeof sensitivity === 'number') this.touch.sensitivity = Math.max(0.5, Math.min(1.5, sensitivity));
        localStorage.setItem('fiat_joy_deadzone', String(this.touch.deadzone));
        localStorage.setItem('fiat_joy_sensitivity', String(this.touch.sensitivity));
    }

    // === DEADZONE: Smooth transition instead of hard cutoff ===
    _applyDeadzone(axis) {
        const dz = this.touch.deadzone;
        const absAxis = Math.abs(axis);
        if (absAxis < dz) {
            return 0;  // Inside deadzone
        }
        // Remap from [deadzone, 1] to [0, 1] for smooth transition
        const sign = Math.sign(axis);
        const remapped = (absAxis - dz) / (1 - dz);
        return sign * remapped;
    }

    // === v5.7: Tap-on-ship shield — player position tracking ===
    updatePlayerPos(x, y) {
        this._playerPos.x = x;
        this._playerPos.y = y;
    }

    _isNearShip(clientX, clientY) {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        // Convert screen coords to canvas coords (handles CSS scaling)
        const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
        const canvasY = (clientY - rect.top) * (canvas.height / rect.height);
        const dx = canvasX - this._playerPos.x;
        const dy = canvasY - this._playerPos.y;
        return (dx * dx + dy * dy) < 65 * 65; // 65px radius tap zone (v5.9: 55→65 for 42px ship)
    }

    // === VIBRATION with visual fallback ===
    setVibrationFallback(callback) {
        this.vibrationFallbackCallback = callback;
    }

    vibrate(pattern) {
        if (this.vibrationSupported) {
            try {
                navigator.vibrate(pattern);
                return;
            } catch (e) {
                // Vibration failed, use fallback
            }
        }
        // Visual fallback when vibration unavailable
        if (this.vibrationFallbackCallback) {
            this.vibrationFallbackCallback(pattern);
        }
    }

    // === TOUCH DEBUG MODE (F4 toggle) ===
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        if (this.debugMode) {
            this._showDebugOverlay();
        } else {
            this._hideDebugOverlay();
        }
        return this.debugMode;
    }

    _showDebugOverlay() {
        if (this.debugOverlay) return;

        this.debugOverlay = document.createElement('div');
        this.debugOverlay.id = 'touch-debug-overlay';
        this.debugOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

        // Touch indicator
        const indicator = document.createElement('div');
        indicator.id = 'touch-debug-indicator';
        indicator.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            border: 3px solid #00ff00;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            display: none;
            box-shadow: 0 0 10px #00ff00;
        `;
        this.debugOverlay.appendChild(indicator);

        // Info panel
        const info = document.createElement('div');
        info.id = 'touch-debug-info';
        info.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 8px;
            border-radius: 4px;
        `;
        info.innerHTML = 'Touch Debug: ON<br>Vibration: ' + (this.vibrationSupported ? 'YES' : 'NO');
        this.debugOverlay.appendChild(info);

        document.body.appendChild(this.debugOverlay);

        // Update debug info on touch
        this._debugTouchHandler = (e) => {
            const indicator = document.getElementById('touch-debug-indicator');
            const info = document.getElementById('touch-debug-info');
            if (e.touches.length > 0) {
                const t = e.touches[0];
                indicator.style.display = 'block';
                indicator.style.left = t.clientX + 'px';
                indicator.style.top = t.clientY + 'px';
                info.innerHTML = `Touch Debug: ON<br>X: ${t.clientX.toFixed(0)}<br>Y: ${t.clientY.toFixed(0)}<br>xPct: ${(t.clientX / window.innerWidth).toFixed(2)}<br>axisX: ${this.touch.axisX.toFixed(2)}<br>Shield: ${this.touch.shield}<br>Vibration: ${this.vibrationSupported ? 'YES' : 'NO'}`;
            } else {
                indicator.style.display = 'none';
            }
        };
        window.addEventListener('touchstart', this._debugTouchHandler);
        window.addEventListener('touchmove', this._debugTouchHandler);
        window.addEventListener('touchend', this._debugTouchHandler);
    }

    _hideDebugOverlay() {
        if (this.debugOverlay) {
            this.debugOverlay.remove();
            this.debugOverlay = null;
        }
        if (this._debugTouchHandler) {
            window.removeEventListener('touchstart', this._debugTouchHandler);
            window.removeEventListener('touchmove', this._debugTouchHandler);
            window.removeEventListener('touchend', this._debugTouchHandler);
            this._debugTouchHandler = null;
        }
    }
}

// Attach to namespace
window.Game.Input = new InputSystem();
