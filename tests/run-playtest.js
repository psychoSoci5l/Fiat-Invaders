const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const GAME_DIR = '/home/psychosocial/Documenti/Claude Studios/fiatvscrypto';
const PORT = 8765;

// Simple static file server
function startServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            let filePath = path.join(GAME_DIR, req.url);
            if (fs.existsSync(filePath)) {
                const ext = path.extname(filePath);
                const types = {
                    '.html': 'text/html',
                    '.js': 'application/javascript',
                    '.css': 'text/css',
                };
                res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
                fs.createReadStream(filePath).pipe(res);
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        server.listen(PORT, () => resolve(server));
    });
}

async function runTests() {
    const server = await startServer();
    console.log(`Server running on port ${PORT}`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Capture console output
    const testResults = [];
    const errors = [];
    page.on('console', (msg) => {
        if (msg.text().includes('TEST_RESULT')) {
            testResults.push(msg.text().replace('TEST_RESULT:', ''));
        }
    });
    page.on('pageerror', (err) => {
        errors.push(err.message);
    });

    try {
        await page.goto(`http://localhost:${PORT}/tests/runner.html`, {
            waitUntil: 'networkidle0',
            timeout: 30000,
        });

        // Wait for tests to complete
        await page.waitForFunction(
            () => document.querySelector('#summary') && document.querySelector('#summary').textContent.includes('completed'),
            { timeout: 30000 }
        );

        // Get test results
        const summary = await page.evaluate(() => {
            const el = document.querySelector('#summary');
            return el ? el.textContent : 'No summary found';
        });

        const results = await page.evaluate(() => {
            const results = document.querySelectorAll('.test');
            return Array.from(results).map(r => r.textContent);
        });

        // Get failures specifically
        const failures = await page.evaluate(() => {
            const fails = document.querySelectorAll('.test.fail');
            return Array.from(fails).map(f => f.textContent);
        });

        console.log('\n=== TEST SUMMARY ===');
        console.log(summary);
        console.log('\n=== DETAILED RESULTS ===');
        results.forEach(r => console.log(r));

        // Check for failures
        if (failures.length > 0) {
            console.log('\n=== FAILURES ===');
            failures.forEach(f => console.log(f));
            process.exitCode = 1;
        }

    } catch (err) {
        console.error('Test execution failed:', err.message);
        
        // Fallback: try to get whatever results we can
        try {
            const content = await page.content();
            const match = content.match(/<div id="summary"[^>]*>(.*?)<\/div>/s);
            if (match) {
                console.log('\n=== SUMMARY (from HTML) ===');
                console.log(match[1].replace(/<[^>]+>/g, ''));
            }
            
            // Extract failures
            const failMatches = content.match(/<div class="test fail">(.*?)<\/div>/g);
            if (failMatches && failMatches.length > 0) {
                console.log('\n=== FAILURES ===');
                failMatches.forEach(f => console.log(f.replace(/<[^>]+>/g, '')));
            }
            
            // Show any JS errors
            if (errors.length > 0) {
                console.log('\n=== PAGE ERRORS ===');
                errors.forEach(e => console.log(e));
            }
        } catch (e) {
            console.error('Could not extract results:', e.message);
        }
    } finally {
        await browser.close();
        server.close();
    }
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
