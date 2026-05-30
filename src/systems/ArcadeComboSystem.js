/**
 * ArcadeComboSystem — Isolato da main.js v7.39.4
 * Gestisce combo counter, timer decay, graze extend, HUD.
 * Depende da G.RunState e G.Balance.ARCADE.COMBO.
 */
(function() {
    'use strict';

    const G = window.Game;
    if (!G) return;

    function getCfg() {
        return G.Balance && G.Balance.ARCADE && G.Balance.ARCADE.COMBO;
    }

    const ArcadeComboSystem = {
        onEnemyKilled() {
            const cfg = getCfg();
            if (!cfg) return;
            const rs = G.RunState;
            rs.comboCount++;
            rs.comboTimer = cfg.TIMEOUT;
            rs.comboDecayAnim = 0;
            rs.comboMult = Math.min(cfg.MULT_CAP, 1.0 + rs.comboCount * cfg.MULT_PER_COMBO);
            if (rs.comboCount > rs.bestCombo) {
                rs.bestCombo = rs.comboCount;
            }
        },

        onGraze() {
            const cfg = getCfg();
            if (!cfg) return;
            const rs = G.RunState;
            if (rs.comboTimer > 0) {
                rs.comboTimer += cfg.GRAZE_EXTEND;
            }
        },

        onDeath() {
            const rs = G.RunState;
            rs.comboCount = 0;
            rs.comboTimer = 0;
            rs.comboMult = 1.0;
            rs.comboDecayAnim = 0;
        },

        update(dt) {
            const cfg = getCfg();
            if (!cfg) return;
            const rs = G.RunState;

            if (rs.comboTimer > 0) {
                rs.comboTimer -= dt;
                if (rs.comboTimer <= 0) {
                    rs.comboTimer = 0;
                    if (rs.comboCount > 0) {
                        rs.comboDecayAnim = cfg.DECAY_ANIM;
                        rs.comboCount = 0;
                        rs.comboMult = 1.0;
                    }
                }
            }

            if (rs.comboDecayAnim > 0) {
                rs.comboDecayAnim -= dt;
                if (rs.comboDecayAnim < 0) rs.comboDecayAnim = 0;
            }
        },

        drawHUD(ctx) {
            const cfg = getCfg();
            if (!cfg || !ctx) return null;
            const rs = G.RunState;
            const combo = rs.comboCount;
            const decayAnim = rs.comboDecayAnim;
            if (combo <= 0 && decayAnim <= 0) return null;

            ctx.save();
            const colors = cfg.COLORS;

            let alpha = 1;
            let displayCombo = combo;
            if (combo <= 0 && decayAnim > 0) {
                alpha = decayAnim / cfg.DECAY_ANIM;
                displayCombo = rs.bestCombo;
            }

            let color;
            if (displayCombo >= colors.ORANGE) color = '#ff3333';
            else if (displayCombo >= colors.YELLOW) color = '#ff8800';
            else if (displayCombo >= colors.WHITE) color = '#ffcc00';
            else color = '#ffffff';

            // Position: right side, below score
            const gameWidth = window.gameWidth || (ctx.canvas ? ctx.canvas.width : 800);
            const x = gameWidth - 12;
            const y = (window.G && window.G._safeTop) || 0 + 12;

            const totalTime = rs.totalTime || 0;
            const pulse = combo > 0 ? 1 + Math.sin(totalTime * 10) * 0.04 * Math.min(combo / 20, 1) : 1;
            const fontSize = Math.min(22, 14 + displayCombo * 0.1);

            ctx.globalAlpha = alpha;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.font = G.ColorUtils ? G.ColorUtils.font('bold', Math.round(fontSize * pulse), '"Courier New", monospace') : `bold ${Math.round(fontSize * pulse)}px "Courier New", monospace`;
            ctx.fillStyle = color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            const text = '×' + displayCombo;
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);

            if (displayCombo >= 5) {
                ctx.font = G.ColorUtils ? G.ColorUtils.font('bold', 9, '"Courier New", monospace') : `bold 9px "Courier New", monospace`;
                ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.6) + ')';
                ctx.fillText('COMBO', x, y + fontSize * pulse + 2);
            }

            ctx.restore();

            return { displayCombo, alpha, color, fontSize, pulse };
        }
    };

    G.ArcadeComboSystem = ArcadeComboSystem;
})();
