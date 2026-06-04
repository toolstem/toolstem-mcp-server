import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { FmpClient } from '../dist/services/fmp.js';

// A tiny mock FMP server: records which paths are requested and returns a
// canned quote for /quote, and 402 for the (now unused) /batch-quote endpoint.
let server;
let baseUrl;
const requestedPaths = [];

before(async () => {
  server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    requestedPaths.push(u.pathname);
    if (u.pathname === '/quote') {
      const symbol = u.searchParams.get('symbol') ?? 'UNKNOWN';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([{ symbol, price: 100, marketCap: 1000, volume: 5 }]));
      return;
    }
    if (u.pathname === '/batch-quote') {
      // Simulate the paywalled endpoint — should NEVER be called now.
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 'Error Message': 'Payment required' }));
      return;
    }
    res.writeHead(404);
    res.end('[]');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('batch-quote replacement (F: paywalled endpoint)', () => {
  it('getBatchQuote uses per-symbol /quote, never /batch-quote', async () => {
    requestedPaths.length = 0;
    const client = new FmpClient('test-key', baseUrl);
    const quotes = await client.getBatchQuote(['AAPL', 'MSFT', 'GOOGL']);

    assert.strictEqual(quotes.length, 3, 'should return a quote per symbol');
    assert.ok(
      requestedPaths.every((p) => p === '/quote'),
      `expected only /quote requests, saw: ${[...new Set(requestedPaths)].join(', ')}`,
    );
    assert.ok(
      !requestedPaths.includes('/batch-quote'),
      'must not call the paywalled /batch-quote endpoint',
    );
  });

  it('getBatchQuote returns [] for empty input without any request', async () => {
    requestedPaths.length = 0;
    const client = new FmpClient('test-key', baseUrl);
    const quotes = await client.getBatchQuote([]);
    assert.deepStrictEqual(quotes, []);
    assert.strictEqual(requestedPaths.length, 0);
  });
});
