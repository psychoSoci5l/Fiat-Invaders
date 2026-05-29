// Run unit tests via Playwright + Node unit tests
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:8000';

const NODE_TEST_FILES = [
    'tests/unit/migration_test.js',
    'tests/unit/checkpoint_manager_test.js',
    'tests/unit/checkpoint_lifecycle_test.js',
    'tests/unit/collision_test.js',
    'tests/unit/daily_streak_test.js'
];

function runNodeTests() {
    let totalPassed = 0, totalFailed = 0;
    const results = [];
    for (const file of NODE_TEST_FILES) {
        const fullPath = path.resolve(file);
        try {
            const stdout = execSync(`node "${fullPath}"`, { encoding: 'utf-8', timeout: 10000 });
            const passedMatch = stdout.match(/Passed:\s*(\d+)/);
            const failedMatch = stdout.match(/Failed:\s*(\d+)/);
            const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
            const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
            totalPassed += passed;
            totalFailed += failed;
            results.push({ file, passed, failed, ok: failed === 0 });
        } catch (e) {
            results.push({ file, passed: 0, failed: 1, ok: false, error: e.message });
            totalFailed += 1;
        }
    }
    return { totalPassed, totalFailed, results };
}

async function runUnitTests() {
    console.log('\n=== Unit Test Suite — Automated Runner ===\n');

    // Phase 1: Node standalone unit tests
    console.log('--- Node Unit Tests ---');
    const nodeResults = runNodeTests();
    for (const r of nodeResults.results) {
        const icon = r.ok ? '✅' : '❌';
        console.log(`${icon} ${path.basename(r.file)} — ${r.passed} passed, ${r.failed} failed`);
        if (r.error) console.log(`   Error: ${r.error}`);
    }
    console.log(`Node Total: ${nodeResults.totalPassed} passed, ${nodeResults.totalFailed} failed\n`);

    // Phase 2: Browser test suite via Playwright
    console.log('--- Browser Test Suite ---');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Collect console output
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message}`));

    await page.goto(`${baseUrl}/tests/runner.html`, {
        waitUntil: 'networkidle',
        timeout: 30000
    });

    // Wait for tests to complete
    await page.waitForTimeout(2000);

    // Get results from the page
    const results = await page.evaluate(() => {
        const summary = document.getElementById('summary');
        const resultDivs = document.querySelectorAll('.test');
        const suites = document.querySelectorAll('.suite');

        const suiteNames = [];
        suites.forEach(s => {
            const nameEl = s.querySelector('.suite-name');
            if (nameEl) suiteNames.push(nameEl.textContent);
        });

        const results_list = [];
        resultDivs.forEach(d => {
            results_list.push({
                text: d.textContent,
                className: d.className
            });
        });

        return {
            summaryHTML: summary ? summary.innerHTML : 'N/A',
            suites: suiteNames,
            results: results_list
        };
    });

    // Print test results
    const passed = results.results.filter(r => r.className.includes('pass')).length;
    const failed = results.results.filter(r => r.className.includes('fail')).length;

    console.log(`Suites: ${results.suites.join(', ')}\n`);
    console.log(`Tests: ${passed} passed, ${failed} failed\n`);

    if (failed > 0) {
        console.log('FAILED TESTS:');
        results.results.filter(r => r.className.includes('fail')).forEach(r => {
            console.log(`  ❌ ${r.text}`);
        });
        console.log('');
    }

    if (results.summaryHTML) {
        // Strip HTML tags for display
        const summary = results.summaryHTML.replace(/<[^>]*>/g, '');
        console.log(`Summary: ${summary}\n`);
    }

    // Check for crashes
    const crashed = logs.some(l => l.includes('[PAGE_ERROR]'));
    if (crashed) {
        console.log('\n⚠️  Page errors detected:');
        logs.filter(l => l.includes('[PAGE_ERROR]')).forEach(l => console.log(`  ${l}`));
    }

    const totalAssertPattern = results.results.map(r => r.text).join(' ');
    const assertMatch = totalAssertPattern.match(/(\d+)\s+assert/);
    const totalAsserts = assertMatch ? assertMatch[1] : '?';

    console.log(`\nTotal asserts: ${totalAsserts}`);
    console.log(`Test suites: ${results.suites.length}`);

    // Phase 3: Aggregate report
    const grandPassed = nodeResults.totalPassed + passed;
    const grandFailed = nodeResults.totalFailed + failed;
    console.log(`\n=== AGGREGATE REPORT ===`);
    console.log(`Node unit tests: ${nodeResults.totalPassed} passed, ${nodeResults.totalFailed} failed`);
    console.log(`Browser suites:  ${passed} passed, ${failed} failed (${results.suites.length} suites)`);
    console.log(`GRAND TOTAL:     ${grandPassed} passed, ${grandFailed} failed`);
    console.log(`Overall: ${grandFailed === 0 ? '✅ ALL PASS' : `❌ ${grandFailed} FAILURES`}\n`);

    await browser.close();
    process.exit(grandFailed > 0 ? 1 : 0);
}

runUnitTests().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
