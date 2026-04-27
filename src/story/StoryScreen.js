/**
 * StoryScreen.js - Full-screen narrative display
 *
 * Canvas-based story screens with:
 * - Fade in/out transitions
 * - Cinematic bottom-to-top auto-scroll (Star Wars-style crawl, no tilt)
 * - Edge fade masks for premium cinema feel
 * - Keyword highlighting (violet/magenta)
 * - Tap to speed up (3x), tap again at rest to continue
 * - Multi-paragraph support with last-paragraph italic + glow
 */
(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    const CONFIG = {
        FADE_DURATION: 0.8,
        SCROLL_SPEED: 38,            // px/s
        SCROLL_SPEED_FAST: 114,      // 3x on tap
        REST_RATIO: 0.60,            // last line settles at ~60% height
        EDGE_FADE_PX: 80,            // top/bottom cinematic fade
        STAR_COUNT: 80,
        HINT_BLINK_SPEED: 1.5,
        FONT_SIZE_PERIOD: 18,
        FONT_SIZE_TITLE: 26,
        FONT_SIZE_TEXT: 17,
        FONT_SIZE_HINT: 12,
        LINE_HEIGHT: 1.55,
        PARAGRAPH_GAP: 0.7,
        MAX_WIDTH_RATIO: 0.88,
        PADDING_TOP: 70,
        COLOR_PERIOD: '#bb44ff',
        COLOR_TITLE: '#FFFFFF',
        COLOR_TEXT: '#F5F5F5',
        COLOR_HINT: '#888888',
        COLOR_HIGHLIGHT: '#bb44ff',
        COLOR_HIGHLIGHT_NUM: '#cc66ff',
        BG_GRADIENT_TOP: '#0d0d1f',
        BG_GRADIENT_MID: '#080812',
        BG_GRADIENT_BOTTOM: '#030308',
        VIGNETTE_STRENGTH: 0.35,
        STAR_GLOW_ALPHA: 0.12,
        SEPARATOR_WIDTH: 60,
        FONT_PERIOD: "bold 18px monospace",
        FONT_TITLE: "bold 26px monospace",
        FONT_BODY: "17px 'Inter', 'Helvetica Neue', system-ui, -apple-system, sans-serif",
        FONT_BODY_LAST: "italic 17px 'Inter', 'Helvetica Neue', system-ui, -apple-system, sans-serif",
        FONT_HINT: "12px monospace",
        GLOW_LAST_COLOR: '#bb44ff',
        GLOW_LAST_BLUR: 4
    };

    // Keywords highlighted in violet (case-insensitive, word-boundary)
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
    let hintBlinkTimer = 0;
    let exitRequested = false;
    let readyForInput = false;

    // Scroll state
    let scrollY = 0;              // current offset applied to layout lines (decreases over time)
    let scrollRestY = 0;          // target offset where scrolling halts
    let scrollSpeed = CONFIG.SCROLL_SPEED;
    let layoutLines = null;       // pre-measured array of renderable lines
    let layoutBuiltForWidth = 0;  // invalidate layout on resize

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

        const pctRe = /\d[\d,.]*%/g;
        let m;
        while ((m = pctRe.exec(line)) !== null) {
            ranges.push({ start: m.index, end: m.index + m[0].length, color: CONFIG.COLOR_HIGHLIGHT_NUM });
        }

        const yearRe = /\b(19|20)\d{2}\b/g;
        while ((m = yearRe.exec(line)) !== null) {
            ranges.push({ start: m.index, end: m.index + m[0].length, color: CONFIG.COLOR_HIGHLIGHT_NUM });
        }

        if (ranges.length === 0) {
            return [{ text: line, color: CONFIG.COLOR_TEXT }];
        }

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

    // --- Layout builder (pre-measures all lines once) ---

    function buildLayout(ctx, width) {
        const lines = [];
        const maxWidth = width * CONFIG.MAX_WIDTH_RATIO;
        let relY = 0;

        // Period
        const period = currentStory.period || '';
        const periodSuffix = getLocalizedText(currentStory.periodSuffix);
        const periodText = periodSuffix ? period + periodSuffix : period;
        if (periodText) {
            lines.push({
                kind: 'period',
                text: periodText,
                font: CONFIG.FONT_PERIOD,
                color: CONFIG.COLOR_PERIOD,
                relY: relY
            });
            relY += CONFIG.FONT_SIZE_PERIOD * 1.8;
        }

        // Title
        const title = getLocalizedText(currentStory.title);
        if (title) {
            lines.push({
                kind: 'title',
                text: title,
                font: CONFIG.FONT_TITLE,
                color: CONFIG.COLOR_TITLE,
                relY: relY
            });
            relY += CONFIG.FONT_SIZE_TITLE * 1.3;

            // Separator
            lines.push({
                kind: 'separator',
                relY: relY
            });
            relY += CONFIG.FONT_SIZE_TITLE * 0.5;
        }

        // Paragraphs
        const paragraphs = getParagraphs();
        const totalParas = paragraphs.length;
        const bodyLineHeight = CONFIG.FONT_SIZE_TEXT * CONFIG.LINE_HEIGHT;

        for (let i = 0; i < totalParas; i++) {
            const isLast = (i === totalParas - 1);
            const font = isLast ? CONFIG.FONT_BODY_LAST : CONFIG.FONT_BODY;
            ctx.font = font;
            const wrapped = getWrappedLines(ctx, paragraphs[i], maxWidth);

            for (const wl of wrapped) {
                const segs = getHighlightSegments(wl);
                if (isLast) {
                    for (const s of segs) {
                        if (s.color === CONFIG.COLOR_TEXT) s.color = '#FFFFFF';
                    }
                }
                lines.push({
                    kind: 'body',
                    font: font,
                    segments: segs,
                    relY: relY,
                    isLast: isLast
                });
                relY += bodyLineHeight;
            }

            relY += bodyLineHeight * CONFIG.PARAGRAPH_GAP;
        }

        layoutLines = lines;
        layoutBuiltForWidth = width;

        // Start with entire block below the screen bottom.
        // Scroll by decreasing scrollY so the text rises.
        scrollY = canvasHeight;

        // Resting: last line's absolute y sits at REST_RATIO * height.
        const lastRelY = lines.length ? lines[lines.length - 1].relY : 0;
        scrollRestY = canvasHeight * CONFIG.REST_RATIO - lastRelY;
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
        hintBlinkTimer = 0;
        exitRequested = false;
        readyForInput = false;

        scrollY = canvasHeight;
        scrollRestY = 0;
        scrollSpeed = CONFIG.SCROLL_SPEED;
        layoutLines = null;
        layoutBuiltForWidth = 0;

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

        if (readyForInput) {
            hide();
            return;
        }

        scrollSpeed = CONFIG.SCROLL_SPEED_FAST;
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

        // Scroll (runs during fade-in too for smooth entry)
        if (layoutLines && !readyForInput) {
            scrollY -= scrollSpeed * dt;
            if (scrollY <= scrollRestY) {
                scrollY = scrollRestY;
                readyForInput = true;
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

        // Lazy layout (needs ctx for measureText)
        if (!layoutLines || layoutBuiltForWidth !== width) {
            buildLayout(ctx, width);
        }

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

        // --- Text crawl ---
        const centerX = width / 2;
        // v7.12.1: prefer G._safeTop (always current from resize()) over window.safeAreaInsets
        // which can lag on first paint. Keeps the story title below Dynamic Island.
        const G_ = window.Game;
        const safeTop = (G_ && G_._safeTop) || (window.safeAreaInsets && window.safeAreaInsets.top) || 0;
        const topPadding = CONFIG.PADDING_TOP + safeTop;
        const bodyLineHeight = CONFIG.FONT_SIZE_TEXT * CONFIG.LINE_HEIGHT;

        ctx.textBaseline = 'alphabetic';

        for (let i = 0; i < layoutLines.length; i++) {
            const line = layoutLines[i];
            const y = line.relY + scrollY + topPadding;

            // Off-screen cull
            if (y < -bodyLineHeight || y > height + bodyLineHeight) continue;

            if (line.kind === 'period') {
                ctx.font = line.font;
                ctx.fillStyle = line.color;
                ctx.textAlign = 'center';
                ctx.fillText(line.text, centerX, y);
            } else if (line.kind === 'title') {
                ctx.font = line.font;
                ctx.fillStyle = line.color;
                ctx.textAlign = 'center';
                ctx.fillText(line.text, centerX, y, width * CONFIG.MAX_WIDTH_RATIO);
            } else if (line.kind === 'separator') {
                ctx.save();
                ctx.globalAlpha = fadeAlpha * 0.35;
                ctx.strokeStyle = CONFIG.COLOR_PERIOD;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(centerX - CONFIG.SEPARATOR_WIDTH, y);
                ctx.lineTo(centerX + CONFIG.SEPARATOR_WIDTH, y);
                ctx.stroke();
                ctx.restore();
            } else if (line.kind === 'body') {
                ctx.font = line.font;
                if (line.isLast) {
                    // v7.13.0: additive glow via layered alpha (no shadowBlur)
                    ctx.save();
                    ctx.globalAlpha = 0.15;
                    drawSegmentedLine(ctx, line.segments, centerX, y);
                    ctx.globalAlpha = 0.4;
                    drawSegmentedLine(ctx, line.segments, centerX, y);
                    ctx.restore();
                    drawSegmentedLine(ctx, line.segments, centerX, y);
                } else {
                    drawSegmentedLine(ctx, line.segments, centerX, y);
                }
            }
        }

        // --- Edge fade masks (cinematic top/bottom dissolve) ---
        const fadePx = CONFIG.EDGE_FADE_PX;
        const bgTop = CONFIG.BG_GRADIENT_TOP;
        const bgBot = CONFIG.BG_GRADIENT_BOTTOM;

        const topGrad = ctx.createLinearGradient(0, 0, 0, fadePx);
        topGrad.addColorStop(0, bgTop);
        topGrad.addColorStop(1, 'rgba(13,13,31,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, width, fadePx);

        const botGrad = ctx.createLinearGradient(0, height - fadePx, 0, height);
        botGrad.addColorStop(0, 'rgba(3,3,8,0)');
        botGrad.addColorStop(1, bgBot);
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, height - fadePx, width, fadePx);

        // --- Hint ---
        if (readyForInput) {
            const hintAlpha = 0.5 + 0.5 * Math.sin(hintBlinkTimer);
            ctx.globalAlpha = fadeAlpha * hintAlpha;
            ctx.font = CONFIG.FONT_HINT;
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
        layoutLines = null; // force rebuild with new locale
    }

    function setDimensions(width, height) {
        canvasWidth = width;
        canvasHeight = height;
        if (isActive) {
            layoutLines = null; // rebuild layout at next draw
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
