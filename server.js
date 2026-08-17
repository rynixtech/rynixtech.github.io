const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;

const MIME_TYPES = {
    default: 'application/octet-stream',
    html: 'text/html; charset=UTF-8',
    js: 'application/javascript; charset=UTF-8',
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
    json: 'application/json'
};

const server = http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];
    let safePath = path.normalize(url).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '\\' || safePath.endsWith('/') || safePath.endsWith('\\')) safePath = path.join(safePath, 'index.html');
    
    const filePath = path.join(process.cwd(), safePath);
    
    const ext = path.extname(filePath).substring(1).toLowerCase();
    const mimeType = MIME_TYPES[ext] || MIME_TYPES.default;

    try {
        const data = await fs.promises.readFile(filePath);
        res.writeHead(200, { 
            'Content-Type': mimeType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
        res.end(data);
    } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
