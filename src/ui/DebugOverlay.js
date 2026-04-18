// DebugOverlay.js — Extracted from main.js v7.0
// Triple-tap debug overlay at game over + intro (v6.4)

window.Game = window.Game || {};

(function () {
    const G = window.Game;

    const _debugTapTimes = [];
    const _DEBUG_TAP_WINDOW = 800;
    const _DEBUG_TAP_COUNT = 3;
    let _debugOverlayContext = 'GAMEOVER';

    // Game over triple-tap
    function _initGameOverTap() {
        const goScreen = document.getElementById('gameover-screen');
        if (!goScreen) return;

        function _onDebugTap(e) {
            if (!G.GameState || !G.GameState.is('GAMEOVER')) return;
            if (e.target.closest && e.target.closest('button, a, input')) return;

            const now = Date.now();
            _debugTapTimes.push(now);
            while (_debugTapTimes.length > 0 && now - _debugTapTimes[0] > _DEBUG_TAP_WINDOW) {
                _debugTapTimes.shift();
            }
            if (_debugTapTimes.length >= _DEBUG_TAP_COUNT) {
                _debugTapTimes.length = 0;
                _showDebugOverlay('GAMEOVER');
            }
        }

        goScreen.addEventListener('touchend', _onDebugTap, { passive: true });
        goScreen.addEventListener('click', _onDebugTap);
    }

    // Intro triple-tap on version tag
    function _initIntroTap() {
        const vTag = document.getElementById('version-tag');
        if (!vTag) return;
        const tapTimes = [];

        function _onIntroTap(e) {
            if (!G.GameState || !G.GameState.is('INTRO')) return;
            e.stopPropagation();

            const now = Date.now();
            tapTimes.push(now);
            while (tapTimes.length > 0 && now - tapTimes[0] > _DEBUG_TAP_WINDOW) {
                tapTimes.shift();
            }
            if (tapTimes.length >= _DEBUG_TAP_COUNT) {
                tapTimes.length = 0;
                _showDebugOverlay('INTRO');
            }
        }

        vTag.addEventListener('touchend', _onIntroTap, { passive: false });
        vTag.addEventListener('click', _onIntroTap);
    }

    function _collectDebugDevice() {
        return [
            { label: 'Screen', val: `${screen.width}×${screen.height}` },
            { label: 'Viewport', val: `${innerWidth}×${innerHeight}` },
            { label: 'DPR', val: `${devicePixelRatio}` },
            { label: 'Safe Top', val: `${G._safeTop ?? '?'}` },
            { label: 'Safe Bot', val: `${G._safeBottom ?? '?'}` },
            { label: 'PWA', val: `${!!window.isPWA}` },
            { label: 'UA', val: (navigator.userAgent || '').substring(0, 120), full: true }
        ];
    }

    function _collectDebugPerf() {
        const qm = G.QualityManager;
        if (!qm) return [{ label: 'Status', val: 'QualityManager N/A', cls: 'warn' }];
        const s = qm.getStats();
        const saved = localStorage.getItem('fiat_quality_tier');
        return [
            { label: 'FPS Now', val: `${s.fps}` },
            { label: 'FPS Avg', val: `${s.avgFps}` },
            { label: 'Tier', val: s.tier },
            { label: 'Mode', val: s.auto ? 'AUTO' : 'MANUAL' },
            { label: 'Saved Pref', val: saved || 'none' },
            { label: 'Samples', val: `${s.samples}` }
        ];
    }

    function _collectDebugSession() {
        const isStory = G.CampaignState && G.CampaignState.isEnabled();
        const stacks = G.RunState ? (G.RunState.perkStacks || {}) : {};
        const perks = [stacks.fire ? 'F' : '-', stacks.laser ? 'L' : '-', stacks.electric ? 'E' : '-'].join('');
        const nick = localStorage.getItem('fiat_nickname') || '-';
        const ctx = G._debugCtx || {};
        const rows = [
            { label: 'Version', val: G.VERSION || '?' },
            { label: 'Mode', val: isStory ? 'STORY' : 'ARCADE' },
            { label: 'Cycle', val: `${window.marketCycle ?? '?'}` },
            { label: 'Level', val: `${window.currentLevel ?? '?'}` },
            { label: 'Wave', val: `${G.WaveManager ? G.WaveManager.wave : '?'}` },
            { label: 'Score', val: `${ctx.score ?? '?'}` },
            { label: 'Kills', val: `${ctx.killCount ?? '?'}` },
            { label: 'Bear Mkt', val: `${!!window.isBearMarket}` },
            { label: 'Perks', val: perks },
            { label: 'Nickname', val: nick }
        ];
        const v8cfg = G.Balance && G.Balance.V8_MODE;
        if (v8cfg && v8cfg.ENABLED) {
            const se = G.ScrollEngine;
            const ls = G.LevelScript;
            const scrollY = se && se.camera ? se.camera.scrollY : 0;
            const speed = se && se.getSpeed ? se.getSpeed() : 0;
            const spawns = ls ? `${ls._idx}/${ls.SCRIPT ? ls.SCRIPT.length : 0}` : '-';
            const elapsed = ls ? (ls._elapsed || 0).toFixed(1) : '-';
            const bossFlag = ls && ls._bossSpawned ? 'YES' : 'NO';
            rows.push({ label: 'V8 Mode', val: 'ENABLED', cls: 'good' });
            rows.push({ label: 'V8 Scroll', val: `${scrollY.toFixed(1)} px` });
            rows.push({ label: 'V8 Speed', val: `${speed.toFixed(0)} px/s` });
            rows.push({ label: 'V8 Elapsed', val: `${elapsed}s` });
            rows.push({ label: 'V8 Spawns', val: spawns });
            rows.push({ label: 'V8 Boss', val: bossFlag });
        }
        return rows;
    }

    function _collectDebugSessionFromLog(prev) {
        if (!prev) return [{ label: 'Status', val: 'No previous session', cls: 'warn' }];
        const c = prev.counters || {};
        return [
            { label: 'Version', val: prev.v || '?' },
            { label: 'Kills', val: `${c.kills ?? '?'}` },
            { label: 'Deaths', val: `${c.deaths ?? '?'}` },
            { label: 'Waves', val: `${c.waves ?? '?'}` },
            { label: 'Bosses', val: `${c.bosses ?? '?'}` },
            { label: 'Ended', val: prev.ts ? _formatAge(prev.ts) : '?' }
        ];
    }

    function _collectDebugJudgment() {
        const qm = G.QualityManager;
        if (!qm) return [{ label: 'Verdict', val: 'N/A', cls: 'warn' }];
        const avg = qm.getStats().avgFps;
        let verdict, cls;
        if (avg >= 58) { verdict = 'ULTRA-CAPABLE'; cls = 'good'; }
        else if (avg >= 50) { verdict = 'HIGH'; cls = 'good'; }
        else if (avg >= 40) { verdict = 'MEDIUM'; cls = 'warn'; }
        else { verdict = 'LOW'; cls = 'bad'; }
        return [
            { label: 'Avg FPS', val: `${avg}` },
            { label: 'Verdict', val: verdict, cls }
        ];
    }

    function _formatAge(timestamp) {
        const diff = Date.now() - timestamp;
        if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
        if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
        return `${Math.round(diff / 86400000)}d ago`;
    }

    function _formatLogTime(ms) {
        const sec = Math.floor(ms / 1000);
        const min = Math.floor(sec / 60);
        const s = sec % 60;
        return `+${min}:${s.toString().padStart(2, '0')}`;
    }

    function _renderDebugSection(containerId, rows) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = rows.map(r => {
            const cls = r.full ? ' full' : '';
            const valCls = r.cls ? ` ${r.cls}` : '';
            return `<div class="debug-row${cls}"><span class="debug-label">${r.label}</span><span class="debug-val${valCls}">${r.val}</span></div>`;
        }).join('');
    }

    function _renderErrorSection(errorData) {
        const section = document.getElementById('debug-error-section');
        const el = document.getElementById('debug-error');
        if (!section || !el) return;
        if (!errorData) { section.style.display = 'none'; return; }

        section.style.display = '';
        const rows = [
            { label: 'Message', val: (errorData.msg || 'Unknown').substring(0, 120), full: true, cls: 'bad' }
        ];
        if (errorData.url) rows.push({ label: 'Location', val: `${errorData.url}:${errorData.line || '?'}:${errorData.col || '?'}`, full: true });
        if (errorData.time) rows.push({ label: 'When', val: _formatAge(errorData.time) });
        _renderDebugSection('debug-error', rows);
    }

    function _renderSessionLogSection(logEntries) {
        const section = document.getElementById('debug-log-section');
        const el = document.getElementById('debug-log');
        if (!section || !el) return;
        if (!logEntries || logEntries.length === 0) { section.style.display = 'none'; return; }

        section.style.display = '';
        el.innerHTML = logEntries.map(e => {
            const cls = (e.c || '').toLowerCase();
            return `<div class="debug-log-entry ${cls}">${_formatLogTime(e.t)} [${e.c}] ${e.m}</div>`;
        }).join('');
    }

    function _showDebugOverlay(context) {
        _debugOverlayContext = context || 'GAMEOVER';

        _renderDebugSection('debug-device', _collectDebugDevice());
        _renderDebugSection('debug-perf', _collectDebugPerf());
        _renderDebugSection('debug-judgment', _collectDebugJudgment());

        if (_debugOverlayContext === 'GAMEOVER') {
            _renderDebugSection('debug-session', _collectDebugSession());
            _renderErrorSection(window._lastError || null);
            _renderSessionLogSection(G.Debug ? G.Debug.sessionLog : []);
        } else {
            const prev = G.Debug ? G.Debug.getPreviousSessionLog() : null;
            _renderDebugSection('debug-session', _collectDebugSessionFromLog(prev));
            _renderErrorSection(prev ? prev.error : null);
            _renderSessionLogSection(prev ? prev.log : []);
        }

        const overlay = document.getElementById('debug-overlay');
        if (overlay) overlay.style.display = 'flex';

        const sendBtn = document.getElementById('debug-send-btn');
        const closeBtn = document.getElementById('debug-close-btn');
        if (sendBtn) sendBtn.onclick = _sendDebugReport;
        if (closeBtn) closeBtn.onclick = _hideDebugOverlay;
    }

    function _hideDebugOverlay() {
        const overlay = document.getElementById('debug-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    function _formatDebugReportText() {
        const sections = [
            { title: 'DEVICE', rows: _collectDebugDevice() },
            { title: 'PERFORMANCE', rows: _collectDebugPerf() },
            { title: 'QUALITY JUDGMENT', rows: _collectDebugJudgment() }
        ];

        if (_debugOverlayContext === 'GAMEOVER') {
            sections.splice(2, 0, { title: 'GAME SESSION', rows: _collectDebugSession() });
        } else {
            const prev = G.Debug ? G.Debug.getPreviousSessionLog() : null;
            sections.splice(2, 0, { title: 'PREV SESSION', rows: _collectDebugSessionFromLog(prev) });
        }

        let text = '';
        for (const s of sections) {
            text += `--- ${s.title} ---\n`;
            for (const r of s.rows) text += `${r.label}: ${r.val}\n`;
            text += '\n';
        }

        const errData = _debugOverlayContext === 'GAMEOVER'
            ? window._lastError
            : (G.Debug ? G.Debug.getPreviousSessionLog() : null)?.error;
        if (errData) {
            text += `--- LAST ERROR ---\n${(errData.msg || 'Unknown').substring(0, 200)}\n`;
            if (errData.url) text += `at ${errData.url}:${errData.line}:${errData.col}\n`;
            text += '\n';
        }

        const logEntries = _debugOverlayContext === 'GAMEOVER'
            ? (G.Debug ? G.Debug.sessionLog : [])
            : (G.Debug ? G.Debug.getPreviousSessionLog() : null)?.log || [];
        if (logEntries.length > 0) {
            text += '--- SESSION LOG ---\n';
            let logText = '';
            for (const e of logEntries) {
                const line = `${_formatLogTime(e.t)} [${e.c}] ${e.m}\n`;
                if (logText.length + line.length > 600) { logText += '[...]\n'; break; }
                logText += line;
            }
            text += logText;
        }

        return text;
    }

    function _sendDebugReport() {
        const ver = G.VERSION || '?';
        const ctx = _debugOverlayContext === 'INTRO' ? ' (prev session)' : '';
        const subject = `FIAT vs CRYPTO Debug Report ${ver}${ctx}`;
        let body = _formatDebugReportText();
        if (body.length > 1800) body = body.substring(0, 1800) + '\n[truncated]';
        const mailto = `mailto:psychoSocial_01@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto);
    }

    // Public API
    G.DebugOverlay = {
        init: function () {
            _initGameOverTap();
            _initIntroTap();
        },
        show: _showDebugOverlay,
        hide: _hideDebugOverlay
    };
})();
