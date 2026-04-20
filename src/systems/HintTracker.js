// HintTracker.js — Lifetime contextual hint gate
// Shows each hint ONCE per device (localStorage). Resettable via Settings.
// v7.6.0

window.Game = window.Game || {};

(function () {
    const G = window.Game;
    const PREFIX = 'fiat_hint_';

    const HintTracker = {
        /**
         * Trigger a hint. Invokes `showFn` only if the hint hasn't been shown before.
         * Suppressed during WARMUP (tutorial handles its own prompts).
         * @param {string} key — short hint id (without prefix)
         * @param {function} showFn — fired once; typically wraps MemeEngine.showStatus/queueMeme
         * @param {number} [delayMs=0] — optional delay before invoking showFn (avoids collision with active status)
         * @returns {boolean} true if fn was scheduled, false if already seen or suppressed
         */
        trigger(key, showFn, delayMs) {
            if (!key || typeof showFn !== 'function') return false;
            if (G.GameState && G.GameState.is && G.GameState.is('WARMUP')) return false;
            const storageKey = PREFIX + key;
            try {
                if (localStorage.getItem(storageKey) === '1') return false;
                localStorage.setItem(storageKey, '1');
            } catch {
                return false;
            }
            const d = delayMs | 0;
            if (d > 0) setTimeout(() => { try { showFn(); } catch (e) { console.warn('[HintTracker]', e); } }, d);
            else { try { showFn(); } catch (e) { console.warn('[HintTracker]', e); } }
            return true;
        },

        /** Check if a hint was already shown (without triggering). */
        isShown(key) {
            try { return localStorage.getItem(PREFIX + key) === '1'; }
            catch { return false; }
        },

        /** Force-mark a hint as shown without displaying it. */
        markShown(key) {
            try { localStorage.setItem(PREFIX + key, '1'); } catch {}
        },

        /** Clear all hint flags. Called by Settings → "Reset tutorial". */
        reset() {
            try {
                const toRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.indexOf(PREFIX) === 0) toRemove.push(k);
                }
                for (const k of toRemove) localStorage.removeItem(k);
            } catch {}
        }
    };

    G.HintTracker = HintTracker;
})();
