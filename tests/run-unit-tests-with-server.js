const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8'
};

function safePath(urlPath) {
    const relativePath = decodeURIComponent(urlPath.split('?')[0]);
    const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
    return path.join(rootDir, normalizedPath === path.sep ? 'index.html' : normalizedPath);
}

function sendFile(filePath, response) {
    fs.readFile(filePath, (error, data) => {
        if (error) {
            response.writeHead(error.code === 'ENOENT' ? 404 : 500);
            response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        response.writeHead(200, {
            'Content-Type': contentTypes[ext] || 'application/octet-stream'
        });
        response.end(data);
    });
}

function createServer() {
    return http.createServer((request, response) => {
        const requestPath = request.url === '/' ? '/index.html' : request.url;
        const filePath = safePath(requestPath);

        fs.stat(filePath, (error, stats) => {
            if (error) {
                response.writeHead(404);
                response.end('Not found');
                return;
            }

            const targetPath = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
            sendFile(targetPath, response);
        });
    });
}

async function main() {
    const server = createServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const child = spawn(process.execPath, [path.join(__dirname, 'run-unit-tests.js')], {
        cwd: rootDir,
        env: { ...process.env, TEST_BASE_URL: baseUrl },
        stdio: 'inherit'
    });

    const exitCode = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', code => resolve(code ?? 1));
    });

    await new Promise((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
    });

    process.exit(exitCode);
}

main().catch(error => {
    console.error('Unable to run unit tests:', error);
    process.exit(1);
});
