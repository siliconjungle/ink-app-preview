import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const publicRoot = resolve('public'), testRoot = resolve('tests');
const types = {'.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.woff2':'font/woff2'};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const testing = url.pathname.startsWith('/tests/');
    const root = testing ? testRoot : publicRoot;
    const path = resolve(root, '.' + decodeURIComponent(testing ? url.pathname.slice(6) : url.pathname));
    if (!path.startsWith(root + sep)) throw Error('Invalid path');
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch {res.writeHead(404); res.end('Not found');}
}).listen(4636, '127.0.0.1', () => console.log('Browser checks: http://127.0.0.1:4636/tests/browser.html'));
