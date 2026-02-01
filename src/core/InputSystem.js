window.Game = window.Game || {};

class InputSystem {
    constructor() {
        this.keys = {};
        this.touch = { active: false, x: 0, shield: false, axisX: 0, joystickActive: false, joystickId: null, useJoystick: false, deadzone: 0.15, sensitivity: 1.0 };
        this.callbacks = {};
    }

    init() {
        window.addEventListener('keydown', e => {
            // console.log("Key:", e.code);
            this.keys[e.code] = true;
            this.handleGlobalKeys(e.code);
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        const handleTouch = (e) => {
            // Allow UI interactions (Buttons)
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('btn-coin')) {
                return;
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
        window.addEventListener('touchend', () => { if (!this.touch.joystickActive) this.touch.active = false; });

        const tShield = document.getElementById('t-shield');
        if (tShield) {
            tShield.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch.shield = true; });
            tShield.addEventListener('touchend', (e) => { e.preventDefault(); this.touch.shield = false; });
        }

        const joy = document.getElementById('joystick');
        const joyStick = document.getElementById('joystick-stick');
        if (joy && joyStick) {
            const radius = 40;
            const center = { x: 60, y: 60 };
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
                if (Math.abs(axis) < this.touch.deadzone) axis = 0;
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
                const t = Array.from(e.changedTouches).find(tt => tt.identifier === this.touch.joystickId);
                if (!t) return;
                const rect = joy.getBoundingClientRect();
                const dx = t.clientX - (rect.left + center.x);
                const dy = t.clientY - (rect.top + center.y);
                updateStick(dx, dy);
            };

            const onJoyEnd = (e) => {
                const t = Array.from(e.changedTouches).find(tt => tt.identifier === this.touch.joystickId);
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
}

// Attach to namespace
window.Game.Input = new InputSystem();
