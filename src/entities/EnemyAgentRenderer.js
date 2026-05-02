/**
 * EnemyAgentRenderer.js — Procedural humanoid enemy rendering
 *
 * v7.13.1: Extracted from Enemy.js for modularity.
 * All methods are static, taking (enemy, ctx, ...) instead of using `this`.
 *
 * Renders regional "Agents of the System" — USA oligarchs, EU bureaucrats,
 * ASIA ronin — plus their vehicles, hats, accessories, and currency chest marks.
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // ================================================================
    // v7.9 AGENTS OF THE SYSTEM — procedural humanoid enemies
    // ================================================================
    // Each enemy is a person in service of the FIAT regime. Regional
    // family (USA/EU/ASIA) determines archetype; tier modulates scale
    // and accessories. Currency symbol = chest mark (brand, not label).
    // All sub-draws use coordinates local to the enemy center.
    //
    //   drawAgent            — dispatch by Game.CURRENCY_REGION[symbol]
    //   _drawOligarch         — USA: top hat + dark suit + tie (+ cigar STRONG)
    //   _drawBureaucrat       — EU:  bowler + briefcase + monocle
    //   _drawRonin            — ASIA: kabuto + menpo + mechanical armor
    //   _drawChestMark        — currency symbol as emblem (tie/monocle/mon)
    //
    // Bounding: approx ±24 per axis at base scale. Hitbox unchanged.
    // ================================================================

    /**
     * Draw the agent (pilot + vehicle) for a given enemy.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} enemy - Enemy instance
     * @param {number} x - Screen X
     * @param {number} y - Screen Y
     */
    function drawAgent(ctx, enemy, x, y) {
        const agentCfg = G.Balance?.ENEMY_AGENT;
        // Kill-switch — if disabled, fall back to minion silhouette so the game still renders
        if (agentCfg && agentCfg.ENABLED === false) {
            return false; // Signal caller to use minion fallback
        }
        // v7.19: Archetype agents (HFT/AUDITOR/PRINTER) bypass the regional pilot/vehicle path
        // entirely — they have dedicated procedural shapes (no oligarch, no kabuto).
        if (enemy.archetype) {
            ctx.save();
            ctx.translate(x, y);
            if (enemy.archetype === 'HFT') _drawHFT(ctx, enemy);
            else if (enemy.archetype === 'AUDITOR') _drawAuditor(ctx, enemy);
            else if (enemy.archetype === 'PRINTER') _drawPrinter(ctx, enemy);
            ctx.restore();
            return true;
        }
        const region = (G.CURRENCY_REGION || {})[enemy.symbol] || 'USA';
        const tier = enemy._tier || 'MEDIUM';
        const tierScales = agentCfg?.TIER_SCALE;
        const scale = tierScales?.[tier] ?? (tier === 'WEAK' ? 0.90 : (tier === 'STRONG' ? 1.12 : 1.0));

        const now = performance.now();
        // Thruster flicker 80ms (replaces walk cycle — pilots no longer walk, vehicles fly)
        const thrusterPhase = (Math.floor((now + enemy._walkOffset) / 80)) & 1;
        // Pilot hover bob (subtle breathing motion inside cockpit)
        const bobY = Math.sin((now + enemy._walkOffset) * 0.004) * 0.8;

        ctx.save();
        ctx.translate(x, y);
        if (scale !== 1) ctx.scale(scale, scale);
        // FLIP Y — enemies descend head-first from space, thrusters on top push them toward player.
        // v7.9.5: when _uprightFlip is true (hover-gate DWELL), skip the flip → agent stands upright
        // with thrusters BELOW, suspending them against gravity.
        if (!enemy._uprightFlip) ctx.scale(1, -1);

        // Vehicle draws first (behind pilot bust)
        if (region === 'EU') {
            _drawVehicleEU(ctx, enemy, tier, thrusterPhase);
        } else if (region === 'ASIA') {
            _drawVehicleASIA(ctx, enemy, tier, thrusterPhase);
        } else {
            _drawVehicleUSA(ctx, enemy, tier, thrusterPhase);
        }

        // Pilot bust (with subtle hover bob)
        ctx.save();
        ctx.translate(0, bobY);
        if (region === 'EU') {
            _drawBureaucrat(ctx, enemy, tier);
        } else if (region === 'ASIA') {
            _drawRonin(ctx, enemy, tier);
        } else {
            _drawOligarch(ctx, enemy, tier);
        }
        _drawChestMark(ctx, enemy, region, tier);
        ctx.restore();

        ctx.restore();
        return true; // Agent was drawn
    }

    /**
     * Draw glow effect for enemy agent
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} enemy - Enemy instance
     */
    function drawGlow(ctx, enemy) {
        const cfg = G.Balance?.GLOW?.ENEMY;
        if (!cfg?.ENABLED) return;
        const x = enemy.x, y = enemy.y;
        const r = 25; // approximate enemy body radius

        // v4.58: Destabilize glow when damaged
        let pulseSpeed = cfg.PULSE_SPEED;
        let baseAlpha = cfg.ALPHA;
        let glowColor = enemy.color;
        if (enemy._damageIntensity > 0) {
            const dg = G.Balance?.VFX?.DAMAGE_VISUAL?.GLOW;
            if (dg) {
                pulseSpeed *= 1 + (dg.PULSE_SPEED_MULT - 1) * enemy._damageIntensity;
                baseAlpha *= 1 - (1 - dg.ALPHA_MULT) * enemy._damageIntensity;
                // Shift toward white (desaturate)
                const CU = G.ColorUtils;
                glowColor = CU.lighten(enemy.color, dg.DESATURATE * enemy._damageIntensity);
            }
        }

        const pulse = Math.sin(Date.now() * pulseSpeed * 0.001) * cfg.PULSE_AMOUNT;
        const alpha = baseAlpha + pulse;
        const CU = G.ColorUtils;
        const grad = ctx.createRadialGradient(x, y, r * 0.4, x, y, r + cfg.RADIUS);
        grad.addColorStop(0, CU.withAlpha(glowColor, alpha));
        grad.addColorStop(1, CU.withAlpha(glowColor, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r + cfg.RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---------- USA: Oligarch (pilot bust) ----------
    // Base tycoon silhouette — hat + accessory dispatched via CURRENCY_VARIANT (v7.9.4).
    function _drawOligarch(ctx, enemy, tier) {
        const variant = _variant(enemy);
        const pal = _paletteFor(variant.palette, 'USA');
        const shirt     = '#d9d0b8';
        const tieCol    = pal.tie       || '#8f1e1e';
        const tieDark   = pal.tieDark   || '#5a1010';
        const skin      = '#b8876a';
        const skinShade = '#8a5a3f';
        const outline   = '#050505';

        // Torso (jacket — bust cropped at cockpit line y=+6)
        ctx.fillStyle = pal.suit;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
        ctx.lineTo(10, 7); ctx.lineTo(-10, 7);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Lapels
        ctx.fillStyle = pal.suitDark;
        ctx.beginPath();
        ctx.moveTo(-12, 0); ctx.lineTo(-3, 0); ctx.lineTo(-5, 6); ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(12, 0); ctx.lineTo(3, 0); ctx.lineTo(5, 6); ctx.closePath();
        ctx.fill();

        // Shirt V
        ctx.fillStyle = shirt;
        ctx.beginPath();
        ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(0, 6);
        ctx.closePath(); ctx.fill();

        // Tie
        ctx.fillStyle = tieCol;
        ctx.strokeStyle = tieDark;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-2, 0); ctx.lineTo(2, 0);
        ctx.lineTo(2.4, 6); ctx.lineTo(-2.4, 6);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Neck
        ctx.fillStyle = skinShade;
        ctx.fillRect(-3, -3, 6, 4);

        // Head
        ctx.fillStyle = skin;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -9, 7.5, 8, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Jaw shadow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = skinShade;
        ctx.beginPath();
        ctx.ellipse(0, -5, 6, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Eyes — cold dots
        ctx.fillStyle = outline;
        ctx.beginPath();
        ctx.arc(-2.8, -9, 1.1, 0, Math.PI * 2);
        ctx.arc( 2.8, -9, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // Mouth — flat line
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2.2, -5); ctx.lineTo(2.2, -5);
        ctx.stroke();

        // Accessory (cigar / kerchief / cane / monocle) — STRONG always, MEDIUM gets non-cigar, WEAK bare
        if (tier === 'STRONG' || (tier === 'MEDIUM' && variant.acc !== 'cigar')) {
            _drawAccessory(ctx, enemy, variant.acc, pal);
        }

        // Hat dispatch
        _drawHat(ctx, enemy, variant.hat, pal);
    }

    // ---------- EU: Bureaucrat (pilot bust) ----------
    // Base office-worker silhouette — hat + accessory dispatched via CURRENCY_VARIANT (v7.9.4).
    function _drawBureaucrat(ctx, enemy, tier) {
        const variant = _variant(enemy);
        const pal = _paletteFor(variant.palette, 'EU');
        const shirt     = '#d9d0b8';
        const tieCol    = pal.tie     || '#1f3a5f';
        const skin      = '#c0a080';
        const skinShade = '#8a6848';
        const outline   = '#050505';
        const pinCol    = '#c9a227';

        // Narrower torso (bust cropped at cockpit y=+6)
        ctx.fillStyle = pal.suit;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-9, -1); ctx.lineTo(9, -1);
        ctx.lineTo(7, 6); ctx.lineTo(-7, 6);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Shirt strip
        ctx.fillStyle = shirt;
        ctx.fillRect(-3, -1, 6, 6);

        // Thin tie
        ctx.fillStyle = tieCol;
        ctx.strokeStyle = pal.suitDark;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-1.5, -1); ctx.lineTo(1.5, -1);
        ctx.lineTo(1.7, 6); ctx.lineTo(-1.7, 6);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Lapel pin
        ctx.fillStyle = pinCol;
        ctx.beginPath();
        ctx.arc(-4.5, 2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.fillStyle = skinShade;
        ctx.fillRect(-2.5, -3, 5, 3);

        // Head
        ctx.fillStyle = skin;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -9, 7, 7.5, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Eyes (right one smaller — monocle space for £/€)
        ctx.fillStyle = outline;
        ctx.beginPath();
        ctx.arc(-2.6, -9, 1.0, 0, Math.PI * 2);
        ctx.arc( 2.6, -9, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Moustache
        ctx.fillRect(-2.5, -6, 5, 1);

        // Mouth — pressed line
        ctx.strokeStyle = outline;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-1.8, -4); ctx.lineTo(1.8, -4);
        ctx.stroke();

        // Accessory — STRONG always, MEDIUM always (EU is more "proper" — always carries something)
        if (tier !== 'WEAK') {
            _drawAccessory(ctx, enemy, variant.acc, pal);
        }

        // Hat dispatch
        _drawHat(ctx, enemy, variant.hat, pal);
    }

    // ---------- ASIA: Ronin (pilot bust, mechanical samurai) ----------
    // Base kabuto + armor — helmet + accessory dispatched via CURRENCY_VARIANT (v7.9.4).
    function _drawRonin(ctx, enemy, tier) {
        const variant = _variant(enemy);
        const pal = _paletteFor(variant.palette, 'ASIA');
        const armor     = pal.suit;
        const armorDark = pal.suitDark;
        const armorEdge = pal.trim || '#c9a227';
        const jointCol  = '#a52234';
        const jointDark = '#5a1218';
        const skin      = '#b8906e';
        const outline   = '#050505';

        // Armor plate torso (cropped at y=+7)
        ctx.fillStyle = armor;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-12, -1); ctx.lineTo(12, -1);
        ctx.lineTo(13, 3); ctx.lineTo(11, 7);
        ctx.lineTo(-11, 7); ctx.lineTo(-13, 3);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Gold trim top edge
        ctx.strokeStyle = armorEdge;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-12, -1); ctx.lineTo(12, -1);
        ctx.stroke();

        // Central seam
        ctx.strokeStyle = armorDark;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, 7);
        ctx.stroke();

        // Shoulder pauldrons
        ctx.fillStyle = armorDark;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-15, -1); ctx.lineTo(-10, -3);
        ctx.lineTo(-9, 3); ctx.lineTo(-14, 4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(15, -1); ctx.lineTo(10, -3);
        ctx.lineTo(9, 3); ctx.lineTo(14, 4);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Red lacquer joint dots
        ctx.fillStyle = jointCol;
        ctx.strokeStyle = jointDark;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(-14, 1, 1.6, 0, Math.PI * 2);
        ctx.arc( 14, 1, 1.6, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Neck
        ctx.fillStyle = skin;
        ctx.fillRect(-2.5, -3, 5, 3);

        // Head
        ctx.fillStyle = skin;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -9, 6.5, 7, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Menpo (face guard)
        ctx.fillStyle = armorDark;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-6, -7); ctx.lineTo(6, -7);
        ctx.lineTo(5, -2); ctx.lineTo(-5, -2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = armorEdge;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-5, -4.5); ctx.lineTo(5, -4.5);
        ctx.stroke();

        // Red glowing eye slits (only visible bit of face)
        ctx.fillStyle = jointCol;
        ctx.fillRect(-4, -10, 2.5, 1.2);
        ctx.fillRect(1.5, -10, 2.5, 1.2);

        // Accessory — STRONG always, MEDIUM sometimes (saber/tanto/fan/scroll visible in hand-space)
        if (tier !== 'WEAK') {
            _drawAccessory(ctx, enemy, variant.acc, pal);
        }

        // Hat (kabuto) dispatch
        _drawHat(ctx, enemy, variant.hat, pal, tier);
    }

    // ================================================================
    // v7.9.4 — PRIMITIVE VOCABULARY
    // Hat / accessory / palette primitives consumed by pilot archetypes.
    // All coords relative to head at (0,-9), torso at (0,0..+6). Flip Y applied globally.
    // ================================================================

    /**
     * Lookup CURRENCY_VARIANT for the enemy's symbol
     * @param {Object} enemy
     * @returns {Object} { hat, acc, palette }
     */
    function _variant(enemy) {
        return (G.CURRENCY_VARIANT || {})[enemy.symbol] || { hat: 'tophat', acc: 'cigar', palette: 'forest' };
    }

    /**
     * Palette lookup: returns { suit, suitDark, tie?, tieDark?, trim? } for a named palette.
     * @param {string} name - Palette name
     * @param {string} region - Fallback region
     * @returns {Object}
     */
    function _paletteFor(name, region) {
        const palettes = {
            // USA
            forest:     { suit: '#1a3d2a', suitDark: '#0a1a10', tie: '#8f1e1e', tieDark: '#5a1010' },
            burgundy:   { suit: '#5a1a22', suitDark: '#2d0a11', tie: '#2a2f3a', tieDark: '#11141a' },
            tan:        { suit: '#7a5a3a', suitDark: '#3a2a18', tie: '#1f2a3a', tieDark: '#0e1420' },
            steelblue:  { suit: '#2a3a5a', suitDark: '#121a2e', tie: '#5a2a2a', tieDark: '#2a1010' },
            // EU
            charcoal:   { suit: '#3e4350', suitDark: '#252932', tie: '#1f3a5f' },
            navy:       { suit: '#1e2a52', suitDark: '#0a1024', tie: '#8f1e1e' },
            wine:       { suit: '#4a1a2e', suitDark: '#220a18', tie: '#c9a227' },
            olive:      { suit: '#4a4a22', suitDark: '#22220a', tie: '#c9a227' },
            // ASIA
            nightBlack: { suit: '#1a1a24', suitDark: '#0a0a10', trim: '#c9a227' },
            deepRed:    { suit: '#3a1218', suitDark: '#180609', trim: '#c9a227' },
            saffron:    { suit: '#a55a1a', suitDark: '#4a2508', trim: '#f2e7b8' },
            imperial:   { suit: '#2a1a4a', suitDark: '#120a22', trim: '#c9a227' }
        };
        const fallback = region === 'USA'  ? palettes.forest
                       : region === 'EU'   ? palettes.charcoal
                       : region === 'ASIA' ? palettes.nightBlack
                       : palettes.forest;
        return palettes[name] || fallback;
    }

    // ------- HAT PRIMITIVES -------
    // All hats sit on top of the head (centered at 0, -9). Coloring uses pal + enemy.color accent band.
    function _drawHat(ctx, enemy, name, pal, tier) {
        const outline = '#050505';
        const band = enemy.color;
        const black = '#0a0a0a';
        switch (name) {
            case 'tophat': {
                // Tall cylinder with colored band (USA $)
                ctx.fillStyle = black; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -16, 11.5, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillRect(-6.5, -24, 13, 9); ctx.strokeRect(-6.5, -24, 13, 9);
                ctx.fillStyle = band; ctx.fillRect(-6.5, -18, 13, 1.8);
                ctx.strokeStyle = outline; ctx.lineWidth = 0.4; ctx.strokeRect(-6.5, -18, 13, 1.8);
                break;
            }
            case 'stetson': {
                // Cowboy hat — curled brim + high crown (C$)
                ctx.fillStyle = '#4a2a12'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-13, -15); ctx.quadraticCurveTo(-11, -17, -7, -17);
                ctx.lineTo(7, -17); ctx.quadraticCurveTo(11, -17, 13, -15);
                ctx.quadraticCurveTo(10, -14, 0, -14); ctx.quadraticCurveTo(-10, -14, -13, -15);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Crown
                ctx.beginPath();
                ctx.moveTo(-6, -17); ctx.lineTo(-5, -23); ctx.quadraticCurveTo(0, -25, 5, -23);
                ctx.lineTo(6, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
                // Band
                ctx.fillStyle = band; ctx.fillRect(-5.5, -18, 11, 1.4);
                break;
            }
            case 'cowboy': {
                // Wider flat brim Ⓒ (cad stand-in) — lighter tone
                ctx.fillStyle = '#6a4a22'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -15.5, 13.5, 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-5, -17); ctx.lineTo(-4, -22); ctx.quadraticCurveTo(0, -24, 4, -22);
                ctx.lineTo(5, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = band; ctx.fillRect(-4.5, -18, 9, 1.2);
                break;
            }
            case 'ushanka': {
                // Russian fur hat ₽ — flaps + star on front
                ctx.fillStyle = '#3a2820'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                // Main dome
                ctx.beginPath(); ctx.ellipse(0, -16, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Side flaps
                ctx.beginPath();
                ctx.moveTo(-9, -15); ctx.lineTo(-11, -12); ctx.lineTo(-8, -11);
                ctx.moveTo( 9, -15); ctx.lineTo( 11, -12); ctx.lineTo( 8, -11);
                ctx.fill(); ctx.stroke();
                // Fur texture (lighter tufts)
                ctx.fillStyle = '#6a5040';
                for (let i = -7; i <= 7; i += 3) {
                    ctx.beginPath(); ctx.arc(i, -20, 1.4, 0, Math.PI * 2); ctx.fill();
                }
                // Red star emblem
                ctx.fillStyle = band;
                ctx.beginPath();
                ctx.arc(0, -16, 1.8, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'bowler': {
                // EU bowler hat (€ default)
                ctx.fillStyle = black; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -15.5, 9.5, 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, -16, 6.8, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = band; ctx.fillRect(-6.5, -16.5, 13, 1.4);
                break;
            }
            case 'topBrit': {
                // British top hat £ — shorter + more rounded than tophat
                ctx.fillStyle = black; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -15.5, 10.5, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillRect(-5.5, -22, 11, 7); ctx.strokeRect(-5.5, -22, 11, 7);
                ctx.fillStyle = band; ctx.fillRect(-5.5, -17.5, 11, 1.6);
                break;
            }
            case 'beret': {
                // French beret ₣ — round slanted disk with stem
                ctx.fillStyle = pal.suit === '#4a1a2e' ? '#7a2a3e' : '#3a1a22';
                ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -15.5, 9, 2.5, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Slanted top bulk
                ctx.beginPath();
                ctx.moveTo(-8, -15.5); ctx.quadraticCurveTo(-5, -19, 4, -20);
                ctx.quadraticCurveTo(8, -19, 8, -15.5);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Stem nub
                ctx.fillStyle = band;
                ctx.beginPath(); ctx.arc(4.5, -20, 0.9, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'fez': {
                // Turkish fez ₺ — red truncated cone with tassel
                ctx.fillStyle = '#a52234'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-6, -15); ctx.lineTo(-5, -23); ctx.lineTo(5, -23); ctx.lineTo(6, -15);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Top disc
                ctx.beginPath(); ctx.ellipse(0, -23, 5, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Tassel
                ctx.strokeStyle = band; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(3, -23); ctx.lineTo(6, -19); ctx.stroke();
                ctx.lineCap = 'butt';
                break;
            }
            case 'kabutoStd': {
                // Standard kabuto ¥ — helmet + horns (was original ASIA default)
                _kabutoBase(ctx, pal, band, outline, false);
                if (tier === 'STRONG') _kabutoCrest(ctx, pal, outline);
                break;
            }
            case 'kabutoWide': {
                // Wider kabuto ₩ — flatter brim, stout horns
                _kabutoBase(ctx, pal, band, outline, true);
                if (tier === 'STRONG') _kabutoCrest(ctx, pal, outline);
                break;
            }
            case 'kabutoDragon': {
                // Dragon crest kabuto 元 — always gets crest (chinese imperial vibe)
                _kabutoBase(ctx, pal, band, outline, false);
                // Dragon scales (3 bumps on crown)
                ctx.fillStyle = pal.trim || '#c9a227'; ctx.strokeStyle = outline; ctx.lineWidth = 0.4;
                for (const dx of [-3, 0, 3]) {
                    ctx.beginPath(); ctx.arc(dx, -22, 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                }
                break;
            }
            case 'turban': {
                // Indian turban ₹ — wrapped layers + central gem
                ctx.fillStyle = pal.suit || '#a55a1a'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                // Base wrap
                ctx.beginPath(); ctx.ellipse(0, -15, 9, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Mid wrap
                ctx.beginPath(); ctx.ellipse(0, -18, 8.5, 3, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Top wrap
                ctx.beginPath(); ctx.ellipse(0, -21, 7, 2.5, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Central gem (red)
                ctx.fillStyle = '#a52234'; ctx.strokeStyle = pal.trim || '#f2e7b8'; ctx.lineWidth = 0.6;
                ctx.beginPath(); ctx.arc(0, -18, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Accent feather
                ctx.strokeStyle = band; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(0, -21); ctx.quadraticCurveTo(4, -26, 6, -28); ctx.stroke();
                ctx.lineCap = 'butt';
                break;
            }
            default: {
                // Fallback tophat
                _drawHat(ctx, enemy, 'tophat', pal, tier);
            }
        }
    }

    function _kabutoBase(ctx, pal, band, outline, wide) {
        const w = wide ? 11 : 9;
        const brimW = wide ? 20 : 18;
        const brimX = wide ? -10 : -9;
        // Helmet body
        ctx.fillStyle = pal.suit; ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-w, -12); ctx.lineTo(-w + 1, -18);
        ctx.lineTo(0, -21); ctx.lineTo(w - 1, -18); ctx.lineTo(w, -12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Gold brim
        ctx.fillStyle = pal.trim || '#c9a227';
        ctx.fillRect(brimX, -13, brimW, 1.5);
        ctx.strokeStyle = outline; ctx.lineWidth = 0.4;
        ctx.strokeRect(brimX, -13, brimW, 1.5);
        // Horns (kuwagata, accent-tinted)
        ctx.strokeStyle = band; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, -18); ctx.quadraticCurveTo(-12, -22, -9, -27);
        ctx.moveTo( 6, -18); ctx.quadraticCurveTo( 12, -22,  9, -27);
        ctx.stroke();
        ctx.strokeStyle = outline; ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-6, -18); ctx.quadraticCurveTo(-12, -22, -9, -27);
        ctx.moveTo( 6, -18); ctx.quadraticCurveTo( 12, -22,  9, -27);
        ctx.stroke();
        ctx.lineCap = 'butt';
    }

    function _kabutoCrest(ctx, pal, outline) {
        // Gold kuwagata vertical crest (STRONG tier)
        ctx.fillStyle = pal.trim || '#c9a227'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -21); ctx.lineTo(-2, -26);
        ctx.lineTo(0, -29); ctx.lineTo(2, -26);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    // ------- ACCESSORY PRIMITIVES -------
    // Coords relative to head+torso. Accessories occupy mouth area, shoulder, or side pocket.
    function _drawAccessory(ctx, enemy, name, pal) {
        const outline = '#050505';
        switch (name) {
            case 'cigar': {
                // Brown tube + orange ember + smoke puff
                ctx.fillStyle = '#3d2815'; ctx.fillRect(2.2, -5.8, 7, 1.8);
                ctx.strokeStyle = '#1a0f05'; ctx.lineWidth = 0.5; ctx.strokeRect(2.2, -5.8, 7, 1.8);
                ctx.fillStyle = '#ff7a2e';
                ctx.beginPath(); ctx.arc(9.5, -4.9, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 0.22; ctx.fillStyle = '#cccccc';
                ctx.beginPath(); ctx.arc(11, -7.5, 2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
            case 'kerchief': {
                // Red bandana around neck (Canadian cowboy)
                ctx.fillStyle = '#a52234'; ctx.strokeStyle = '#5a1218'; ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(-5, -2); ctx.lineTo(5, -2);
                ctx.lineTo(6, 1); ctx.lineTo(0, 3); ctx.lineTo(-6, 1);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Knot dot
                ctx.fillStyle = '#7a1520';
                ctx.beginPath(); ctx.arc(0, 0, 0.9, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'cane': {
                // Diagonal dark cane with gold knob (in corner of frame)
                ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(10, -2); ctx.lineTo(14, 6);
                ctx.stroke();
                // Gold knob
                ctx.fillStyle = '#c9a227';
                ctx.beginPath(); ctx.arc(10, -2, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.lineCap = 'butt';
                break;
            }
            case 'monocle': {
                // Gold ring over right eye + short chain (also used by Oligarch ₽)
                ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 0.9;
                ctx.beginPath(); ctx.arc(2.8, -9, 2.4, 0, Math.PI * 2); ctx.stroke();
                ctx.lineWidth = 0.4;
                ctx.beginPath();
                ctx.moveTo(5.2, -8.5); ctx.quadraticCurveTo(6.5, -4, 4, -1); ctx.stroke();
                break;
            }
            case 'pipe': {
                // Brown pipe in mouth + small smoke curl
                ctx.fillStyle = '#3a2010'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
                // Bowl
                ctx.beginPath();
                ctx.moveTo(4, -5); ctx.lineTo(4, -7.5); ctx.lineTo(7, -7.5); ctx.lineTo(7.5, -4.5);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Stem
                ctx.fillRect(1.5, -5.4, 3, 1.2);
                // Smoke
                ctx.globalAlpha = 0.25; ctx.fillStyle = '#bbbbbb';
                ctx.beginPath(); ctx.arc(6, -10, 1.8, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(8, -12, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
            case 'newspaper': {
                // Folded paper under arm (rectangle with lines)
                ctx.fillStyle = '#e8ddc0'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
                ctx.fillRect(-13, 2, 5, 4); ctx.strokeRect(-13, 2, 5, 4);
                ctx.strokeStyle = '#4a4030'; ctx.lineWidth = 0.3;
                ctx.beginPath();
                ctx.moveTo(-12.5, 3.2); ctx.lineTo(-8.5, 3.2);
                ctx.moveTo(-12.5, 4.2); ctx.lineTo(-8.5, 4.2);
                ctx.moveTo(-12.5, 5.2); ctx.lineTo(-8.5, 5.2);
                ctx.stroke();
                break;
            }
            case 'baguette': {
                // Diagonal bread loaf crossing the shoulder
                ctx.fillStyle = '#c9954a'; ctx.strokeStyle = '#6a4a20'; ctx.lineWidth = 0.6;
                ctx.save();
                ctx.translate(7, -1); ctx.rotate(-0.5);
                ctx.fillRect(-7, -1.4, 14, 2.8);
                ctx.strokeRect(-7, -1.4, 14, 2.8);
                // Scoring lines
                ctx.strokeStyle = '#8a6030'; ctx.lineWidth = 0.4;
                for (const lx of [-4, -1, 2, 5]) {
                    ctx.beginPath(); ctx.moveTo(lx, -1); ctx.lineTo(lx + 0.8, 1); ctx.stroke();
                }
                ctx.restore();
                break;
            }
            case 'worrybeads': {
                // Tesbih — chain of small beads hanging from hand
                ctx.fillStyle = '#c9a227'; ctx.strokeStyle = outline; ctx.lineWidth = 0.3;
                for (let i = 0; i < 5; i++) {
                    const by = 1 + i * 1.3;
                    ctx.beginPath(); ctx.arc(11, by, 0.9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                }
                // Connecting line
                ctx.strokeStyle = '#8a6a18'; ctx.lineWidth = 0.4;
                ctx.beginPath(); ctx.moveTo(11, 0.5); ctx.lineTo(11, 7.5); ctx.stroke();
                break;
            }
            case 'tanto': {
                // Short dagger on hip (vertical)
                ctx.fillStyle = '#8a8a98'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(10, -3); ctx.lineTo(12, -3); ctx.lineTo(12, 3); ctx.lineTo(11, 4); ctx.lineTo(10, 3);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Hilt wrap
                ctx.fillStyle = '#1a1a24'; ctx.fillRect(9.5, -5, 3, 2);
                // Gold tsuba
                ctx.fillStyle = pal.trim || '#c9a227';
                ctx.fillRect(9, -3.3, 4, 0.7);
                break;
            }
            case 'fan': {
                // War fan (gunbai) — half-disc
                ctx.fillStyle = '#f2e7b8'; ctx.strokeStyle = outline; ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.arc(12, 1, 4, Math.PI * 0.3, Math.PI * 1.3, false);
                ctx.lineTo(11, 4);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Red center emblem
                ctx.fillStyle = '#a52234';
                ctx.beginPath(); ctx.arc(12.5, 1, 1.2, 0, Math.PI * 2); ctx.fill();
                // Handle
                ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(11, 4); ctx.lineTo(11.5, 7); ctx.stroke();
                break;
            }
            case 'saber': {
                // Curved tulwar blade across torso
                ctx.strokeStyle = '#c0c0cc'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-11, 5); ctx.quadraticCurveTo(0, -2, 12, 3);
                ctx.stroke();
                // Gold hilt
                ctx.fillStyle = pal.trim || '#c9a227';
                ctx.beginPath(); ctx.arc(-11, 5, 1.4, 0, Math.PI * 2); ctx.fill();
                ctx.lineCap = 'butt';
                break;
            }
            case 'scroll': {
                // Rolled scroll with red seal (chinese bureaucracy 元)
                ctx.fillStyle = '#e8ddc0'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
                // Roll body
                ctx.fillRect(-13, 1, 5, 3.5);
                ctx.strokeRect(-13, 1, 5, 3.5);
                // End caps (gold)
                ctx.fillStyle = pal.trim || '#c9a227';
                ctx.fillRect(-13.5, 0.5, 0.8, 4.5);
                ctx.fillRect(-8.2, 0.5, 0.8, 4.5);
                // Red seal dot
                ctx.fillStyle = '#a52234';
                ctx.beginPath(); ctx.arc(-10.5, 2.7, 0.9, 0, Math.PI * 2); ctx.fill();
                break;
            }
        }
    }

    // ---------- Chest Mark: currency symbol as emblem ----------
    // v7.9.3: tier-scaled size + STRONG-only gold glow for instant threat recognition.
    function _drawChestMark(ctx, enemy, region, tier) {
        const sym = enemy.symbol || '';
        if (!sym) return;

        const isStrong = tier === 'STRONG';
        // Tier size multiplier: WEAK 0.85 / MEDIUM 1.0 / STRONG 1.35 (STRONG glyph dominates the chest)
        const sizeMul = tier === 'WEAK' ? 0.85 : (isStrong ? 1.35 : 1.0);
        // v7.9.5: counter-flip only when global Y is flipped. When upright (hover-gate DWELL),
        // text is already oriented correctly — no counter-flip needed.
        const cfy = enemy._uprightFlip ? 1 : -1;

        if (region === 'EU') {
            const ringR = 3.2 * sizeMul;
            const fontPx = (5 * sizeMul).toFixed(2);
            // Monocle ring
            ctx.strokeStyle = '#c9a227';
            ctx.lineWidth = isStrong ? 1.2 : 0.9;
            ctx.beginPath();
            ctx.arc(2.6, -9, ringR, 0, Math.PI * 2);
            ctx.stroke();
            // Chain to collar
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(5.5, -8.5);
            ctx.quadraticCurveTo(7, -4, 4, 0);
            ctx.stroke();
            // Symbol (counter-flip so glyph reads upright despite global Y-flip)
            ctx.save();
            ctx.translate(2.6, -9);
            ctx.scale(1, cfy);
            ctx.font = `bold ${fontPx}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (isStrong) {
                // v7.13.0: additive glow via dual-draw (no shadowBlur)
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.font = `bold ${(parseFloat(fontPx) + 1.5).toFixed(2)}px Arial`;
                ctx.fillStyle = '#c9a227';
                ctx.fillText(sym, 0, 0);
                ctx.restore();
            }
            ctx.fillStyle = '#c9a227';
            ctx.fillText(sym, 0, 0);
            ctx.restore();
            return;
        }

        if (region === 'ASIA') {
            const discR = 3.8 * sizeMul;
            const fontPx = (6.5 * sizeMul).toFixed(2);
            // Mon — gold disc on breastplate
            ctx.fillStyle = '#c9a227';
            ctx.strokeStyle = '#050505';
            ctx.lineWidth = isStrong ? 1.1 : 0.8;
            ctx.beginPath();
            ctx.arc(0, 2.5, discR, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            // STRONG: gold halo around the mon
            if (isStrong) {
                ctx.strokeStyle = '#c9a227';
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(0, 2.5, discR + 1.6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            // Counter-flip text
            ctx.save();
            ctx.translate(0, 2.5);
            ctx.scale(1, cfy);
            ctx.font = `bold ${fontPx}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#050505';
            ctx.fillText(sym, 0, 0);
            ctx.restore();
            return;
        }

        // USA: pale-gold glyph stamped on the red tie
        const fontPx = (7 * sizeMul).toFixed(2);
        ctx.save();
        ctx.translate(0, 3.5);
        ctx.scale(1, cfy);
        ctx.font = `bold ${fontPx}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = isStrong ? 2.2 : 1.6;
        ctx.strokeStyle = '#050505';
        ctx.strokeText(sym, 0, 0);
        if (isStrong) {
            // v7.13.0: additive glow via dual-draw (no shadowBlur)
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.font = `bold ${(parseFloat(fontPx) + 2).toFixed(2)}px Arial`;
            ctx.fillStyle = '#f2e7b8';
            ctx.fillText(sym, 0, 0);
            ctx.restore();
        }
        ctx.fillStyle = '#f2e7b8';
        ctx.fillText(sym, 0, 0);
        ctx.restore();
    }

    // ================================================================
    // REGIONAL VEHICLES — contextualize pilots as airborne in space
    // Each vehicle draws BEFORE the pilot bust so the pilot sits inside.
    // thrusterPhase: 0/1 toggle for flame flicker.
    // Vehicle vertical footprint: approx y ∈ [+4 .. +22]. Hitbox unchanged.
    // ================================================================

    // USA — Stealth Wedge: delta-wing silhouette + twin orange thrusters.
    function _drawVehicleUSA(ctx, enemy, tier, thrusterPhase) {
        const hull     = '#1a1d24';
        const hullDark = '#0a0c12';
        const accent   = enemy.color;
        const outline  = '#050505';

        // Delta wing (trapezoidal, wider than pilot, wraps under torso)
        ctx.fillStyle = hull;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-19, 8);
        ctx.lineTo(19, 8);
        ctx.lineTo(14, 20);
        ctx.lineTo(-14, 20);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Accent stripe (currency color) across the leading edge
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(-19, 7.2, 38, 1.4);
        ctx.globalAlpha = 1;

        // Cockpit frame (where pilot torso meets hull)
        ctx.fillStyle = hullDark;
        ctx.fillRect(-10, 6.5, 20, 2);

        // Side panel lines (F-117 vibe)
        ctx.strokeStyle = hullDark;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-14, 12); ctx.lineTo(-6, 20);
        ctx.moveTo( 14, 12); ctx.lineTo( 6, 20);
        ctx.stroke();

        // Twin thrusters (orange flicker)
        const flameLen = thrusterPhase ? 6 : 4;
        const flameAlpha = thrusterPhase ? 0.95 : 0.75;
        // Nozzle housings
        ctx.fillStyle = hullDark;
        ctx.fillRect(-13, 19, 6, 3);
        ctx.fillRect(  7, 19, 6, 3);
        // Flames (additive-ish warm gradient via stacked rects)
        ctx.globalAlpha = flameAlpha;
        ctx.fillStyle = '#ff7a2e';
        ctx.fillRect(-12, 22, 4, flameLen);
        ctx.fillRect(  8, 22, 4, flameLen);
        ctx.fillStyle = '#ffd24a';
        ctx.fillRect(-11.5, 22, 3, flameLen - 2);
        ctx.fillRect(  8.5, 22, 3, flameLen - 2);
        ctx.globalAlpha = 1;
    }

    // EU — Diplomatic Shuttle: navy oval fuselage + portholes + tail fin + central flame.
    function _drawVehicleEU(ctx, enemy, tier, thrusterPhase) {
        const hull     = '#1a2a52';
        const hullDark = '#0a1428';
        const trim     = '#c9a227';
        const accent   = enemy.color;
        const outline  = '#050505';

        // Fuselage (oval)
        ctx.fillStyle = hull;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 13, 17, 8, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Belly accent stripe (currency color)
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-14, 16, 28, 1.4);
        ctx.globalAlpha = 1;

        // Cockpit frame band
        ctx.fillStyle = hullDark;
        ctx.fillRect(-10, 6.5, 20, 2);

        // Portholes (3 circular windows along the belly)
        ctx.fillStyle = '#4a7cc9';
        ctx.strokeStyle = trim;
        ctx.lineWidth = 0.5;
        for (const px of [-9, 0, 9]) {
            ctx.beginPath();
            ctx.arc(px, 13, 1.6, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }

        // Tail fin (gold, dorsal)
        ctx.fillStyle = trim;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-2, 6); ctx.lineTo(2, 6);
        ctx.lineTo(1, 10); ctx.lineTo(-1, 10);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Central blue-white flame
        const flameLen = thrusterPhase ? 7 : 5;
        const flameAlpha = thrusterPhase ? 0.95 : 0.8;
        ctx.fillStyle = hullDark;
        ctx.fillRect(-3, 20, 6, 2);
        ctx.globalAlpha = flameAlpha;
        ctx.fillStyle = '#5ab8ff';
        ctx.fillRect(-2.5, 21.5, 5, flameLen);
        ctx.fillStyle = '#e6f3ff';
        ctx.fillRect(-1.5, 21.5, 3, flameLen - 2);
        ctx.globalAlpha = 1;
    }

    // ASIA — Mech Quad-Drone: central cockpit + 4 red lacquer rotors in X.
    function _drawVehicleASIA(ctx, enemy, tier, thrusterPhase) {
        const hull      = '#1a1a24';
        const hullDark  = '#0a0a10';
        const trim      = '#c9a227';
        const rotorCol  = '#a52234';
        const rotorDark = '#5a1218';
        const accent    = enemy.color;
        const outline   = '#050505';

        // X-arm struts (behind rotors)
        ctx.strokeStyle = hullDark;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-15, 18); ctx.lineTo(-3, 9);
        ctx.moveTo( 15, 18); ctx.lineTo( 3, 9);
        ctx.moveTo(-15, 22); ctx.lineTo(-3, 13);
        ctx.moveTo( 15, 22); ctx.lineTo( 3, 13);
        ctx.stroke();
        ctx.lineCap = 'butt';

        // Central cockpit pod (circular)
        ctx.fillStyle = hull;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 13, 9, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Gold trim ring
        ctx.strokeStyle = trim;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, 13, 9, 0, Math.PI * 2);
        ctx.stroke();

        // Cockpit frame where pilot torso meets pod
        ctx.fillStyle = hullDark;
        ctx.fillRect(-10, 6.5, 20, 2);

        // Central red eye (sensor)
        ctx.fillStyle = rotorCol;
        ctx.beginPath();
        ctx.arc(0, 15, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 4 rotors at arm tips (red lacquer disks, motion blur via alpha toggle)
        const rotorAlpha = thrusterPhase ? 0.55 : 0.9;
        const rotorPositions = [[-15, 18], [15, 18], [-15, 22], [15, 22]];
        for (const [rx, ry] of rotorPositions) {
            // Hub
            ctx.fillStyle = hullDark;
            ctx.beginPath();
            ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
            ctx.fill();
            // Blurred blades (ellipse, alpha flicker)
            ctx.globalAlpha = rotorAlpha;
            ctx.fillStyle = rotorCol;
            ctx.beginPath();
            ctx.ellipse(rx, ry, 4, 1.2, thrusterPhase ? 0 : Math.PI / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = rotorDark;
            ctx.lineWidth = 0.4;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Currency accent dot on forehead of pod
        ctx.fillStyle = accent;
        ctx.fillRect(-1, 8.5, 2, 1.2);
    }

    // ================================================================
    // v7.19 ARCHETYPE AGENTS — non-currency entities of the fiat system
    // ================================================================
    // HFT_SWARMER ⚡ — sharp neon-cyan triangle, motion-trail
    // TAX_AUDITOR ⚖ — institutional grey-blue hexagonal seal
    // QE_NODE     💸 — green stationary printer with paper feed
    // ================================================================

    /**
     * HFT_SWARMER — sharp triangle silhouette, neon cyan, motion trail.
     * Drawn at (0,0) — caller has already translated to enemy center.
     * @private
     */
    function _drawHFT(ctx, enemy) {
        const color = enemy.color || '#00ffff';
        const dark = '#003355';
        const now = performance.now();
        const flicker = 0.85 + 0.15 * Math.sin((now + (enemy._walkOffset || 0)) * 0.025);

        // Motion trail — fading triangles behind direction of travel.
        // Travel direction: laterally per zigzag + downward descent.
        const t = enemy._archetypeTime || 0;
        const cfg = G.Balance?.ARCHETYPES?.HFT;
        const freq = cfg?.ZIGZAG_FREQ_HZ ?? 1.4;
        const trailDx = -Math.cos(t * freq * Math.PI * 2) * 6; // derivative direction
        ctx.save();
        for (let i = 1; i <= 3; i++) {
            ctx.globalAlpha = 0.18 / i;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(trailDx * i, -10 - i * 4);
            ctx.lineTo(trailDx * i - 8, 4 - i * 4);
            ctx.lineTo(trailDx * i + 8, 4 - i * 4);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Body — sharp arrowhead pointing DOWN (toward player).
        ctx.save();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(-12, -10);
        ctx.lineTo(0, -4);
        ctx.lineTo(12, -10);
        ctx.closePath();
        ctx.fill();

        // Neon glow rim
        ctx.globalAlpha = flicker;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner highlight stripe
        ctx.globalAlpha = flicker * 0.7;
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(-6, -4);
        ctx.lineTo(0, -2);
        ctx.lineTo(6, -4);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();

        // Lightning glyph at center
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', 0, 2);
        ctx.restore();

        // Hit flash overlay
        if (enemy.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, enemy.hitFlash);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, 16);
            ctx.lineTo(-12, -10);
            ctx.lineTo(12, -10);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * TAX_AUDITOR — hexagonal "official seal" silhouette, grey-blue institutional.
     * @private
     */
    function _drawAuditor(ctx, enemy) {
        const color = enemy.color || '#6e7c8a';
        const dark = '#2a3340';
        const accent = '#cfd6dd';
        const now = performance.now();

        // Outer authority ring — slow rotating, subtle
        const ringR = 22;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -now * 0.005;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Hexagonal seal body
        ctx.save();
        const rH = 16;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i + Math.PI / 6;
            const px = Math.cos(a) * rH;
            const py = Math.sin(a) * rH;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = dark;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();

        // Inner panel — slightly lighter
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i + Math.PI / 6;
            const px = Math.cos(a) * (rH - 4);
            const py = Math.sin(a) * (rH - 4);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.restore();

        // Scales / balance glyph at center
        ctx.save();
        ctx.fillStyle = accent;
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚖', 0, 1);
        ctx.restore();

        // FLEE phase — shake + warning red tint
        if (enemy._auditorPhase === 'FLEE') {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#ff3344';
            ctx.beginPath();
            ctx.arc(0, 0, ringR + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Hit flash overlay
        if (enemy.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, enemy.hitFlash);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, rH, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * QE_NODE — stationary money printer, green palette, paper feeding out.
     * @private
     */
    function _drawPrinter(ctx, enemy) {
        const color = enemy.color || '#3ddc84';
        const dark = '#0d3a20';
        const now = performance.now();
        const cfg = G.Balance?.ARCHETYPES?.PRINTER;

        // Printer body — wide rectangle
        const w = 36, h = 24;
        ctx.save();
        ctx.fillStyle = dark;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Top cap (paper input slot)
        ctx.fillStyle = color;
        ctx.fillRect(-w / 2 + 4, -h / 2 - 3, w - 8, 3);

        // Bottom slot (paper output)
        ctx.fillStyle = '#000000';
        ctx.fillRect(-w / 2 + 6, h / 2 - 2, w - 12, 2);

        // Status LEDs — pulse based on print timer proximity
        const interval = cfg?.PRINT_INTERVAL ?? 4.5;
        const t = enemy._printerTimer ?? interval;
        const charge = 1 - Math.max(0, Math.min(1, t / interval));   // 0 → idle, 1 → about to print
        const ledOn = Math.sin(now * 0.012) > 0;
        ctx.fillStyle = ledOn ? color : '#114b28';
        ctx.fillRect(-w / 2 + 4, -h / 2 + 4, 3, 3);
        ctx.fillStyle = charge > 0.7 ? '#ffaa00' : '#114b28';
        ctx.fillRect(-w / 2 + 10, -h / 2 + 4, 3, 3);
        ctx.fillStyle = charge > 0.95 ? '#ff3344' : '#114b28';
        ctx.fillRect(-w / 2 + 16, -h / 2 + 4, 3, 3);
        ctx.restore();

        // Animated paper sheet emerging from bottom slot
        const paperLen = 6 + (1 - Math.max(0, Math.min(1, t / interval))) * 14;
        ctx.save();
        ctx.fillStyle = '#f6f1e0';
        ctx.fillRect(-8, h / 2, 16, paperLen);
        ctx.strokeStyle = '#cdb86b';
        ctx.lineWidth = 0.8;
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(-6, h / 2 + i * 4);
            ctx.lineTo(6, h / 2 + i * 4);
            ctx.stroke();
        }
        // Currency mark on the paper
        ctx.fillStyle = '#3a8554';
        ctx.font = 'bold 8px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, h / 2 + 4);
        ctx.restore();

        // Glyph badge on center of body
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💸', 0, 0);
        ctx.restore();

        // Hit flash overlay
        if (enemy.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, enemy.hitFlash);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.restore();
        }
    }

    // ── Semi-Agent (Automated Turret) ───────────────────────
    // v7.20.4: Mid-tier between minion and WEAK agent. Vehicle with glowing
    // energy core instead of pilot bust, targeting laser reticle, holographic
    // currency symbol. Reads as "automated weapons platform" — a drone, not a
    // piloted craft. Scale 0.70 fills the visible gap between minion (0.55)
    // and WEAK agent (0.82).
    function drawSemiAgent(ctx, enemy, x, y) {
        const region = (G.CURRENCY_REGION || {})[enemy.symbol] || 'USA';
        const scale = 0.70;
        const now = performance.now();
        const thrusterPhase = (Math.floor((now + enemy._walkOffset) / 80)) & 1;

        // Core colors by region
        const coreColors = {
            'USA':  { primary: '#ff4422', glow: 'rgba(255,68,34,0.35)', ring: '#ff8844' },
            'EU':   { primary: '#22bbff', glow: 'rgba(34,187,255,0.35)', ring: '#66ddff' },
            'ASIA': { primary: '#cc44ff', glow: 'rgba(204,68,255,0.35)', ring: '#dd88ff' }
        };
        const cc = coreColors[region] || coreColors.USA;
        const laserPulse = Math.sin(now * 0.006) * 0.3 + 0.7;
        const corePulse = Math.sin(now * 0.005) * 0.12 + 0.88;

        // Vehicle (full detail, MEDIUM tier for richer coloring than minion WEAK)
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        if (!enemy._uprightFlip) ctx.scale(1, -1);
        if (region === 'EU') {
            _drawVehicleEU(ctx, enemy, 'MEDIUM', thrusterPhase);
        } else if (region === 'ASIA') {
            _drawVehicleASIA(ctx, enemy, 'MEDIUM', thrusterPhase);
        } else {
            _drawVehicleUSA(ctx, enemy, 'MEDIUM', thrusterPhase);
        }
        ctx.restore();

        // Energy core at vehicle center (world space)
        // Outer glow
        ctx.save();
        ctx.globalAlpha = 0.3 * corePulse;
        ctx.fillStyle = cc.glow;
        ctx.beginPath();
        ctx.arc(x, y, 13 * corePulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Inner core (bright, with shadow glow)
        ctx.fillStyle = cc.primary;
        ctx.shadowColor = cc.primary;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Core containment ring
        ctx.strokeStyle = cc.ring;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y, 8.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Targeting laser reticle (pulsing crosshair)
        ctx.strokeStyle = cc.primary;
        ctx.globalAlpha = 0.35 * laserPulse;
        ctx.lineWidth = 0.5;
        const rR = 17;
        ctx.beginPath();
        ctx.moveTo(x - rR, y); ctx.lineTo(x + rR, y);
        ctx.moveTo(x, y - rR); ctx.lineTo(x, y + rR);
        ctx.stroke();
        // Diagonal tick marks
        const dR = rR * 0.65;
        for (let a = 0; a < 4; a++) {
            const ang = a * Math.PI / 2 + Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(ang) * dR * 0.55, y + Math.sin(ang) * dR * 0.55);
            ctx.lineTo(x + Math.cos(ang) * dR, y + Math.sin(ang) * dR);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Holographic currency symbol floating above vehicle
        const symHover = Math.sin(now * 0.004) * 3;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = cc.ring;
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = cc.primary;
        ctx.shadowBlur = 8;
        ctx.fillText(enemy.symbol, x, y - 26 + symHover);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // ── Minion Agent ────────────────────────────────────────
    // v7.20.4: Minions now render as simplified regional vehicles (no pilot).
    // Creates a clear visual hierarchy: minion=drone vs. agent=full pilot+vehicle.
    function drawMinionAgent(ctx, enemy, x, y) {
        const region = (G.CURRENCY_REGION || {})[enemy.symbol] || 'USA';
        const scale = 0.55;
        const r = 22; // match previous minion body radius for glow

        // Flying animation — bob up and down
        const bobOffset = Math.sin(Date.now() * 0.005 + x * 0.1) * 5;
        y += bobOffset;

        // Danger glow
        const pulse = Math.sin(Date.now() * 0.01) * 0.15 + 1;
        ctx.fillStyle = enemy.color;
        ctx.globalAlpha = 0.3 * pulse;
        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Regional vehicle at reduced scale (no pilot bust, no hat/accessory)
        const thrusterPhase = (Math.floor((performance.now() + enemy._walkOffset) / 80)) & 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        // Flip for descent orientation (same as full agents)
        if (!enemy._uprightFlip) ctx.scale(1, -1);

        if (region === 'EU') {
            _drawVehicleEU(ctx, enemy, 'WEAK', thrusterPhase);
        } else if (region === 'ASIA') {
            _drawVehicleASIA(ctx, enemy, 'WEAK', thrusterPhase);
        } else {
            _drawVehicleUSA(ctx, enemy, 'WEAK', thrusterPhase);
        }
        ctx.restore();

        // Symbol marking on vehicle body (small, centered)
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.symbol, x, y + 2);
        ctx.globalAlpha = 1;

        // Wing-like sparkles on sides (flying money effect)
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.7;
        const wingAngle = Date.now() * 0.02;
        for (let i = -1; i <= 1; i += 2) {
            const wingX = x + i * (r + 4);
            const wingY = y + Math.sin(wingAngle + i) * 4;
            ctx.beginPath();
            ctx.moveTo(wingX, wingY - 6);
            ctx.lineTo(wingX + i * 8, wingY);
            ctx.lineTo(wingX, wingY + 6);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ── Export ──────────────────────────────────────────────
    G.EnemyAgentRenderer = {
        drawAgent: drawAgent,
        drawGlow: drawGlow,
        drawMinionAgent: drawMinionAgent,
        drawSemiAgent: drawSemiAgent
    };

})();
