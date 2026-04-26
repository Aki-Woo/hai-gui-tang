const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8901;
const STATIC_DIR = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

function serveStatic(req, res) {
  const filePath = path.join(STATIC_DIR, req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

function proxyKimi(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const apiPath = req.url.replace(/^\/kimi-proxy/, '');
    const opts = {
      hostname: 'api.moonshot.cn',
      port: 443,
      path: apiPath,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] || '',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const pr = https.request(opts, pr2 => {
      res.writeHead(pr2.statusCode, { 'Content-Type': 'application/json' });
      pr2.pipe(res);
    });
    pr.on('error', err => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: err.message } }));
    });
    pr.write(body);
    pr.end();
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/kimi-proxy/')) {
    proxyKimi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
