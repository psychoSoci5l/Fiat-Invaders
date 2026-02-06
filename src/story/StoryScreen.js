/**
 * StoryScreen.js - Full-screen narrative display
 *
 * Canvas-based story screens with:
 * - Fade in/out transitions
 * - Typewriter text effect
 * - Animated star background
 * - Tap/click to continue
 * - Multi-paragraph support
 */
(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // Config
    const CONFIG = {
        TYPEWRITER_SPEED: 35,       // ms per character
        FADE_DURATION: 0.8,         // seconds
        PARAGRAPH_DELAY: 0.5,       // seconds between paragraphs
        STAR_COUNT: 60,             // background stars
        HINT_BLINK_SPEED: 1.5,      // blinks per second
        FONT_SIZE_PERIOD: 18,
        FONT_SIZE_TITLE: 28,
        FONT_SIZE_TEXT: 16,
        FONT_SIZE_HINT: 12,
        LINE_HEIGHT: 1.5,
        MAX_WIDTH_RATIO: 0.88,      // max text width as ratio of screen
        PADDING_TOP: 80,
        COLOR_PERIOD: '#FFD700',    // Gold
        COLOR_TITLE: '#FFFFFF',
        COLOR_TEXT: '#E0E0E0',
        COLOR_HINT: '#888888',
        COLOR_BG: '#0a0a12'
    };

    // State
    let isActive = false;
    let currentStory = null;
    let currentLang = 'EN';
    let onCompleteCallback = null;

    // Animation state
    let fadeAlpha = 0;
    let fadeDir = 0;            // 0=none, 1=fading in, -1=fading out
    let typewriterIndex = 0;
    let currentParagraphIndex = 0;
    let displayedText = [];     // Array of completed paragraphs
    let currentTypingText = ''; // Currently typing paragraph
    let typewriterTimer = 0;
    let readyForInput = false;
    let hintBlinkTimer = 0;
    let exitRequested = false;

    // Background stars
    let stars = [];

    // Canvas dimensions
    let canvasWidth = 0;
    let canvasHeight = 0;

    /**
     * Initialize stars for background
     */
    function initStars() {
        stars = [];
        for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                size: 1 + Math.random() * 2,
                speed: 0.2 + Math.random() * 0.5,
                brightness: 0.3 + Math.random() * 0.7,
                twinkleSpeed: 1 + Math.random() * 2,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }

    /**
     * Get localized text from story content
     */
    function getLocalizedText(textObj) {
        if (!textObj) return '';
        if (typeof textObj === 'string') return textObj;
        return textObj[currentLang] || textObj['EN'] || '';
    }

    /**
     * Get all paragraphs for current story
     */
    function getParagraphs() {
        if (!currentStory || !currentStory.paragraphs) return [];
        const paras = currentStory.paragraphs[currentLang] || currentStory.paragraphs['EN'] || [];
        return Array.isArray(paras) ? paras : [];
    }

    /**
     * Show a story screen
     * @param {string} storyId - ID from STORY_CONTENT (e.g., 'PROLOGUE', 'CHAPTER_1')
     * @param {Function} onComplete - Callback when player dismisses the story
     */
    function show(storyId, onComplete) {
        const storyContent = G.STORY_CONTENT && G.STORY_CONTENT[storyId];
        if (!storyContent) {
            console.warn('[StoryScreen] Story not found:', storyId);
            if (onComplete) onComplete();
            return;
        }

        // Detect language from game state (v4.11.0: was reading localStorage which may be unset)
        currentLang = G._currentLang || localStorage.getItem('fiat_lang') || 'EN';

        currentStory = storyContent;
        onCompleteCallback = onComplete;
        isActive = true;

        // Reset animation state
        fadeAlpha = 0;
        fadeDir = 1; // Fade in
        typewriterIndex = 0;
        currentParagraphIndex = 0;
        displayedText = [];
        currentTypingText = '';
        typewriterTimer = 0;
        readyForInput = false;
        hintBlinkTimer = 0;
        exitRequested = false;

        // Init stars with current dimensions
        initStars();

        // Emit event
        if (G.Events) {
            G.Events.emit('story:show', { storyId: storyId });
        }
    }

    /**
     * Hide story screen (with fade out)
     */
    function hide() {
        if (!isActive) return;
        exitRequested = true;
        fadeDir = -1; // Start fade out
    }

    /**
     * Immediate hide without fade
     */
    function forceHide() {
        isActive = false;
        currentStory = null;
        fadeAlpha = 0;
        fadeDir = 0;

        if (onCompleteCallback) {
            const cb = onCompleteCallback;
            onCompleteCallback = null;
            cb();
        }
    }

    /**
     * Handle tap/click input
     */
    function handleTap() {
        if (!isActive || fadeDir !== 0) return;

        // If still typing, complete current paragraph instantly
        if (!readyForInput) {
            const paragraphs = getParagraphs();
            if (currentParagraphIndex < paragraphs.length) {
                // Complete current paragraph
                currentTypingText = paragraphs[currentParagraphIndex];
                typewriterIndex = currentTypingText.length;
            }
            return;
        }

        // Ready for input - advance or exit
        hide();
    }

    /**
     * Update animation state
     * @param {number} dt - Delta time in seconds
     */
    function update(dt) {
        if (!isActive) return;

        // Update fade
        if (fadeDir !== 0) {
            const fadeSpeed = 1 / CONFIG.FADE_DURATION;
            fadeAlpha += fadeDir * fadeSpeed * dt;

            if (fadeDir === 1 && fadeAlpha >= 1) {
                fadeAlpha = 1;
                fadeDir = 0;
            } else if (fadeDir === -1 && fadeAlpha <= 0) {
                fadeAlpha = 0;
                fadeDir = 0;
                if (exitRequested) {
                    forceHide();
                    return;
                }
            }
        }

        // Don't update typewriter during fade
        if (fadeDir !== 0) return;

        // Update typewriter effect
        const paragraphs = getParagraphs();
        if (currentParagraphIndex < paragraphs.length) {
            typewriterTimer += dt * 1000; // Convert to ms

            while (typewriterTimer >= CONFIG.TYPEWRITER_SPEED &&
                   typewriterIndex < paragraphs[currentParagraphIndex].length) {
                typewriterTimer -= CONFIG.TYPEWRITER_SPEED;
                typewriterIndex++;
                currentTypingText = paragraphs[currentParagraphIndex].substring(0, typewriterIndex);

                // Play subtle tick sound occasionally
                if (typewriterIndex % 5 === 0 && G.Audio && G.Audio.playUITick) {
                    // Optional: subtle typing sound
                }
            }

            // Paragraph complete
            if (typewriterIndex >= paragraphs[currentParagraphIndex].length) {
                displayedText.push(paragraphs[currentParagraphIndex]);
                currentParagraphIndex++;
                typewriterIndex = 0;
                currentTypingText = '';

                // Small delay before next paragraph
                if (currentParagraphIndex < paragraphs.length) {
                    typewriterTimer = -CONFIG.PARAGRAPH_DELAY * 1000;
                }
            }
        } else {
            // All paragraphs complete
            readyForInput = true;
        }

        // Update hint blink
        hintBlinkTimer += dt * CONFIG.HINT_BLINK_SPEED * Math.PI * 2;

        // Update stars
        for (const star of stars) {
            star.y += star.speed * dt * 20;
            if (star.y > canvasHeight) {
                star.y = 0;
                star.x = Math.random() * canvasWidth;
            }
            star.twinklePhase += star.twinkleSpeed * dt;
        }
    }

    /**
     * Draw story screen
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    function draw(ctx, width, height) {
        if (!isActive || !currentStory) return;

        // Update dimensions
        canvasWidth = width;
        canvasHeight = height;

        // Apply fade
        ctx.save();
        ctx.globalAlpha = fadeAlpha;

        // Draw background
        ctx.fillStyle = CONFIG.COLOR_BG;
        ctx.fillRect(0, 0, width, height);

        // Draw stars
        for (const star of stars) {
            const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
            const alpha = star.brightness * twinkle;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Calculate text area
        const maxWidth = width * CONFIG.MAX_WIDTH_RATIO;
        const centerX = width / 2;
        let y = CONFIG.PADDING_TOP;

        // Draw period (year)
        const period = currentStory.period || '';
        const periodSuffix = getLocalizedText(currentStory.periodSuffix);
        const periodText = periodSuffix ? `${period}${periodSuffix}` : period;

        if (periodText) {
            ctx.font = `bold ${CONFIG.FONT_SIZE_PERIOD}px monospace`;
            ctx.fillStyle = CONFIG.COLOR_PERIOD;
            ctx.textAlign = 'center';
            ctx.fillText(periodText, centerX, y);
            y += CONFIG.FONT_SIZE_PERIOD * 1.8;
        }

        // Draw title
        const title = getLocalizedText(currentStory.title);
        if (title) {
            ctx.font = `bold ${CONFIG.FONT_SIZE_TITLE}px monospace`;
            ctx.fillStyle = CONFIG.COLOR_TITLE;
            ctx.textAlign = 'center';
            ctx.fillText(title, centerX, y, maxWidth);
            y += CONFIG.FONT_SIZE_TITLE * 2;
        }

        // Draw paragraphs
        ctx.font = `${CONFIG.FONT_SIZE_TEXT}px monospace`;
        ctx.fillStyle = CONFIG.COLOR_TEXT;
        ctx.textAlign = 'center';
        const lineHeight = CONFIG.FONT_SIZE_TEXT * CONFIG.LINE_HEIGHT;

        // Draw completed paragraphs
        for (const para of displayedText) {
            y = drawWrappedText(ctx, para, centerX, y, maxWidth, lineHeight);
            y += lineHeight * 0.8; // Extra space between paragraphs
        }

        // Draw currently typing paragraph
        if (currentTypingText) {
            y = drawWrappedText(ctx, currentTypingText + '_', centerX, y, maxWidth, lineHeight);
        }

        // Draw "tap to continue" hint
        if (readyForInput) {
            const hintAlpha = 0.5 + 0.5 * Math.sin(hintBlinkTimer);
            ctx.globalAlpha = fadeAlpha * hintAlpha;
            ctx.font = `${CONFIG.FONT_SIZE_HINT}px monospace`;
            ctx.fillStyle = CONFIG.COLOR_HINT;
            ctx.textAlign = 'center';

            const hintText = currentLang === 'IT' ? '[ TOCCA PER CONTINUARE ]' : '[ TAP TO CONTINUE ]';
            ctx.fillText(hintText, centerX, height - 50);
        }

        ctx.restore();
    }

    /**
     * Draw text with word wrapping
     * @returns {number} - Y position after text
     */
    function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line.trim(), x, currentY);
                line = words[i] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, currentY);
        return currentY + lineHeight;
    }

    /**
     * Check if story screen is active
     */
    function isShowing() {
        return isActive;
    }

    /**
     * Set language
     */
    function setLanguage(lang) {
        currentLang = lang;
    }

    /**
     * Set canvas dimensions (call on resize)
     */
    function setDimensions(width, height) {
        canvasWidth = width;
        canvasHeight = height;
        if (isActive) {
            initStars();
        }
    }

    // Export to namespace
    G.StoryScreen = {
        show,
        hide,
        forceHide,
        handleTap,
        update,
        draw,
        isShowing,
        setLanguage,
        setDimensions
    };
})();
