// Run with:  node tests/data-engine.test.js
// Uses a mocked fetch, so no network access or real API keys are needed.
const assert = require('assert');
let calls = [];
const respond = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
global.fetch = async (url) => {
  url = String(url); calls.push(url);
  if (url.includes('api.binance.com') && url.includes('/ticker/24hr')) return respond({ symbol: 'BTCUSDT', lastPrice: '84000.50', priceChangePercent: '1.25', highPrice: '85000', lowPrice: '83000', quoteVolume: '48000000000', closeTime: 1792130000000 });
  if (url.includes('api.binance.com') && url.includes('/klines')) return respond([[1792000000000, '1', '2', '0.5', '1.5', '100'], [1792086400000, '1.5', '2.5', '1', '2', '120']]);
  if (url.includes('api.twelvedata.com')) return respond({ meta: { symbol: 'XAU/USD', interval: '1day' }, values: [{ datetime: '2026-10-16', open: '4170', high: '4200', low: '4150', close: '4182.65' }, { datetime: '2026-10-15', open: '4150', high: '4180', low: '4120', close: '4170.10' }], status: 'ok' });
  if (url.includes('v6.exchangerate-api.com')) return respond({ result: 'success', time_last_update_unix: 1792108801, time_next_update_utc: 'Sat, 17 Oct 2026 00:00:01 +0000', conversion_rates: { USD: 1, LKR: 330, EUR: 0.9, GBP: 0.78 } });
  if (url.includes('api.worldbank.org')) return respond([{ page: 1 }, [{ date: '2025', value: null, indicator: { value: 'Inflation, consumer prices (annual %)' } }, { date: '2024', value: 1.2, indicator: { value: 'Inflation, consumer prices (annual %)' } }, { date: '2023', value: 17.4 }]]);
  if (url.includes('newsdata.io')) return respond({ status: 'success', results: [{ title: 'Rupee steady', link: 'https://example.com/a', description: '<p>Calm</p>', pubDate: '2026-10-16 04:30:00', source_name: 'Daily FT', image_url: null }] });
  return respond({ error: 'unexpected url' }, 500);
};
for (const k of ['TWELVE_DATA_KEY', 'EXCHANGERATE_API_KEY', 'NEWSDATA_API_KEY', 'TE_API_KEY']) delete process.env[k];

