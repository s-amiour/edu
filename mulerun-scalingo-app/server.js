const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('redis');

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.SCALINGO_REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL = 10; // seconds

// --- Redis client ---
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected');
});

(async () => {
  await redisClient.connect();
})();

// --- Cache helper ---
async function withCache(key, fetchFn) {
  try {
    const cached = await redisClient.get(key);
    if (cached !== null) {
      console.log(`[Cache] HIT  – ${key}`);
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('[Cache] Read error, falling through:', err.message);
  }

  const data = await fetchFn();

  try {
    await redisClient.setEx(key, CACHE_TTL, JSON.stringify(data));
    console.log(`[Cache] MISS – ${key} (stored, TTL ${CACHE_TTL}s)`);
  } catch (err) {
    console.warn('[Cache] Write error:', err.message);
  }

  return data;
}

// --- Request handler ---
async function handleRequest(req, res) {
  if (req.url === '/api/data') {
    const data = await withCache('api:data', async () => {
      // Simulated data source – replace with real logic
      return {
        timestamp: new Date().toISOString(),
        items: [
          { id: 1, name: 'Alpha', value: Math.round(Math.random() * 100) },
          { id: 2, name: 'Beta', value: Math.round(Math.random() * 100) },
          { id: 3, name: 'Gamma', value: Math.round(Math.random() * 100) },
        ],
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  // Static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'public', filePath);

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// --- Server ---
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('[Server] Unhandled error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  });
});

server.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});
