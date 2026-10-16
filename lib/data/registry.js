// NEXIS DATA ENGINE: provider registry
//
//   getQuote({ symbol: 'BTC', assetType: 'crypto' })      -> contract quote
//   getHistory({ symbol: 'XAUUSD', limit: 30 })            -> candle series
//   getMacro({ country: 'LK', indicator: 'INFLATION' })    -> contract quote (macro)
//   getNews({ edition: 'lk' })                             -> normalized news items
//
// Callers ask for DATA, never for a PROVIDER. The registry owns the instrument table, the source priority and
// the fallbacks, so providers can be swapped later without touching the UI, NEXIS AI, alerts or the public API.
//
// Source priority (lower level number is tried first when several providers can serve the same instrument):
//   LEVEL 1  Official            (e.g. CBSL / CSE, World Bank)
//   LEVEL 2  Licensed / trusted  (e.g. Twelve Data, Trading Economics, exchanges)
//   LEVEL 3  Reliable secondary  (e.g. ExchangeRate-API, NewsData.io)
//   LEVEL 4  Fallback            (cached or sample data. Must be labelled "estimated"; the engine creates none by itself)
//
// Honesty rule: when no provider can answer, the result is status "unavailable" with value null and a reason.

const { STATUS, makeSource, unavailableQuote, validateQuote } = require('./contract');
const cache = require('./cache/cache');
const binance = require('./providers/binance');
const twelveData = require('./providers/twelveData');
const exchangeRate = require('./providers/exchangeRate');
const tradingEconomics = require('./providers/tradingEconomics');
const worldBank = require('./providers/worldBank');
const cse = require('./providers/cse');
const newsData = require('./providers/newsData');
const nq = require('./normalize/quotes');
const nm = require('./normalize/macro');
const nn = require('./normalize/news');

const PROVIDERS = { binance, twelveData, exchangeRate, tradingEconomics, worldBank, cse, newsData };

// ---- Instrument table: canonical NEXIS symbol -> ordered list of provider routes -----------------------------
// Add an instrument here and every NEXIS surface can serve it. Instruments without a route stay "unavailable"
// until a provider is connected (stocks, most indices, bonds).
const INSTRUMENTS = {
  BTC: { name: 'Bitcoin', assetType: 'crypto', currency: 'USDT', routes: [{ provider: 'binance', providerSymbol: 'BTCUSDT' }] },
  ETH: { name: 'Ethereum', assetType: 'crypto', currency: 'USDT', routes: [{ provider: 'binance', providerSymbol: 'ETHUSDT' }] },
  SOL: { name: 'Solana', assetType: 'crypto', currency: 'USDT', routes: [{ provider: 'binance', providerSymbol: 'SOLUSDT' }] },
  XAUUSD: { name: 'Gold', assetType: 'commodity', currency: 'USD', unit: 'USD/oz', routes: [{ provider: 'twelveData', providerSymbol: 'XAU/USD' }] },
  XAGUSD: { name: 'Silver', assetType: 'commodity', currency: 'USD', unit: 'USD/oz', routes: [{ provider: 'twelveData', providerSymbol: 'XAG/USD' }] },
  EURUSD: { name: 'EUR/USD', assetType: 'forex', currency: 'USD', unit: 'USD per EUR', routes: [{ provider: 'twelveData', providerSymbol: 'EUR/USD' }, { provider: 'exchangeRate', from: 'EUR', to: 'USD' }] },
  GBPUSD: { name: 'GBP/USD', assetType: 'forex', currency: 'USD', unit: 'USD per GBP', routes: [{ provider: 'twelveData', providerSymbol: 'GBP/USD' }, { provider: 'exchangeRate', from: 'GBP', to: 'USD' }] },
  USDJPY: { name: 'USD/JPY', assetType: 'forex', currency: 'JPY', unit: 'JPY per USD', routes: [{ provider: 'twelveData', providerSymbol: 'USD/JPY' }, { provider: 'exchangeRate', from: 'USD', to: 'JPY' }] },
  USDCHF: { name: 'USD/CHF', assetType: 'forex', currency: 'CHF', unit: 'CHF per USD', routes: [{ provider: 'twelveData', providerSymbol: 'USD/CHF' }, { provider: 'exchangeRate', from: 'USD', to: 'CHF' }] },
  AUDUSD: { name: 'AUD/USD', assetType: 'forex', currency: 'USD', unit: 'USD per AUD', routes: [{ provider: 'twelveData', providerSymbol: 'AUD/USD' }, { provider: 'exchangeRate', from: 'AUD', to: 'USD' }] },
  USDLKR: { name: 'USD/LKR', assetType: 'forex', currency: 'LKR', unit: 'LKR per USD', routes: [{ provider: 'exchangeRate', from: 'USD', to: 'LKR' }] },
  ASPI: { name: 'CSE All Share Price Index', assetType: 'index', currency: null, unit: 'index points', routes: [{ provider: 'cse', type: 'aspi' }] }
};
const ALIASES = { GOLD: 'XAUUSD', SILVER: 'XAGUSD', BITCOIN: 'BTC', ETHEREUM: 'ETH', BTCUSDT: 'BTC', ETHUSDT: 'ETH' };