const data = require('../lib/data');
const { validateQuote, STATUS } = data.contract;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('crypto quote: live, follows contract, source attached', async () => {
  const q = await data.getQuote({ symbol: 'BTC', assetType: 'crypto' });
  assert.deepStrictEqual(validateQuote(q), []);
  assert.strictEqual(q.value, 84000.5); assert.strictEqual(q.status, STATUS.LIVE);
  assert.strictEqual(q.source.name, 'Binance'); assert.strictEqual(q.metadata.providerSymbol, 'BTCUSDT');
});
test('alias normalisation: bitcoin / BTCUSDT / btc resolve to the same instrument', () => {
  assert.strictEqual(data.canonical('bitcoin'), 'BTC'); assert.strictEqual(data.canonical('BTCUSDT'), 'BTC');
  assert.strictEqual(data.canonical('USD/LKR'), 'USDLKR'); assert.strictEqual(data.canonical('gold'), 'XAUUSD');
});
test('no key configured -> unavailable with value null, nothing invented', async () => {
  const q = await data.getQuote({ symbol: 'XAUUSD' });
  assert.strictEqual(q.status, STATUS.UNAVAILABLE); assert.strictEqual(q.value, null);
  assert.strictEqual(q.metadata.attempts[0].error, 'not_configured'); assert.deepStrictEqual(validateQuote(q), []);
});
test('unknown / unsupported symbol (AAPL) -> unavailable, not fake data', async () => {
  const q = await data.getQuote({ symbol: 'AAPL', assetType: 'stock' });
  assert.strictEqual(q.status, STATUS.UNAVAILABLE); assert.strictEqual(q.value, null); assert.strictEqual(q.metadata.reason, 'no_provider_for_symbol');
});
test('with Twelve Data key: gold is delayed daily value with previous close', async () => {
  process.env.TWELVE_DATA_KEY = 'td-secret-123';
  const q = await data.getQuote({ symbol: 'XAUUSD' });
  assert.deepStrictEqual(validateQuote(q), []); assert.strictEqual(q.value, 4182.65);
  assert.strictEqual(q.status, STATUS.DELAYED); assert.strictEqual(q.metadata.previousClose, 4170.1); assert.strictEqual(q.unit, 'USD/oz');
});
test('fallback: Twelve Data missing -> ExchangeRate-API serves EUR/USD', async () => {
  delete process.env.TWELVE_DATA_KEY; process.env.EXCHANGERATE_API_KEY = 'fx-secret-456'; data.cache.clear();
  const q = await data.getQuote({ symbol: 'EUR/USD' });
  assert.deepStrictEqual(validateQuote(q), []); assert.ok(Math.abs(q.value - 1 / 0.9) < 1e-9); assert.strictEqual(q.source.name, 'ExchangeRate-API');
});
test('USD/LKR from daily reference rates', async () => {
  const q = await data.getQuote({ symbol: 'usd/lkr' });
  assert.strictEqual(q.value, 330); assert.strictEqual(q.currency, 'LKR'); assert.strictEqual(q.frequency, 'daily');
});
test('macro: World Bank skips empty latest year and reports previous year', async () => {
  const q = await data.getMacro({ country: 'lk', indicator: 'inflation' });
  assert.deepStrictEqual(validateQuote(q), []); assert.strictEqual(q.value, 1.2); assert.strictEqual(q.metadata.period, '2024');
  assert.strictEqual(q.metadata.previousValue, 17.4); assert.strictEqual(q.status, STATUS.HISTORICAL); assert.strictEqual(q.country, 'LK');
});
test('macro: bad input is rejected safely', async () => {
  const q = await data.getMacro({ country: 'lk;drop', indicator: 'INFLATION' });
  assert.strictEqual(q.status, STATUS.UNAVAILABLE);
});
test('cache: simultaneous requests cause ONE provider call', async () => {
  data.cache.clear(); calls = [];
  await Promise.all(Array.from({ length: 25 }, () => data.getQuote({ symbol: 'ETH' })));
  assert.strictEqual(calls.filter(u => u.includes('/ticker/24hr')).length, 1);
});
test('cache: failures are not cached', async () => {
  data.cache.clear(); let n = 0; const real = global.fetch;
  global.fetch = async (u) => (++n === 1 ? respond({}, 500) : real(u));
  const first = await data.getQuote({ symbol: 'SOL' }); const second = await data.getQuote({ symbol: 'SOL' });
  global.fetch = real;
  assert.strictEqual(first.status, STATUS.UNAVAILABLE); assert.strictEqual(second.status, STATUS.LIVE);
});
test('history: Binance candles come back oldest-first with source', async () => {
  const h = await data.getHistory({ symbol: 'BTC', limit: 2 });
  assert.strictEqual(h.points.length, 2); assert.strictEqual(h.points[1].c, 2); assert.strictEqual(h.source.name, 'Binance');
});
test('news: unconfigured -> unavailable; configured -> normalized with real publisher credit', async () => {
  const off = await data.getNews({ edition: 'lk' }); assert.strictEqual(off.status, STATUS.UNAVAILABLE);
  process.env.NEWSDATA_API_KEY = 'news-secret-789'; data.cache.clear();
  const on = await data.getNews({ edition: 'lk' });
  assert.strictEqual(on.items[0].publisher.name, 'Daily FT'); assert.strictEqual(on.items[0].summary, 'Calm'); assert.strictEqual(on.items[0].publishedAt, '2026-10-16T04:30:00.000Z');
});
test('SECURITY: secrets never appear in any result', async () => {
  const blob = JSON.stringify([await data.getQuote({ symbol: 'XAUUSD' }), await data.getQuote({ symbol: 'EURUSD' }), await data.getNews({ edition: 'lk' }), data.describeProviders()]);
  for (const s of ['td-secret-123', 'fx-secret-456', 'news-secret-789']) assert.ok(!blob.includes(s), 'leaked ' + s);
  assert.ok(!blob.includes('apikey='));
});
test('provider list reports configuration without values', () => {
  const p = data.describeProviders().find(x => x.id === 'newsData'); assert.strictEqual(p.configured, true); assert.strictEqual(p.requiresKey, 'NEWSDATA_API_KEY');
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('  PASS  ' + name); } catch (e) { failed++; console.log('  FAIL  ' + name + '\n        ' + e.message); }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
