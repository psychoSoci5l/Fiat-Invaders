/**
 * ScrollEngine — v8 S01..S05
 *
 * F1 (scroll advance), F2 (piecewise-linear LUT), F6 (dt clamp),
 * + speed multiplier ramp (S4 corridor crush), + halt/resume (S5 boss).
 *
 * Exposes:
 *   G.ScrollEngine.camera.scrollY         — float, monotonic
 *   G.ScrollEngine.getSpeed()             — current effective px/s (LUT × mult, 0 when halted)
 *   G.ScrollEngine.update(dtRaw)          — advances scrollY
 *   G.ScrollEngine.reset()                — full reset
 *   G.ScrollEngine.setProfile(lut)        — install a new LUT
 *   G.ScrollEngine.setSpeedMultiplier(t, ramp, decayTo, decayRamp) — temp boost/brake
 *   G.ScrollEngine.halt()                 — freeze scroll (boss)
 *   G.ScrollEngine.resume(speedOverride)  — unfreeze; optional px/s override
 *   G.ScrollEngine.enabled                — kill-switch
 *
 * LUT format: array of { y, v } keyframes, ascending y, v in px/s.
 */
(function() {
    'use strict';
    const G = window.Game = window.Game || {};

    const DT_MAX = 0.050; // F6

    // MVP Level 1 LUT — FED: Wall Street Raid (GDD scroll-engine-and-camera §F2)
    const DEFAULT_LUT = [
        { y: 0,     v: 60  },
        { y: 2400,  v: 100 },
        { y: 6000,  v: 100 },
        { y: 9000,  v: 140 },
        { y: 12000, v: 180 },
        { y: 14500, v: 180 },
        { y: 15500, v: 40  },
        { y: 17500, v: 40  },
        { y: 18000, v: 40  }
    ];

    const camera = { scrollY: 0 };
    let lut = DEFAULT_LUT;
    let currentSpeed = lut[0].v;

    // S4: speed multiplier state
    let mult = 1.0;
    let multTarget = 1.0;
    let multRate = 0;               // units per second (how fast mult approaches target)
    let decayAfterReach = null;     // { target, ramp } — applied when mult reaches multTarget
    // S5: halt / speed override state
    let halted = false;
    let speedOverride = null;

    function sampleSpeed(sY) {
        if (sY <= lut[0].y) return lut[0].v;
        const last = lut[lut.length - 1];
        if (sY >= last.y) return last.v;
        for (let i = 0; i < lut.length - 1; i++) {
            const a = lut[i], b = lut[i + 1];
            if (sY >= a.y && sY < b.y) {
                const t = (sY - a.y) / (b.y - a.y);
                return a.v + (b.v - a.v) * t;
            }
        }
        return last.v;
    }

    function _stepMultiplier(dt) {
        if (mult === multTarget) return;
        const delta = multTarget - mult;
        const step = multRate * dt;
        if (Math.abs(delta) <= step || multRate <= 0) {
            mult = multTarget;
            if (decayAfterReach) {
                multTarget = decayAfterReach.target;
                multRate = Math.abs(multTarget - mult) / Math.max(0.001, decayAfterReach.ramp);
                decayAfterReach = null;
            }
        } else {
            mult += Math.sign(delta) * step;
        }
    }

    function _effectiveSpeed() {
        if (halted) return 0;
        const base = (speedOverride !== null) ? speedOverride : sampleSpeed(camera.scrollY);
        return base * mult;
    }

    function update(dtRaw) {
        if (!api.enabled) return;
        const dt = Math.min(dtRaw, DT_MAX);
        _stepMultiplier(dt);
        currentSpeed = _effectiveSpeed();
        if (!halted) camera.scrollY += currentSpeed * dt;
    }

    function reset() {
        camera.scrollY = 0;
        currentSpeed = lut[0].v;
        mult = 1.0;
        multTarget = 1.0;
        multRate = 0;
        decayAfterReach = null;
        halted = false;
        speedOverride = null;
    }

    function setProfile(newLut) {
        if (Array.isArray(newLut) && newLut.length >= 2) {
            lut = newLut;
            reset();
        }
    }

    /**
     * Ramp the speed multiplier from current value to `target` over `ramp` seconds.
     * Optional automatic decay back to `decayTo` over `decayRamp` seconds once `target` is reached.
     * Example S4 corridor crush: setSpeedMultiplier(1.8, 2.0, 1.0, 2.0)
     */
    function setSpeedMultiplier(target, ramp, decayTo, decayRamp) {
        multTarget = target;
        multRate = Math.abs(target - mult) / Math.max(0.001, ramp || 0.001);
        decayAfterReach = (typeof decayTo === 'number' && decayRamp > 0)
            ? { target: decayTo, ramp: decayRamp }
            : null;
        if (G.Debug) G.Debug.log('V8', `scroll mult \u2192 ${target.toFixed(2)} ramp=${ramp}s${decayTo!==undefined?` decay\u2192${decayTo}`:''}`);
    }

    function halt() {
        halted = true;
        if (G.Debug) G.Debug.log('V8', 'scroll halt');
    }

    function resume(overrideSpeed) {
        halted = false;
        if (typeof overrideSpeed === 'number') speedOverride = overrideSpeed;
        if (G.Debug) G.Debug.log('V8', `scroll resume${typeof overrideSpeed === 'number' ? ` @ ${overrideSpeed}px/s` : ''}`);
    }

    function clearSpeedOverride() {
        speedOverride = null;
    }

    const api = {
        camera,
        update,
        reset,
        setProfile,
        setSpeedMultiplier,
        halt,
        resume,
        clearSpeedOverride,
        getSpeed: () => currentSpeed,
        get _halted() { return halted; },
        get _speedMult() { return mult; },
        enabled: true // v8-scroll session 1: default ON, flip off with `G.ScrollEngine.enabled = false`
    };

    G.ScrollEngine = api;
})();
