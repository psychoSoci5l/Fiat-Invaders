/**
 * MessageSystem.js - Centralized message and popup display
 *
 * Handles: DOM popups (meme, powerup), canvas typed messages (info, danger, victory)
 * Extracted from main.js for modularity.
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // Screen dimensions (set via init)
    let gameWidth = 0;
    let gameHeight = 0;

    // Popup system (DOM-based)
    const MEME_COLORS = ['#00FFFF', '#FF00FF', '#00FF00', '#FFD700', '#FF6B6B', '#4ECDC4'];
    const POPUP_COOLDOWN = 600; // ms between popups
    const MSG_PRIORITY = { DANGER: 4, VICTORY: 3, POWERUP: 2, MEME: 1 };
    let memePopupTimer = null;
    let lastPopupTime = 0;
    let popupQueue = [];
    let currentPopupPriority = 0;

    // Typed messages (canvas-based)
    let gameInfoMessages = [];
    let dangerMessages = [];
    let victoryMessages = [];

    // Callbacks for effects
    let onShake = null;
    let onPlaySound = null;

    /**
     * Initialize message system
     */
    function init(width, height, callbacks = {}) {
        gameWidth = width;
        gameHeight = height;
        onShake = callbacks.onShake || null;
        onPlaySound = callbacks.onPlaySound || null;
        reset();
    }

    /**
     * Update dimensions (for resize)
     */
    function setDimensions(width, height) {
        gameWidth = width;
        gameHeight = height;
    }

    /**
     * Reset all message state
     */
    function reset() {
        popupQueue = [];
        currentPopupPriority = 0;
        lastPopupTime = 0;
        if (memePopupTimer) {
            clearTimeout(memePopupTimer);
            memePopupTimer = null;
        }
        gameInfoMessages = [];
        dangerMessages = [];
        victoryMessages = [];
    }

    /**
     * Check if popup can be shown based on priority and cooldown
     */
    function canShowPopup(priority) {
        const now = Date.now();
        if (priority > currentPopupPriority) return true;
        return (now - lastPopupTime) >= POPUP_COOLDOWN;
    }

    /**
     * Internal popup display function
     */
    function showPopupInternal(text, duration, color, fontSize, top, left, rotation, priority) {
        const el = document.getElementById('meme-popup');
        if (!el) return;

        if (!canShowPopup(priority)) {
            if (popupQueue.length < 2 && priority >= MSG_PRIORITY.POWERUP) {
                popupQueue.push({ text, duration, color, fontSize, top, left, rotation, priority });
            }
            return;
        }

        lastPopupTime = Date.now();
        currentPopupPriority = priority;

        el.textContent = text;
        el.style.color = color;
        el.style.fontSize = fontSize;
        el.style.transform = rotation;
        el.style.top = top;
        el.style.left = left;
        el.classList.add('show');

        clearTimeout(memePopupTimer);
        memePopupTimer = setTimeout(() => {
            el.classList.remove('show');
            el.style.transform = 'translate(-50%, -50%)';
            el.style.top = '50%';
            el.style.left = '50%';
            currentPopupPriority = 0;

            if (popupQueue.length > 0) {
                const next = popupQueue.shift();
                setTimeout(() => {
                    showPopupInternal(next.text, next.duration, next.color, next.fontSize, next.top, next.left, next.rotation, next.priority);
                }, 100);
            }
        }, duration);

        if (onPlaySound) onPlaySound('coinUI');
    }

    /**
     * Show meme popup with random styling
     */
    function showMemeFun(text, duration = 1500) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.MEME_POPUP) return;
        const color = MEME_COLORS[Math.floor(Math.random() * MEME_COLORS.length)];
        const fontSize = (24 + Math.random() * 12) + 'px';
        const rotation = `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 10}deg)`;
        const top = (30 + Math.random() * 40) + '%';
        const left = (30 + Math.random() * 40) + '%';
        showPopupInternal(text, duration, color, fontSize, top, left, rotation, MSG_PRIORITY.MEME);
    }

    /**
     * Show power-up notification
     */
    function showPowerUp(text) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.POWERUP_POPUP) return;
        showPopupInternal(text, 800, '#FFD700', '24px', '75%', '50%', 'translate(-50%, -50%)', MSG_PRIORITY.POWERUP);
    }

    /**
     * Show game info message (green, top area)
     */
    function showGameInfo(text) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.GAME_INFO) return;
        gameInfoMessages = [{ text, life: 2.0, maxLife: 2.0 }];
    }

    /**
     * Show danger message (red, center, pulsing)
     */
    function showDanger(text, shakeIntensity = 20) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.DANGER) return;
        dangerMessages = [{ text, life: 2.5, maxLife: 2.5 }];
        if (onShake && shakeIntensity > 0) onShake(shakeIntensity);
    }

    /**
     * Show victory message (gold, center)
     */
    function showVictory(text) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.VICTORY) return;
        victoryMessages = [{ text, life: 3.0, maxLife: 3.0 }];
    }

    /**
     * Alias for showMemeFun
     */
    function showMemePopup(text, duration = 1500) {
        showMemeFun(text, duration);
    }

    /**
     * Update typed messages (call in game loop)
     */
    function update(dt) {
        for (let i = gameInfoMessages.length - 1; i >= 0; i--) {
            gameInfoMessages[i].life -= dt;
            if (gameInfoMessages[i].life <= 0) gameInfoMessages.splice(i, 1);
        }
        for (let i = dangerMessages.length - 1; i >= 0; i--) {
            dangerMessages[i].life -= dt;
            if (dangerMessages[i].life <= 0) dangerMessages.splice(i, 1);
        }
        for (let i = victoryMessages.length - 1; i >= 0; i--) {
            victoryMessages[i].life -= dt;
            if (victoryMessages[i].life <= 0) victoryMessages.splice(i, 1);
        }
    }

    /**
     * Draw typed messages
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} totalTime - For animations
     */
    function draw(ctx, totalTime = 0) {
        // Defensive fallback if dimensions not set (prevents left-edge rendering)
        const w = gameWidth || 600;
        const h = gameHeight || 800;
        const cx = w / 2;

        // GAME_INFO: Top area, green box
        gameInfoMessages.forEach(m => {
            const alpha = Math.min(1, m.life * 2);
            const y = 130 - (1 - m.life / m.maxLife) * 20;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Dynamic font size: shrink for long texts to fit screen
            const maxBoxWidth = w - 40; // 20px padding each side
            let fontSize = 24;
            ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
            let textWidth = ctx.measureText(m.text).width || 200;

            // Shrink font if text too wide
            while (textWidth + 40 > maxBoxWidth && fontSize > 12) {
                fontSize -= 2;
                ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
                textWidth = ctx.measureText(m.text).width;
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Clamp box width to screen bounds
            const boxWidth = Math.min(textWidth + 40, maxBoxWidth);
            const boxHeight = fontSize + 12;

            ctx.fillStyle = 'rgba(0, 50, 0, 0.8)';
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.fillRect(cx - boxWidth/2, y - boxHeight/2, boxWidth, boxHeight);
            ctx.strokeRect(cx - boxWidth/2, y - boxHeight/2, boxWidth, boxHeight);

            ctx.fillStyle = '#00FF00';
            ctx.fillText(m.text, cx, y);
            ctx.restore();
        });

        // DANGER: Center, red pulsing
        dangerMessages.forEach(m => {
            const alpha = Math.min(1, m.life);
            const pulse = Math.sin(totalTime * 10) * 0.3 + 0.7;
            const y = h / 2 - 30;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Dynamic font size for long texts
            const maxBoxWidth = w - 40;
            let fontSize = 28;
            ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
            let textWidth = ctx.measureText(m.text).width || 300;

            while (textWidth + 60 > maxBoxWidth && fontSize > 14) {
                fontSize -= 2;
                ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
                textWidth = ctx.measureText(m.text).width;
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const boxWidth = Math.min(textWidth + 60, maxBoxWidth);
            const boxHeight = fontSize + 22;

            ctx.fillStyle = `rgba(80, 0, 0, ${0.9 * pulse})`;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 4 + pulse * 2;
            ctx.fillRect(cx - boxWidth/2, y - boxHeight/2, boxWidth, boxHeight);
            ctx.strokeRect(cx - boxWidth/2, y - boxHeight/2, boxWidth, boxHeight);

            ctx.fillStyle = '#FF4444';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 15;
            ctx.fillText(m.text, cx, y);
            ctx.restore();
        });

        // VICTORY: Center, gold with glow
        victoryMessages.forEach(m => {
            const alpha = Math.min(1, m.life);
            const scale = 1 + Math.sin(totalTime * 5) * 0.05;
            const y = h / 2;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Dynamic font size for long texts
            const maxBoxWidth = w - 40;
            let fontSize = 32;
            ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
            let textWidth = ctx.measureText(m.text).width || 300;

            while (textWidth + 60 > maxBoxWidth && fontSize > 16) {
                fontSize -= 2;
                ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
                textWidth = ctx.measureText(m.text).width;
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const boxWidth = Math.min(textWidth + 60, maxBoxWidth);
            const boxHeight = fontSize + 28;

            ctx.translate(cx, y);
            ctx.scale(scale, scale);

            ctx.fillStyle = 'rgba(50, 40, 0, 0.9)';
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.fillRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight);
            ctx.strokeRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight);

            ctx.fillStyle = '#FFD700';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20;
            ctx.fillText(m.text, 0, 0);
            ctx.restore();
        });
    }

    /**
     * Check if any messages are active
     */
    function hasActiveMessages() {
        return gameInfoMessages.length > 0 || dangerMessages.length > 0 || victoryMessages.length > 0;
    }

    // Export to namespace
    G.MessageSystem = {
        init,
        setDimensions,
        reset,
        update,
        draw,
        // Popup functions
        showMemeFun,
        showPowerUp,
        showMemePopup,
        // Typed message functions
        showGameInfo,
        showDanger,
        showVictory,
        // State
        hasActiveMessages
    };
})();
