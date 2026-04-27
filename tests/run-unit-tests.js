// Run unit tests via Playwright and report results
const { chromium } = require('playwright');

async function runUnitTests() {
    console.log('\n=== Unit Test Suite — Automated Runner ===\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Collect console output
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message}`));

    await page.goto('http://localhost:8000/tests/runner.html', {
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
    console.log(`Overall: ${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILURES`}\n`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
}

runUnitTests().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
