/**
 * StoryScreen.js - Full-screen narrative display
 *
 * Canvas-based story screens with:
 * - Fade in/out transitions
 * - Typewriter text effect
 * - Per-paragraph fade-in animation
 * - Gradient background with vignette
 * - Animated star background with glow
 * - Keyword highlighting (gold/amber)
 * - Tap/click to continue
 * - Multi-paragraph support
 */
(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    const CONFIG = {
        TYPEWRITER_SPEED: 35,
        FADE_DURATION: 0.8,
        PARAGRAPH_DELAY: 0.5,
        PARA_FADE_SPEED: 2.0,
        STAR_COUNT: 80,
        HINT_BLINK_SPEED: 1.5,
        FONT_SIZE_PERIOD: 18,
        FONT_SIZE_TITLE: 26,
        FONT_SIZE_TEXT: 15,
        FONT_SIZE_HINT: 12,
        LINE_HEIGHT: 1.5,
        PARAGRAPH_GAP: 0.5,
        MAX_WIDTH_RATIO: 0.88,
        PADDING_TOP: 55,
        COLOR_PERIOD: '#bb44ff',
        COLOR_TITLE: '#FFFFFF',
        COLOR_TEXT: '#CCCCCC',
        COLOR_HINT: '#888888',
        COLOR_HIGHLIGHT: '#bb44ff',
        COLOR_HIGHLIGHT_NUM: '#cc66ff',
        BG_GRADIENT_TOP: '#0d0d1f',
        BG_GRADIENT_MID: '#080812',
        BG_GRADIENT_BOTTOM: '#030308',
        VIGNETTE_STRENGTH: 0.35,
        STAR_GLOW_ALPHA: 0.12,
        SEPARATOR_WIDTH: 60
    };

    // Keywords highlighted in gold (case-insensitive, word-boundary)
    const HIGHLIGHT_KEYWORDS = [
        'bitcoin', 'fiat', 'satoshi nakamoto', 'nixon',
        'peer-to-peer', 'honest money', 'denaro onesto',
        'nessuno comanda', 'tutti verificano',
        'no one commands', 'everyone verifies',
        'vittoria', 'victory',
        'nuovo sfidante', 'new challenger',
        'frontiera digitale', 'digital frontier'
    ];

    // State
    let isActive = false;
    let currentStory = null;
    let currentLang = 'EN';
    let onCompleteCallback = null;

    let fadeAlpha = 0;
    let fadeDir = 0;
    let typewriterIndex = 0;
    let currentParagraphIndex = 0;
    let displayedText = [];
    let currentTypingText = '';
    let typewriterTimer = 0;
    let readyForInput = false;
    let hintBlinkTimer = 0;
    let exitRequested = false;

    // Per-paragraph fade
    let paraAlphas = [];
    let typingParaAlpha = 0;

    let stars = [];
    let canvasWidth = 0;
    let canvasHeight = 0;

    function initStars() {
        stars = [];
        for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                size: 0.8 + Math.random() * 1.8,
                speed: 0.1 + Math.random() * 0.4,
                brightness: 0.3 + Math.random() * 0.7,
                twinkleSpeed: 0.8 + Math.random() * 2,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }

    function getLocalizedText(textObj) {
        if (!textObj) return '';
        if (typeof textObj === 'string') return textObj;
        return textObj[currentLang] || textObj['EN'] || '';
    }

    function getParagraphs() {
        if (!currentStory || !currentStory.paragraphs) return [];
        const paras = currentStory.paragraphs[currentLang] || currentStory.paragraphs['EN'] || [];
        return Array.isArray(paras) ? paras : [];
    }

    // --- Highlight system ---

    function getHighlightSegments(line) {
        const ranges = [];
        const lowerLine = line.toLowerCase();

        // Keyword matches
        for (const kw of HIGHLIGHT_KEYWORDS) {
            let idx = lowerLine.indexOf(kw);
            while (idx !== -1) {
                const before = idx > 0 ? lowerLine[idx - 1] : ' ';
                const after = idx + kw.length < lowerLine.length ? lowerLine[idx + kw.length] : ' ';
                if (!/[a-zà-ú]/.test(before) && !/[a-zà-ú]/.test(after)) {
                    ranges.push({ start: idx, end: idx + kw.length, color: CONFIG.COLOR_HIGHLIGHT });
                }
                idx = lowerLine.indexOf(kw, idx + 1);
            }
        }

        // Percentages (e.g. 3000%)
        const pctRe = /\d[\d,.]*%/g;
        let m;
        while ((m = pctRe.exec(line)) !== null) {
            ranges.push({ start: m.index, end: m.index + m[0].length, color: CONFIG.COLOR_HIGHLIGHT_NUM });
        }

        // Years (1900-2099)
        const yearRe = /\b(19|20)\d{2}\b/g;
        while ((m = yearRe.exec(line)) !== null) {
            ranges.push({ start: m.index, end: m.index + m[0].length, color: CONFIG.COLOR_HIGHLIGHT_NUM });
        }

        if (ranges.length === 0) {
            return [{ text: line, color: CONFIG.COLOR_TEXT }];
        }

        // Sort and build non-overlapping segments
        ranges.sort((a, b) => a.start - b.start);
        const segments = [];
        let pos = 0;

        for (const r of ranges) {
            if (r.start < pos) continue;
            if (r.start > pos) {
                segments.push({ text: line.substring(pos, r.start), color: CONFIG.COLOR_TEXT });
            }
            segments.push({ text: line.substring(r.start, r.end), color: r.color });
            pos = r.end;
        }

        if (pos < line.length) {
            segments.push({ text: line.substring(pos), color: CONFIG.COLOR_TEXT });
        }

        return segments;
    }

    // --- Text layout helpers ---

    function getWrappedLines(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let line = '';

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            if (ctx.measureText(testLine).width > maxWidth && i > 0) {
                lines.push(line.trim());
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        if (line.trim()) lines.push(line.trim());
        return lines;
    }

    function drawSegmentedLine(ctx, segments, centerX, y) {
        let totalWidth = 0;
        for (const seg of segments) {
            totalWidth += ctx.measureText(seg.text).width;
        }

        ctx.textAlign = 'left';
        let x = centerX - totalWidth / 2;

        for (const seg of segments) {
            ctx.fillStyle = seg.color;
            ctx.fillText(seg.text, x, y);
            x += ctx.measureText(seg.text).width;
        }
    }

    // --- Public API ---

    function show(storyId, onComplete) {
        const storyContent = G.STORY_CONTENT && G.STORY_CONTENT[storyId];
        if (!storyContent) {
            console.warn('[StoryScreen] Story not found:', storyId);
            if (onComplete) onComplete();
            return;
        }

        currentLang = G._currentLang || localStorage.getItem('fiat_lang') || 'EN';
        currentStory = storyContent;
        onCompleteCallback = onComplete;
        isActive = true;

        fadeAlpha = 0;
        fadeDir = 1;
        typewriterIndex = 0;
        currentParagraphIndex = 0;
        displayedText = [];
        currentTypingText = '';
        typewriterTimer = 0;
        readyForInput = false;
        hintBlinkTimer = 0;
        exitRequested = false;
        paraAlphas = [];
        typingParaAlpha = 0;

        if (G.StoryBackgrounds && G.StoryBackgrounds.isEnabled()) {
            G.StoryBackgrounds.init(storyId, canvasWidth, canvasHeight);
        } else {
            initStars();
        }

        if (G.Events) {
            G.Events.emit('story:show', { storyId: storyId });
        }
    }

    function hide() {
        if (!isActive) return;
        exitRequested = true;
        fadeDir = -1;
    }

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

    function handleTap() {
        if (!isActive || fadeDir !== 0) return;

        if (!readyForInput) {
            const paragraphs = getParagraphs();
            if (currentParagraphIndex < paragraphs.length) {
                currentTypingText = paragraphs[currentParagraphIndex];
                typewriterIndex = currentTypingText.length;
            }
            return;
        }

        hide();
    }

    function update(dt) {
        if (!isActive) return;

        // Fade
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

        if (fadeDir !== 0) return;

        // Typewriter
        const paragraphs = getParagraphs();
        if (currentParagraphIndex < paragraphs.length) {
            // Fade in current paragraph
            if (typingParaAlpha < 1) {
                typingParaAlpha = Math.min(1, typingParaAlpha + dt * CONFIG.PARA_FADE_SPEED);
            }

            typewriterTimer += dt * 1000;

            while (typewriterTimer >= CONFIG.TYPEWRITER_SPEED &&
                   typewriterIndex < paragraphs[currentParagraphIndex].length) {
                typewriterTimer -= CONFIG.TYPEWRITER_SPEED;
                typewriterIndex++;
                currentTypingText = paragraphs[currentParagraphIndex].substring(0, typewriterIndex);
            }

            if (typewriterIndex >= paragraphs[currentParagraphIndex].length) {
                displayedText.push(paragraphs[currentParagraphIndex]);
                paraAlphas.push(typingParaAlpha);
                currentParagraphIndex++;
                typewriterIndex = 0;
                currentTypingText = '';
                typingParaAlpha = 0;

                if (currentParagraphIndex < paragraphs.length) {
                    typewriterTimer = -CONFIG.PARAGRAPH_DELAY * 1000;
                }
            }
        } else {
            readyForInput = true;
        }

        // Animate completed paragraph alphas
        for (let i = 0; i < paraAlphas.length; i++) {
            if (paraAlphas[i] < 1) {
                paraAlphas[i] = Math.min(1, paraAlphas[i] + dt * CONFIG.PARA_FADE_SPEED);
            }
        }

        hintBlinkTimer += dt * CONFIG.HINT_BLINK_SPEED * Math.PI * 2;

        if (G.StoryBackgrounds && G.StoryBackgrounds.isEnabled()) {
            G.StoryBackgrounds.update(dt);
        } else {
            for (const star of stars) {
                star.y += star.speed * dt * 20;
                if (star.y > canvasHeight) {
                    star.y = 0;
                    star.x = Math.random() * canvasWidth;
                }
                star.twinklePhase += star.twinkleSpeed * dt;
            }
        }
    }

    function draw(ctx, width, height) {
        if (!isActive || !currentStory) return;

        canvasWidth = width;
        canvasHeight = height;
        const CU = G.ColorUtils;

        ctx.save();

        // --- Gradient background ---
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, CONFIG.BG_GRADIENT_TOP);
        grad.addColorStop(0.5, CONFIG.BG_GRADIENT_MID);
        grad.addColorStop(1, CONFIG.BG_GRADIENT_BOTTOM);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // --- Vignette ---
        const vRadius = Math.max(width, height) * 0.7;
        const vignette = ctx.createRadialGradient(
            width / 2, height / 2, vRadius * 0.4,
            width / 2, height / 2, vRadius
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,' + CONFIG.VIGNETTE_STRENGTH + ')');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        ctx.globalAlpha = fadeAlpha;

        // --- Background layer (cinematic or legacy stars) ---
        if (G.StoryBackgrounds && G.StoryBackgrounds.isEnabled()) {
            G.StoryBackgrounds.draw(ctx, width, height, fadeAlpha);
        } else {
            for (const star of stars) {
                const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
                const alpha = star.brightness * twinkle;

                ctx.fillStyle = CU
                    ? CU.rgba(180, 200, 255, alpha * CONFIG.STAR_GLOW_ALPHA)
                    : 'rgba(180,200,255,' + (alpha * CONFIG.STAR_GLOW_ALPHA) + ')';
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = CU
                    ? CU.rgba(255, 255, 255, alpha)
                    : 'rgba(255,255,255,' + alpha + ')';
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- Text ---
        const maxWidth = width * CONFIG.MAX_WIDTH_RATIO;
        const centerX = width / 2;
        const safeTop = (window.safeAreaInsets && window.safeAreaInsets.top) || 0;
        let y = CONFIG.PADDING_TOP + safeTop;

        // Period (year)
        const period = currentStory.period || '';
        const periodSuffix = getLocalizedText(currentStory.periodSuffix);
        const periodText = periodSuffix ? period + periodSuffix : period;

        if (periodText) {
            ctx.font = 'bold ' + CONFIG.FONT_SIZE_PERIOD + 'px monospace';
            ctx.fillStyle = CONFIG.COLOR_PERIOD;
            ctx.textAlign = 'center';
            ctx.fillText(periodText, centerX, y);
            y += CONFIG.FONT_SIZE_PERIOD * 1.8;
        }

        // Title
        const title = getLocalizedText(currentStory.title);
        if (title) {
            ctx.font = 'bold ' + CONFIG.FONT_SIZE_TITLE + 'px monospace';
            ctx.fillStyle = CONFIG.COLOR_TITLE;
            ctx.textAlign = 'center';
            ctx.fillText(title, centerX, y, maxWidth);
            y += CONFIG.FONT_SIZE_TITLE * 1.3;

            // Subtle gold separator
            ctx.save();
            ctx.globalAlpha = fadeAlpha * 0.35;
            ctx.strokeStyle = CONFIG.COLOR_PERIOD;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX - CONFIG.SEPARATOR_WIDTH, y);
            ctx.lineTo(centerX + CONFIG.SEPARATOR_WIDTH, y);
            ctx.stroke();
            ctx.restore();
            ctx.globalAlpha = fadeAlpha;

            y += CONFIG.FONT_SIZE_TITLE * 0.5;
        }

        // Completed paragraphs
        const totalParas = getParagraphs().length;
        const lineHeight = CONFIG.FONT_SIZE_TEXT * CONFIG.LINE_HEIGHT;

        for (let i = 0; i < displayedText.length; i++) {
            const pAlpha = paraAlphas[i] !== undefined ? paraAlphas[i] : 1;
            ctx.globalAlpha = fadeAlpha * pAlpha;

            // Last paragraph: italic + brighter
            const isLast = (i === totalParas - 1);
            ctx.font = (isLast ? 'italic ' : '') + CONFIG.FONT_SIZE_TEXT + 'px monospace';

            const lines = getWrappedLines(ctx, displayedText[i], maxWidth);
            for (const line of lines) {
                const segs = getHighlightSegments(line);
                if (isLast) {
                    for (const s of segs) {
                        if (s.color === CONFIG.COLOR_TEXT) s.color = '#FFFFFF';
                    }
                }
                drawSegmentedLine(ctx, segs, centerX, y);
                y += lineHeight;
            }
            y += lineHeight * CONFIG.PARAGRAPH_GAP;
        }

        // Currently typing paragraph
        if (currentTypingText) {
            ctx.globalAlpha = fadeAlpha * typingParaAlpha;

            const isLastTyping = (currentParagraphIndex === totalParas - 1);
            ctx.font = (isLastTyping ? 'italic ' : '') + CONFIG.FONT_SIZE_TEXT + 'px monospace';

            const lines = getWrappedLines(ctx, currentTypingText + '_', maxWidth);
            for (const line of lines) {
                const segs = getHighlightSegments(line);
                if (isLastTyping) {
                    for (const s of segs) {
                        if (s.color === CONFIG.COLOR_TEXT) s.color = '#FFFFFF';
                    }
                }
                drawSegmentedLine(ctx, segs, centerX, y);
                y += lineHeight;
            }
        }

        // Hint
        if (readyForInput) {
            const hintAlpha = 0.5 + 0.5 * Math.sin(hintBlinkTimer);
            ctx.globalAlpha = fadeAlpha * hintAlpha;
            ctx.font = CONFIG.FONT_SIZE_HINT + 'px monospace';
            ctx.fillStyle = CONFIG.COLOR_HINT;
            ctx.textAlign = 'center';

            const hintText = currentLang === 'IT' ? '[ TOCCA PER CONTINUARE ]' : '[ TAP TO CONTINUE ]';
            ctx.fillText(hintText, centerX, height - 50);
        }

        ctx.restore();
    }

    function isShowing() {
        return isActive;
    }

    function setLanguage(lang) {
        currentLang = lang;
    }

    function setDimensions(width, height) {
        canvasWidth = width;
        canvasHeight = height;
        if (isActive) {
            if (G.StoryBackgrounds && G.StoryBackgrounds.isEnabled()) {
                G.StoryBackgrounds.resize(width, height);
            } else {
                initStars();
            }
        }
    }

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
