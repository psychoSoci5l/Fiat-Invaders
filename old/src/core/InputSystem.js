window.Game = window.Game || {};

class InputSystem {
    constructor() {
        this.keys = {};
        this.touch = { active: false, x: 0, shield: false };
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
        window.addEventListener('touchend', () => { this.touch.active = false; });

        const tShield = document.getElementById('t-shield');
        if (tShield) {
            tShield.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch.shield = true; });
            tShield.addEventListener('touchend', (e) => { e.preventDefault(); this.touch.shield = false; });
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
        if (this.callbacks['navigate']) this.callbacks['navigate'](code);
    }

    vibrate(pattern) {
        if (!navigator.vibrate) return;
        try { navigator.vibrate(pattern); } catch (e) { }
    }

    isDown(key) {
        return !!this.keys[key];
    }
}

// Attach to namespace
window.Game.Input = new InputSystem();