function canonical(symbol) {
  const s = String(symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return ALIASES[s] || s;
}

// ---- How each route is executed: fetch (cached at provider level) then normalize ----------------------------
const ROUTES = {
  binance: (r, ins) => cache.remember(`binance:24h:${r.providerSymbol}`, cache.TTL.LIVE_QUOTE, () => binance.ticker24h(r.providerSymbol)).then(raw => nq.fromBinance24h(raw, ins)),
  twelveData: (r, ins) => cache.remember(`td:1day:2:${r.providerSymbol}`, cache.TTL.PROVIDER_DAILY, () => twelveData.timeSeries(r.providerSymbol, '1day', 2)).then(raw => nq.fromTwelveSeries(raw, ins, r)),
  // ExchangeRate-API: ONE cached call serves every currency pair
  exchangeRate: (r, ins) => cache.remember('fx:latest:USD', cache.TTL.FX_DAILY, () => exchangeRate.latest('USD')).then(raw => nq.fromExchangeRate(raw, r.from, r.to, ins)),
  cse: (r, ins) => cache.remember(`cse:${r.type}`, cache.TTL.MARKET_QUOTE, () => cse.get(r.type)).then(raw => nq.fromCseAspi(raw, ins))
};

async function getQuote({ symbol, assetType } = {}) {
  const sym = canonical(symbol), ins = INSTRUMENTS[sym];
  if (!ins) return unavailableQuote({ symbol: sym || String(symbol || ''), assetType: assetType || 'stock', reason: 'no_provider_for_symbol' });
  const instrument = { symbol: sym, ...ins };
  const attempts = [];
  for (const route of ins.routes) {
    const p = PROVIDERS[route.provider];
    if (!p.isConfigured()) { attempts.push({ provider: route.provider, error: 'not_configured' }); continue; }
    try {
      const q = await ROUTES[route.provider](route, instrument);
      const problems = validateQuote(q);
      if (problems.length) throw new Error('contract: ' + problems.join(', '));
      return q;
    } catch (e) { attempts.push({ provider: route.provider, error: e.code || e.message }); }
  }
  return unavailableQuote({ symbol: sym, assetType: ins.assetType, reason: 'all_providers_failed', attempts });
}

async function getHistory({ symbol, limit = 30 } = {}) {
  const sym = canonical(symbol), ins = INSTRUMENTS[sym];
  const empty = reason => ({ symbol: sym, assetType: ins ? ins.assetType : null, interval: '1d', status: STATUS.UNAVAILABLE, source: makeSource({ name: 'none', type: 'none' }), points: [], metadata: { reason } });
  if (!ins) return empty('no_provider_for_symbol');
  const instrument = { symbol: sym, ...ins };
  for (const route of ins.routes) {
    const p = PROVIDERS[route.provider];
    if (!p.isConfigured()) continue;
    try {
      if (route.provider === 'binance') return nq.seriesFromBinance(await cache.remember(`binance:kl:${route.providerSymbol}:${limit}`, cache.TTL.MARKET_QUOTE, () => binance.klines(route.providerSymbol, '1d', limit)), instrument);
      if (route.provider === 'twelveData') return nq.seriesFromTwelve(await cache.remember(`td:1day:${limit}:${route.providerSymbol}`, cache.TTL.PROVIDER_DAILY, () => twelveData.timeSeries(route.providerSymbol, '1day', limit)), instrument);
    } catch (e) { /* try the next route */ }
  }
  return empty('all_providers_failed');
}

async function getMacro({ country, indicator } = {}) {
  const key = String(indicator || '').toUpperCase(), def = worldBank.INDICATORS[key], cc = String(country || '').toUpperCase();
  const sym = `${cc}.${key}`;
  if (!def || !/^[A-Z]{2,3}$/.test(cc)) return unavailableQuote({ symbol: sym, assetType: 'macro', reason: 'unknown_country_or_indicator' });
  try {
    const raw = await cache.remember(`wb:${cc}:${def.id}`, cache.TTL.MACRO_ANNUAL, () => worldBank.indicator(cc, def.id, 8));
    return nm.fromWorldBank(raw, cc, key);
  } catch (e) {
    return unavailableQuote({ symbol: sym, assetType: 'macro', reason: 'provider_failed', source: makeSource({ name: worldBank.meta.name, type: worldBank.meta.type, url: worldBank.meta.url, level: worldBank.meta.level }), attempts: [{ provider: 'worldBank', error: e.code || e.message }] });
  }
}

async function getNews({ edition = 'global' } = {}) {
  if (!newsData.isConfigured()) return { status: STATUS.UNAVAILABLE, edition, items: [], metadata: { reason: 'not_configured', provider: 'newsData' } };
  try {
    const raw = await cache.remember(`news:${edition}`, cache.TTL.NEWS, () => newsData.latest(edition));
    return { status: STATUS.LIVE, edition, items: nn.fromNewsData(raw, edition), metadata: {} };
  } catch (e) {
    return { status: STATUS.UNAVAILABLE, edition, items: [], metadata: { reason: e.code || e.message, provider: 'newsData' } };
  }
}

// Diagnostics: which providers exist and which have their server key configured. Never exposes key values.
function describeProviders() {
  return Object.values(PROVIDERS).map(p => ({ id: p.meta.id, name: p.meta.name, level: p.meta.level, type: p.meta.type, requiresKey: p.meta.env, configured: p.isConfigured() }));
}
function listInstruments() {
  return Object.entries(INSTRUMENTS).map(([symbol, i]) => ({ symbol, name: i.name, assetType: i.assetType, providers: i.routes.map(r => r.provider) }));
}

module.exports = { getQuote, getHistory, getMacro, getNews, describeProviders, listInstruments, canonical };
