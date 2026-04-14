// LeaderboardClient.js — Extracted from main.js v7.0
// Nickname, Device ID, Nonce, Pending Score, Leaderboard API

window.Game = window.Game || {};

(function () {
    const G = window.Game;

    // --- Helpers (use safeSetItem/safeGetItem from main.js if available, else direct) ---
    const _safeSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
    const _safeGet = (k, fb) => { try { return localStorage.getItem(k); } catch { return fb !== undefined ? fb : null; } };

    // === PLATFORM DETECTION ===
    function getPlatform() {
        return ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'M' : 'D';
    }

    // === NICKNAME MANAGER ===
    function getNickname() { return _safeGet('fiat_nickname', '') || ''; }
    function hasNickname() { return getNickname().length >= 3; }
    function setNickname(name) {
        const clean = (name || '').toUpperCase().trim();
        if (!/^[A-Z0-9 ]{3,6}$/.test(clean)) return false;
        _safeSet('fiat_nickname', clean);
        return true;
    }
    function showNicknamePrompt(callback, options) {
        const opts = options || {};
        const t = G.t || ((k) => k); // i18n fallback
        const overlay = document.getElementById('nickname-overlay');
        const input = document.getElementById('nickname-input');
        const error = document.getElementById('nickname-error');
        const btn = document.getElementById('nickname-confirm');
        const skipBtn = document.getElementById('nickname-skip');
        const title = document.getElementById('nickname-title');
        if (!overlay || !input || !btn) { callback(false); return; }
        overlay.style.display = 'flex';
        if (title) title.textContent = opts.title || t('NICK_TITLE');
        input.placeholder = t('NICK_PLACEHOLDER');
        btn.textContent = t('NICK_CONFIRM');
        if (skipBtn) {
            skipBtn.textContent = t('NICK_SKIP');
            skipBtn.style.display = opts.hideSkip ? 'none' : '';
        }
        if (error) error.style.display = 'none';
        input.value = getNickname();
        function cleanup() {
            overlay.style.display = 'none';
            input.removeEventListener('keydown', onKey);
            btn.removeEventListener('click', submit);
            if (skipBtn) skipBtn.removeEventListener('click', skip);
        }
        function submit() {
            if (setNickname(input.value)) {
                cleanup();
                callback(true);
            } else {
                if (error) {
                    error.textContent = t('NICK_INVALID');
                    error.style.display = 'block';
                }
            }
        }
        function skip() { cleanup(); callback(false); }
        function onKey(e) { if (e.key === 'Enter') submit(); }
        input.addEventListener('keydown', onKey);
        btn.addEventListener('click', submit);
        if (skipBtn) skipBtn.addEventListener('click', skip);
    }

    // === DEVICE ID ===
    function getDeviceId() {
        let id = _safeGet('fiat_device_id');
        if (!id) {
            id = crypto.randomUUID ? crypto.randomUUID() :
                'xxxxxxxx-xxxx-4xxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
            _safeSet('fiat_device_id', id);
        }
        return id;
    }

    // === NONCE ===
    function generateNonce() {
        if (crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    // === PENDING SCORE QUEUE ===
    function savePendingScore(data) {
        try {
            const existing = JSON.parse(_safeGet('fiat_pending_score', 'null') || 'null');
            if (existing && existing.score >= data.score) return;
            _safeSet('fiat_pending_score', JSON.stringify(data));
        } catch { /* storage full or corrupted */ }
    }
    function getPendingScore() {
        try { return JSON.parse(_safeGet('fiat_pending_score', 'null') || 'null'); }
        catch { return null; }
    }
    function clearPendingScore() {
        localStorage.removeItem('fiat_pending_score');
    }
    async function flushPendingScore() {
        const pending = getPendingScore();
        if (!pending || !hasNickname()) return;
        const result = await G.Leaderboard.submitScore(pending);
        if (result.ok) clearPendingScore();
    }

    // === LEADERBOARD API ===
    G.Leaderboard = {
        _cache: null,
        _cacheTime: 0,
        _visible: false,

        _getMode() {
            return (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode()) ? 'arcade' : 'story';
        },

        async fetchScores(mode) {
            mode = mode || this._getMode();
            if (this._cache && Date.now() - this._cacheTime < 30000) return this._cache;
            try {
                const res = await fetch(`${G.LEADERBOARD_API}/lb?mode=${mode}`);
                const data = await res.json();
                if (data.ok) {
                    this._cache = data.scores;
                    this._cacheTime = Date.now();
                    return data.scores;
                }
            } catch { /* offline */ }
            return null;
        },

        async submitScore(data) {
            const payload = {
                n: getNickname(),
                s: Math.floor(data.score),
                k: data.kills,
                c: data.cycle,
                w: data.wave,
                sh: data.ship,
                b: data.bear ? 1 : 0,
                p: getPlatform(),
                mode: data.mode || 'story',
                d: getDeviceId(),
                t: Date.now(),
                nonce: generateNonce(),
                dur: data.duration || 0
            };
            try {
                const res = await fetch(`${G.LEADERBOARD_API}/score`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payload })
                });
                const result = await res.json();
                this._cache = null;
                return result;
            } catch {
                return { ok: false, error: 'offline' };
            }
        },

        async getRank(mode, score) {
            try {
                const res = await fetch(`${G.LEADERBOARD_API}/rank?mode=${mode || 'story'}&score=${Math.floor(score)}`);
                return await res.json();
            } catch {
                return { ok: false, error: 'offline' };
            }
        },

        toggle() {
            const panel = document.getElementById('leaderboard-panel');
            if (!panel) return;
            this._visible = !this._visible;
            panel.style.display = this._visible ? 'flex' : 'none';
            if (this._visible) this._loadAndRender();
        },

        async _loadAndRender() {
            const t = G.t || ((k) => k);
            const loading = document.getElementById('lb-loading');
            const table = document.getElementById('lb-table');
            const empty = document.getElementById('lb-empty');
            const title = document.getElementById('lb-title');
            const closeBtn = document.getElementById('lb-close-btn');
            const feedbackBtn = document.getElementById('lb-feedback-btn');
            if (title) title.textContent = t('LB_TITLE');
            if (closeBtn) closeBtn.textContent = t('CLOSE');
            if (feedbackBtn) feedbackBtn.textContent = 'FEEDBACK';
            if (loading) { loading.style.display = 'block'; loading.textContent = t('LB_LOADING'); }
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'none';

            const ths = table ? table.querySelectorAll('th') : [];
            if (ths.length >= 5) {
                ths[0].textContent = t('LB_RANK');
                ths[1].textContent = t('LB_PLAYER');
                ths[2].textContent = t('LB_SCORE');
                ths[3].textContent = 'SHIP';
                ths[4].textContent = '';
            }

            const scores = await this.fetchScores();
            if (loading) loading.style.display = 'none';
            if (!scores) {
                if (empty) { empty.textContent = t('LB_ERROR'); empty.style.display = 'block'; }
                return;
            }
            if (scores.length === 0) {
                if (empty) { empty.textContent = t('LB_EMPTY'); empty.style.display = 'block'; }
                return;
            }
            const nick = getNickname();
            let playerInfo = null;
            const rankSection = document.getElementById('lb-player-rank');
            if (nick) {
                const mode = this._getMode();
                const hsKey = mode === 'arcade' ? 'fiat_highscore_arcade' : 'fiat_highscore_story';
                const hs = parseInt(_safeGet(hsKey, '0')) || 0;
                const result = await this.getRank(mode, hs);
                if (result.ok && result.rank > 0) {
                    playerInfo = { nick, score: hs, rank: result.rank };
                    if (rankSection) {
                        rankSection.style.display = 'flex';
                        const label = rankSection.querySelector('.lb-rank-label');
                        const val = document.getElementById('lb-rank-val');
                        if (label) label.textContent = t('LB_YOUR_RANK');
                        if (val) val.textContent = `#${result.rank}`;
                    }
                } else if (rankSection) {
                    rankSection.style.display = 'none';
                }
            }
            this.renderTable(scores, playerInfo);
            if (table) table.style.display = 'table';
        },

        renderTable(scores, playerInfo) {
            const tbody = document.getElementById('lb-tbody');
            if (!tbody) return;
            const nick = getNickname();
            tbody.innerHTML = '';
            const medals = ['', '\u{1F947}', '\u{1F948}', '\u{1F949}'];
            let playerInList = false;
            scores.forEach((entry, i) => {
                const tr = document.createElement('tr');
                const rank = i + 1;
                if (rank === 1) tr.className = 'lb-rank-1';
                else if (rank === 2) tr.className = 'lb-rank-2';
                else if (rank === 3) tr.className = 'lb-rank-3';
                if (entry.n === nick) { tr.classList.add('lb-self'); playerInList = true; }
                const platIcon = entry.p === 'M' ? '📱' : entry.p === 'D' ? '🖥' : '';
                const rankDisplay = rank <= 3 ? medals[rank] : rank;
                tr.innerHTML = `<td>${rankDisplay}</td><td>${entry.n}</td><td>${entry.s.toLocaleString()}</td><td>${entry.sh}</td><td class="lb-col-plat">${platIcon}</td>`;
                tbody.appendChild(tr);
            });
            if (!playerInList && playerInfo && playerInfo.rank > 0) {
                const sepTr = document.createElement('tr');
                sepTr.className = 'lb-separator';
                sepTr.innerHTML = '<td colspan="5">\u00B7\u00B7\u00B7</td>';
                tbody.appendChild(sepTr);
                const tr = document.createElement('tr');
                tr.className = 'lb-self';
                tr.innerHTML = `<td>${playerInfo.rank}</td><td>${playerInfo.nick}</td><td>${playerInfo.score.toLocaleString()}</td><td>-</td><td></td>`;
                tbody.appendChild(tr);
            }
            const scrollEl = tbody.closest('.leaderboard-scroll');
            const existingMsg = scrollEl ? scrollEl.querySelector('.lb-motivational') : null;
            if (existingMsg) existingMsg.remove();
            if (scores.length < 5 && scrollEl) {
                const msg = document.createElement('div');
                msg.className = 'lb-motivational';
                msg.textContent = (G.t || ((k) => k))('LB_FEW_ENTRIES');
                scrollEl.appendChild(msg);
            }
        },

        async renderGameoverRank(scoreVal, killCount, cycle, wave, ship, bear) {
            const t = G.t || ((k) => k);
            const section = document.getElementById('gameover-rank-section');
            const rankVal = document.getElementById('gameover-rank-val');
            const top5El = document.getElementById('gameover-top5');
            const viewBtn = document.getElementById('btn-view-lb');
            if (!section) return;

            await flushPendingScore();

            if (viewBtn) viewBtn.textContent = t('LB_VIEW_FULL');
            if (!hasNickname()) { section.style.display = 'none'; return; }
            section.style.display = 'block';

            const rankLabel = section.querySelector('.rank-label');
            if (rankLabel) rankLabel.textContent = t('LB_YOUR_RANK');
            if (rankVal) rankVal.textContent = t('LB_SUBMITTING');

            const scoreData = { score: scoreVal, kills: killCount, cycle, wave, ship, bear, mode: this._getMode(), duration: Math.floor((window._gamePlayDuration || 0) * 1000) };
            const result = await this.submitScore(scoreData);

            const oldTier = section.querySelector('.gameover-rank-tier');
            if (oldTier) oldTier.remove();

            if (result.ok && result.rank > 0) {
                if (rankVal) rankVal.textContent = `#${result.rank}`;
                let tierText = null, tierClass = '';
                if (result.rank <= 3) { tierText = t('LB_TOP3'); tierClass = 'rank-tier-3'; }
                else if (result.rank <= 5) { tierText = t('LB_TOP5'); tierClass = 'rank-tier-5'; }
                else if (result.rank <= 10) { tierText = t('LB_TOP10'); tierClass = 'rank-tier-10'; }
                if (tierText) {
                    const badge = document.createElement('div');
                    badge.className = `gameover-rank-tier ${tierClass}`;
                    badge.textContent = tierText;
                    section.insertBefore(badge, section.firstChild);
                }
            } else if (result.ok && result.rank === -1) {
                if (rankVal) rankVal.textContent = '-';
            } else {
                savePendingScore(scoreData);
                if (rankVal) rankVal.textContent = t('LB_QUEUED');
            }

            const scores = await this.fetchScores();
            if (top5El && scores && scores.length > 0) {
                const top5 = scores.slice(0, 5);
                const nick = getNickname();
                top5El.innerHTML = top5.map((e, i) => {
                    const cls = e.n === nick ? 'top5-self' : (i === 0 ? 'top5-gold' : '');
                    const pi = e.p === 'M' ? '📱' : e.p === 'D' ? '🖥' : '';
                    return `<span class="${cls}">${i + 1}. ${e.n} ${e.s.toLocaleString()} ${pi}</span>`;
                }).join('<br>');
            }
        }
    };

    // Expose for main.js (backward compat during migration)
    G.getNickname = getNickname;
    G.hasNickname = hasNickname;
    G.setNickname = setNickname;
    G.showNicknamePrompt = showNicknamePrompt;
    G.getDeviceId = getDeviceId;
    G.flushPendingScore = flushPendingScore;
    G.savePendingScore = savePendingScore;
})();
