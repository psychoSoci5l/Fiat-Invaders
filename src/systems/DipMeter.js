window.Game = window.Game || {};

/**
 * DipMeter — Proximity Kill meter (0-100) con emissione eventi dip:changed.
 *
 * Centralizza lo stato grazeMeter che prima era disperso in main.js.
 * Emette dip:changed quando il valore attraversa soglie del 25%.
 */
window.Game.DipMeter = {
    _value: 0,
    _multiplier: 1.0,
    _lastGrazeTime: 0,
    _lastEmittedThreshold: 0,   // previene emissioni duplicate sulla stessa soglia

    // Soglie di emissione (percentuali)
    THRESHOLDS: [25, 50, 75, 100],

    init() {
        this.reset();
    },

    reset() {
        this._value = 0;
        this._multiplier = 1.0;
        this._lastGrazeTime = 0;
        this._lastEmittedThreshold = 0;
        this._updateUI();
    },

    /** Aggiunge gain al meter (da proximity kill, boss hit, phase transition) */
    add(gain) {
        const G = window.Game;
        // Soppresso durante HYPER
        const player = G._player || (G.Player && G.Player.instance);
        if (player && player.isHyperActive && player.isHyperActive()) return;

        // Arcade JACKPOT modifier
        if (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode()) {
            gain *= (G.RunState && G.RunState.arcadeBonuses ? G.RunState.arcadeBonuses.grazeGainMult : 1);
        }

        const prev = this._value;
        this._value = Math.min(100, this._value + gain);
        this._lastGrazeTime = performance.now() / 1000;

        this._emitIfCrossed(prev, this._value);

        // v7.7.0: Lesson modal al primo superamento del 50%
        if (prev < 50 && this._value >= 50 && G.LessonModal) {
            G.LessonModal.show('lesson_dip');
        }

        this._updateMultiplier();
        this._updateUI();
        return this._value;
    },

    /** Azzera il meter (chiamato su attivazione HYPER) */
    zero() {
        const prev = this._value;
        this._value = 0;
        this._lastEmittedThreshold = 0;
        this._updateMultiplier();
        this._updateUI();
        this._emitChanged(prev, 0);
    },

    /** Aggiorna il moltiplicatore in base al valore corrente */
    _updateMultiplier() {
        const Balance = window.Game.Balance;
        if (!Balance) return;
        this._multiplier = 1 + (this._value / Balance.GRAZE.MULT_DIVISOR) * (Balance.GRAZE.MULT_MAX - 1);
    },

    get value() { return this._value; },
    set value(v) {
        const prev = this._value;
        this._value = Math.max(0, Math.min(100, v));
        this._emitIfCrossed(prev, this._value);
        this._updateMultiplier();
        this._updateUI();
    },

    get multiplier() { return this._multiplier; },
    get lastGrazeTime() { return this._lastGrazeTime; },

    /** Emette dip:changed se il valore attraversa una soglia del 25% */
    _emitIfCrossed(prevVal, newVal) {
        for (const t of this.THRESHOLDS) {
            if (prevVal < t && newVal >= t) {
                this._emitChanged(prevVal, newVal);
                return;
            }
        }
        // Emette anche al calo sotto una soglia (decay re-enabled)
        for (const t of this.THRESHOLDS) {
            if (prevVal >= t && newVal < t) {
                this._emitChanged(prevVal, newVal);
                return;
            }
        }
    },

    _emitChanged(prev, current) {
        const G = window.Game;
        if (!G.Events) return;
        G.Events.emit('dip:changed', {
            prev: prev,
            value: current,
            multiplier: this._multiplier
        });
    },

    /** Aggiorna la UI del meter (DOM) */
    _updateUI() {
        const fill = document.getElementById('graze-fill');
        const meter = document.getElementById('graze-meter');
        if (fill) {
            fill.style.width = this._value + '%';
        }
        if (meter) {
            meter.classList.toggle('graze-full', this._value >= 100);
            const approaching = this._value >= 80 && this._value < 100;
            meter.classList.toggle('graze-approaching', approaching);
        }
    }
};
