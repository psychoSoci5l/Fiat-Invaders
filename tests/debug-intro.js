const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 480, height: 800 } });
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Click canvas to advance from VIDEO to INTRO
    await page.mouse.click(240, 400);
    await new Promise(r => setTimeout(r, 2000));
    console.log('1. State:', await page.evaluate(() => window.Game?.GameState?.current));

    // Check what's visible in intro
    const visible = await page.evaluate(() => {
        const els = ['intro-title', 'mode-selector', 'title-skip-btn', 'btn-primary-action', 'selection-info', 'ship-area', 'arrow-left', 'arrow-right'];
        return els.map(id => {
            const el = document.getElementById(id) || document.querySelector('.' + id);
            if (!el) return `${id}: NOT FOUND`;
            const style = window.getComputedStyle(el);
            return `${id}: display=${style.display}, opacity=${style.opacity}, visible=${style.visibility}`;
        }).join('\n');
    });
    console.log('2. Visible elements:\n' + visible);

    // Try clicking the title/SKIP button
    const skipBtn = await page.$('#title-skip-btn');
    if (skipBtn && await skipBtn.isVisible()) {
        console.log('3. Clicking SKIP button');
        await skipBtn.click();
        await new Promise(r => setTimeout(r, 1500));
        console.log('4. State after skip:', await page.evaluate(() => window.Game?.GameState?.current));
    } else {
        console.log('3. SKIP not visible, clicking canvas again');
        await page.mouse.click(240, 400);
        await new Promise(r => setTimeout(r, 1500));
        console.log('4. State after click 2:', await page.evaluate(() => window.Game?.GameState?.current));
    }

    // Check visibility again
    const visible2 = await page.evaluate(() => {
        const el = document.getElementById('mode-selector');
        if (!el) return 'NO MODE SELECTOR';
        return `mode-selector: display=${el.style.display}, class=${el.className}, visible=${window.getComputedStyle(el).display !== 'none'}`;
    });
    console.log('5. After interaction:\n' + visible2);

    // Check what onclick handlers might advance the flow
    const clickHandlers = await page.evaluate(() => {
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const events = Object.keys(canvas).filter(k => k.startsWith('on')).join(', ');
            return `Canvas events: ${events}`;
        }
        return 'No canvas';
    });
    console.log('6. ' + clickHandlers);

    // Try forcing the display
    await page.evaluate(() => {
        const ms = document.getElementById('mode-selector');
        if (ms) {
            ms.style.display = '';
            ms.classList.remove('anim-hidden', 'hidden');
        }
    });
    await new Promise(r => setTimeout(r, 500));

    const modeVis = await page.evaluate(() => {
        const el = document.getElementById('mode-pill-story');
        return el ? `story pill visible: ${window.getComputedStyle(el).display !== 'none'}` : 'no pill';
    });
    console.log('7. After forcing display: ' + modeVis);

    // Actually check the INTRO state more carefully - look at the main flow
    const flow = await page.evaluate(() => {
        // Check if IntroScreen has sub-states
        const is = window.Game?.IntroScreen;
        if (is) {
            const props = Object.getOwnPropertyNames(is).filter(k => !k.startsWith('_') && typeof is[k] !== 'function');
            return `IntroScreen props: ${props.join(', ')}`;
        }
        // Try UIManager
        const ui = window.Game?.UIManager;
        if (ui) {
            const props = Object.getOwnPropertyNames(ui).filter(k => !k.startsWith('_') && typeof ui[k] !== 'function');
            return `UIManager props: ${props.join(', ')}`;
        }
        return 'No IntroScreen or UIManager found';
    });
    console.log('8. ' + flow);

    await browser.close();
})();
