/**
 * ToastSystem v7.13 — Non-blocking in-game toast notifications
 *
 * Two-tier feedback architecture:
 * - CRITICAL: Full popup (meme-popup) — blocks gameplay, requires attention
 * - INFO: Toast strip — non-blocking, auto-dismisses, gameplay continues
 *
 * Toast types: perk, hyper, godchain, shield, combo
 * Max 2 visible toasts. Queue overflow drops oldest.
 * Priority queue: newer toasts push out older info toasts.
 */
window.Game = window.Game || {};

window.Game.ToastSystem = {
    _container: null,
    _visibleToasts: [],
    _queue: [],
    _MAX_VISIBLE: 2,
    _TOAST_DURATION: 1500,
    _FADE_IN: 150,
    _FADE_OUT: 200,
    _initialized: false,

    TYPE_COLORS: {
        perk: 'toast-item--perk',
        hyper: 'toast-item--hyper',
        godchain: 'toast-item--godchain',
        shield: 'toast-item--shield',
        combo: 'toast-item--combo'
    },

    /**
     * Initialize the toast system. Call once after DOM is ready.
     */
    init() {
        this._container = document.getElementById('toast-container');
        if (!this._container) {
            console.warn('ToastSystem: #toast-container not found');
            return;
        }
        this._initialized = true;
    },

    /**
     * Show a toast notification.
     * @param {string} text - Toast text (uppercase, short)
     * @param {string} [type] - Toast type: perk|hyper|godchain|shield|combo
     * @param {string} [icon] - Optional icon character (e.g. '⚡', '🛡')
     * @param {number} [duration] - Duration in ms (default 1500)
     */
    show(text, type, icon, duration) {
        if (!this._initialized || !this._container) return;

        // Suppress toasts if a meme-popup is currently visible
        const memePopup = document.getElementById('meme-popup');
        if (memePopup && memePopup.classList.contains('show')) return;

        const toastDuration = duration || this._TOAST_DURATION;
        const cssClass = this.TYPE_COLORS[type] || '';

        // If at max visible toasts, dismiss the oldest
        while (this._visibleToasts.length >= this._MAX_VISIBLE) {
            this._dismissOldest();
        }

        this._createToast(text, cssClass, icon || '', toastDuration);
    },

    /**
     * Show a perk pickup toast.
     * @param {string} perkName - Perk display name
     * @param {string} [icon] - Perk icon character
     */
    showPerk(perkName, icon) {
        this.show(perkName, 'perk', icon || '◆');
    },

    /**
     * Show a HYPER first-activation toast.
     * @param {string} [text] - Override default text
     */
    showHyper(text) {
        this.show(text || 'HYPER ACTIVE', 'hyper', '⚡');
    },

    /**
     * Show a GODCHAIN toast.
     * @param {string} [text] - Override default text
     */
    showGodchain(text) {
        this.show(text || 'GODCHAIN', 'godchain', '⛓');
    },

    /**
     * Show a shield toast.
     * @param {string} [text] - Override default text
     */
    showShield(text) {
        this.show(text || 'SHIELD', 'shield', '🛡');
    },

    /**
     * Show a combo milestone toast.
     * @param {string} comboText - e.g. "25x COMBO"
     */
    showCombo(comboText) {
        this.show(comboText, 'combo', '×');
    },

    /**
     * Dismiss all visible toasts immediately.
     */
    dismissAll() {
        const toasts = [...this._visibleToasts];
        toasts.forEach(t => this._dismissToast(t));
        this._queue = [];
    },

    // -- Private methods --

    _createToast(text, cssClass, icon, duration) {
        const el = document.createElement('div');
        el.className = 'toast-item' + (cssClass ? ' ' + cssClass : '');

        if (icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'toast-icon';
            iconSpan.textContent = icon;
            el.appendChild(iconSpan);
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        el.appendChild(textSpan);

        this._container.appendChild(el);
        this._visibleToasts.push(el);

        // Auto-dismiss after duration
        const timerId = setTimeout(() => {
            this._dismissToast(el);
        }, duration);

        el._toastTimerId = timerId;
    },

    _dismissToast(el) {
        if (!el || !el.parentNode) return;
        clearTimeout(el._toastTimerId);

        el.classList.add('fade-out');
        setTimeout(() => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
            const idx = this._visibleToasts.indexOf(el);
            if (idx !== -1) this._visibleToasts.splice(idx, 1);

            // Process queue
            if (this._queue.length > 0 && this._visibleToasts.length < this._MAX_VISIBLE) {
                const next = this._queue.shift();
                this._createToast(next.text, next.cssClass, next.icon, next.duration);
            }
        }, this._FADE_OUT);
    },

    _dismissOldest() {
        if (this._visibleToasts.length === 0) return;
        const oldest = this._visibleToasts[0];
        this._dismissToast(oldest);
    }
};