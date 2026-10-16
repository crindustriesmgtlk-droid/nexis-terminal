// STEP 04 API integration test: /api/quote delegates to the NEXIS Data Engine
// and preserves the legacy { status, symbol, values[] } response shape.
const assert = require('assert');
const handler = require('../api/quote');
const data = require('../lib/data');

const oldFetch = global.fetch;
const oldKey = process.env.TWELVE_DATA_KEY;
process.env.TWELVE_DATA_KEY = 'test-only-secret';

global.fetch = async (url) => {
  url = String(url);
  if (url.includes('api.twelvedata.com')) {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        meta: { symbol: 'EUR/USD', interval: '1day' },
        values: [
          { datetime: '2026-10-16', open: '1.18', high: '1.19', low: '1.17', close: '1.185' },
          { datetime: '2026-10-15', open: '1.17', high: '1.18', low: '1.16', close: '1.175' }
        ],
        status: 'ok'
      })
    };
  }
  return { ok: false, status: 500, text: async () => '{}' };
};

data.cache.clear();

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(k, v) { this.headers[k] = v; },
    json(v) { this.body = v; return this; }
  };
}

(async () => {
  const res = makeRes();
  await handler({ query: { symbol: 'EUR/USD', size: '2' } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'ok');
  assert.strictEqual(res.body.symbol, 'EUR/USD');
  assert.strictEqual(res.body.values.length, 2);
  assert.strictEqual(res.body.values[0].datetime, '2026-10-16');
  assert.strictEqual(res.body.values[0].close, 1.185);
  assert.strictEqual(res.body.values[1].close, 1.175);
  assert.strictEqual(res.body.nexis.source.name, 'Twelve Data');
  assert.strictEqual(res.body.nexis.status, 'historical');
  assert.ok(res.headers['Cache-Control'].includes('s-maxage='));
  assert.ok(!JSON.stringify(res.body).includes('test-only-secret'));

  console.log('PASS /api/quote uses Data Engine and preserves legacy response shape');
})()
  .catch(err => { console.error('FAIL /api/quote integration:', err.message); process.exitCode = 1; })
  .finally(() => {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.TWELVE_DATA_KEY;
    else process.env.TWELVE_DATA_KEY = oldKey;
  });
