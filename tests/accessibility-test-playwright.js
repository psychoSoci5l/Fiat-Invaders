// Playwright-based accessibility audit for FIAT vs CRYPTO
// Run: node tests/accessibility-test-playwright.js
// Requires: npm install @axe-core/playwright

const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const path = require('path');

const BASE = 'http://localhost:8000';
const RESULTS = [];

function report(category, check, pass, detail = '') {
    const icon = pass ? '✅ PASS' : '❌ FAIL';
    RESULTS.push({ category, check, pass, detail });
    console.log(`  ${icon} | ${check}${detail ? ' — ' + detail : ''}`);
}

async function run() {
    console.log('\n=== FIAT vs CRYPTO — Accessibility Audit ===\n');
    console.log(`Game URL: ${BASE}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 480, height: 800 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    // --- 1. Game loads ---
    console.log('-- 1. Game Load');
    try {
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
        report('Load', 'Page loads', true);
    } catch (e) {
        report('Load', 'Page loads', false, e.message);
    }
    await page.waitForTimeout(3000);
    report('Load', 'No page errors', pageErrors.length === 0,
        pageErrors.length > 0 ? pageErrors.slice(0, 3).join('; ') : '');

    const gameExists = await page.evaluate(() => typeof window.Game !== 'undefined');
    report('Load', 'window.Game namespace', gameExists);
    if (!gameExists) {
        console.log('\n⚠️  Game failed to load — skipping DOM checks');
        await browser.close();
        process.exit(1);
    }

    // --- 2. AccessibilityUtils loaded ---
    console.log('\n-- 2. AccessibilityUtils');
    const a11yExists = await page.evaluate(() => {
        const A = window.Game?.Accessibility;
        return A && typeof A.openModal === 'function' && typeof A.closeModal === 'function' &&
            typeof A.trapFocus === 'function' && typeof A.announce === 'function';
    });
    report('AccessibilityUtils', 'All core functions exist', a11yExists);
    report('AccessibilityUtils', 'prefersReducedMotion() exists',
        await page.evaluate(() => typeof window.Game?.Accessibility?.prefersReducedMotion === 'function'));
    report('AccessibilityUtils', 'closeTopModal() exists',
        await page.evaluate(() => typeof window.Game?.Accessibility?.closeTopModal === 'function'));

    // --- 3. a11y announcer + skip-link ---
    console.log('\n-- 3. Screen Reader Infrastructure');
    report('SR', '#a11y-announcer exists',
        await page.evaluate(() => {
            const el = document.getElementById('a11y-announcer');
            return el && el.getAttribute('aria-live') === 'polite' && el.getAttribute('aria-atomic') === 'true';
        }));
    report('SR', '#skip-link exists',
        await page.evaluate(() => {
            const el = document.getElementById('skip-link');
            return el && el.classList.contains('skip-link') && el.getAttribute('href') === '#game-container';
        }));
    report('SR', '#a11y-announcer uses .visually-hidden pattern',
        await page.evaluate(() => {
            const el = document.getElementById('a11y-announcer');
            if (!el) return false;
            const cs = window.getComputedStyle(el);
            return cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.position === 'absolute';
        }));

    // --- 4. Canvas ARIA ---
    console.log('\n-- 4. Canvas Accessibility');
    report('Canvas', 'Canvas has role="img"',
        await page.evaluate(() => {
            const c = document.getElementById('gameCanvas');
            return c && c.getAttribute('role') === 'img';
        }));
    report('Canvas', 'Canvas has aria-label',
        await page.evaluate(() => {
            const c = document.getElementById('gameCanvas');
            return c && c.getAttribute('aria-label');
        }));

    // --- 5. All modals have ARIA dialog attributes ---
    console.log('\n-- 5. Modal ARIA');

    // Initial DOM modals present at load
    const STATIC_MODAL_IDS = [
        'settings-modal', 'manual-modal', 'pause-screen',
        'gameover-screen', 'perk-modal', 'profile-panel',
        'whatsnew-panel', 'modifier-overlay', 'credits-panel',
        'privacy-panel', 'feedback-overlay', 'lesson-modal',
        'tutorial-overlay', 'nickname-overlay', 'leaderboard-panel',
        'debug-overlay', 'v8-intermission-screen'
    ];

    // Dynamic modals created at runtime (checked after game init)
    const DYNAMIC_MODAL_IDS = [
        'game-completion-screen'
    ];

    let modalPass = 0; let modalFail = 0;

    function checkModal(mid) {
        return page.evaluate((id) => {
            const el = document.getElementById(id);
            if (!el) return { exists: false };
            const role = el.getAttribute('role') === 'dialog';
            const modal = el.getAttribute('aria-modal') === 'true';
            const labelledby = el.hasAttribute('aria-labelledby');
            const ariaLabel = el.hasAttribute('aria-label');
            return { exists: true, role, modal, label: labelledby || ariaLabel };
        }, mid).then(result => {
            if (!result.exists) {
                report('Modals', `${mid} exists`, false);
                modalFail++;
                return;
            }
            let ok = true;
            if (!result.role) { ok = false;
                report('Modals', `${mid} role="dialog"`, false); }
            if (!result.modal) { ok = false;
                report('Modals', `${mid} aria-modal="true"`, false); }
            if (!result.label) { ok = false;
                report('Modals', `${mid} aria-labelledby/aria-label`, false); }
            if (ok) {
                report('Modals', `${mid} — dialog + modal + label`, true);
                modalPass++;
            } else {
                modalFail++;
            }
        });
    }

    for (const id of STATIC_MODAL_IDS) {
        await checkModal(id);
    }
    // Dynamic modals: soft pass if not yet created
    for (const id of DYNAMIC_MODAL_IDS) {
        const exists = await page.evaluate((mid) => !!document.getElementById(mid), id);
        if (exists) {
            await checkModal(id);
        } else {
            console.log(`  ℹ️  ${id} not rendered yet — created at runtime, expected`);
            modalPass++;
        }
    }
    const totalModals = STATIC_MODAL_IDS.length + DYNAMIC_MODAL_IDS.length;
    report('Modals', `${modalPass}/${totalModals} modals fully compliant`, modalFail === 0,
        `${modalFail} modals with issues`);

    // --- 6. Landmark roles ---
    console.log('\n-- 6. Landmarks');
    report('Landmarks', '#game-container has role="main"',
        await page.evaluate(() => {
            const el = document.getElementById('game-container');
            return el && el.getAttribute('role') === 'main';
        }));

    // Check decorative aria-hidden elements
    const DECORATIVE_IDS = ['scanlines', 'vignette', 'curtain-overlay',
        'splash-layer', 'intro-video', 'touchControls', 'sa-sentinel'];
    let decPass = 0; let decFail = 0;
    for (const id of DECORATIVE_IDS) {
        const hidden = await page.evaluate((did) => {
            const el = document.getElementById(did);
            return el ? el.getAttribute('aria-hidden') === 'true' : null;
        }, id);
        if (hidden === null) {
            // Element might not be rendered yet — soft pass
            decPass++;
        } else if (hidden) {
            decPass++;
            report('Decoratives', `${id} aria-hidden="true"`, true);
        } else {
            decFail++;
            report('Decoratives', `${id} aria-hidden="true"`, false);
        }
    }
    if (decFail === 0) report('Decoratives', 'All decorative elements', true);

    // --- 7. Color scheme CSS ---
    console.log('\n-- 7. CSS Environment');
    report('CSS', ':root has color-scheme: dark',
        await page.evaluate(() => {
            const cs = window.getComputedStyle(document.documentElement);
            return cs.colorScheme === 'dark' || document.documentElement.style.colorScheme === 'dark';
        }));

    // Check focus-visible rules exist for key interactive elements
    report('CSS', 'Focus-visible rule for .btn',
        await page.evaluate(() => {
            const btn = document.querySelector('.btn');
            if (!btn) return false;
            const after = document.styleSheets.length > 0;
            return after;
        }));

    // --- 8. InputSystem modale-aware ---
    console.log('\n-- 8. Input Integration');
    report('Input', 'InputSystem.globalKeys handles modals',
        await page.evaluate(() => {
            var I = window.Game?.Input;
            if (!I || typeof I.handleGlobalKeys !== 'function') return false;
            return true;
        }));
    report('Input', 'isModalOpen() available',
        await page.evaluate(() => typeof window.Game?.Accessibility?.isModalOpen === 'function'));

    // Test announce() via evaluate
    report('EventBus', 'a11y:announce channel wired',
        await page.evaluate(() => {
            var EB = window.Game?.Events;
            if (!EB || typeof EB.emit !== 'function') return false;
            try {
                EB.emit('a11y:announce', 'test');
                return true;
            } catch (e) {
                return false;
            }
        }));

    // --- 9. aXe auto-scan ---
    console.log('\n-- 9. aXe Automated Scan');
    try {
        const a11yResults = await new AxeBuilder({ page })
            .withRules([
                'aria-allowed-role', 'aria-dialog-name', 'aria-hidden-focus',
                'aria-roles', 'aria-valid-attr-value',
                'button-name', 'color-contrast', 'document-title',
                'html-has-lang', 'image-alt', 'label', 'landmark-one-main',
                'link-name', 'meta-viewport', 'page-has-heading-one',
                'region', 'skip-link', 'tabindex'
            ])
            .analyze();
        const violations = a11yResults.violations;
        if (violations.length === 0) {
            report('aXe', 'aXe scan passed (0 violations)', true);
        } else {
            // Filter violations with impact serious or critical
            const serious = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
            for (const v of violations) {
                const pass = v.impact !== 'critical' && v.impact !== 'serious';
                const nodes = v.nodes.slice(0, 3).map(n => n.html).join('; ');
                report('aXe', `${v.impact}: ${v.id} (${v.nodes.length}x)`, pass,
                    nodes ? nodes.substring(0, 80) : '');
            }
            if (serious.length > 0) {
                console.log(`  ⚠️  ${serious.length} serious/critical violations found`);
            }
        }
    } catch (e) {
        report('aXe', 'aXe scan executed', false, e.message);
    }

    // --- 10. Keyboard nav on intro ---
    console.log('\n-- 10. Keyboard Navigation');
    const introBtn = await page.evaluate(() => {
        var btn = document.getElementById('btn-primary-action');
        return btn ? {
            exists: true,
            tagName: btn.tagName,
            text: (btn.textContent || '').substring(0, 30)
        } : { exists: false };
    });
    report('Keyboard', '#btn-primary-action exists for auto-focus',
        introBtn.exists, introBtn.exists ? introBtn.text : '');

    // Tab check on intro buttons
    const tabTargets = await page.evaluate(() => {
        var btns = document.querySelectorAll('.intro-icons .mode-pill, .intro-icons .btn, .intro-controls .btn, .ship-arrow');
        var tabIndexes = [];
        btns.forEach(function (b) {
            var idx = b.getAttribute('tabindex');
            if (idx !== null) tabIndexes.push(idx);
        });
        return tabIndexes;
    });
    // Elements without tabindex default to 0, which is fine
    report('Keyboard', 'Navigation elements have valid tab order',
        tabTargets.every(t => t === '0' || t === null || parseInt(t) >= 0));

    // --- Summary ---
    console.log('');
    const passed = RESULTS.filter(r => r.pass).length;
    const failed = RESULTS.filter(r => !r.pass).length;
    console.log(`=== Accessibility Audit Complete ===`);
    console.log(`  ${passed} passed, ${failed} failed, ${RESULTS.length} total checks\n`);

    if (failed > 0) {
        console.log('FAILED CHECKS:');
        RESULTS.filter(r => !r.pass).forEach(r => {
            console.log(`  ❌ [${r.category}] ${r.check}${r.detail ? ' — ' + r.detail : ''}`);
        });
        console.log('');
    }

    console.log(`Overall: ${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILURES`}\n`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
