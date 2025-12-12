import { createServer } from 'http';
import { URL } from 'url';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  console.log(`[proxy] ${req.method} ${url.pathname}`);

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ detail: 'Method Not Allowed' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    try {
      const apiKeyHeader = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY || process.env.MODELGATE_API_KEY || apiKeyHeader;
      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing API Key' }));
        return;
      }

      const map = {
        '/v1/chat/completions': 'https://api.openai.com/v1/chat/completions',
        '/v1/responses': 'https://api.openai.com/v1/responses',
        '/api/v1/images/generations': 'https://mg.aid.pub/api/v1/images/generations'
      };
      const target = map[url.pathname];
      if (!target) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not Found' }));
        return;
      }

      const r = await fetch(target, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body
      });
      const text = await r.text();
      console.log(`[proxy] -> ${r.status} (${text.length} bytes)`);
      res.statusCode = r.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(text);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(e) }));
    }
  });
});

server.listen(PORT);
