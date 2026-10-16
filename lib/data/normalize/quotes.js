// Normalizers turn RAW provider responses into the NEXIS contract (see ../contract.js).
// Providers know nothing about NEXIS and NEXIS code never touches raw provider JSON.
const { STATUS, makeQuote, makeSource } = require('../contract');
const binance = require('../providers/binance').meta;
const twelve = require('../providers/twelveData').meta;
const fx = require('../providers/exchangeRate').meta;
const cse = require('../providers/cse').meta;

const src = (m, extra) => makeSource({ name: m.name, type: m.type, url: m.url, level: m.level, ...(extra || {}) });
const num = v => { const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : v; return typeof n === 'number' && isFinite(n) ? n : null; };
const pick = (o, keys) => { for (const k of keys) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return undefined; };
const isoFromTD = d => { const s = String(d); return s.length <= 10 ? `${s}T00:00:00Z` : `${s.replace(' ', 'T')}Z`; };

// Binance 24h ticker -> crypto quote (live)
function fromBinance24h(raw, ins) {
  const v = num(raw.lastPrice);
  if (v === null) throw new Error('Binance: no price');
  return makeQuote({
    value: v, currency: 'USDT', unit: 'USDT', symbol: ins.symbol, assetType: ins.assetType,
    timestamp: new Date(raw.closeTime || Date.now()).toISOString(), source: src(binance),
    status: STATUS.LIVE, frequency: 'realtime', historical: false,
    metadata: { providerSymbol: raw.symbol, change24hPct: num(raw.priceChangePercent), high24h: num(raw.highPrice), low24h: num(raw.lowPrice), volume24hQuote: num(raw.quoteVolume) }
  });
}

// Twelve Data daily series -> forex/commodity quote (latest daily candle = delayed)
function fromTwelveSeries(raw, ins, route) {
  const rows = Array.isArray(raw.values) ? raw.values : [];
  const last = rows[0], prev = rows[1];
  const v = last ? num(last.close) : null;
  if (v === null) throw new Error('Twelve Data: no candle');
  return makeQuote({
    value: v, currency: ins.currency || null, unit: ins.unit || null, symbol: ins.symbol, assetType: ins.assetType,
    timestamp: isoFromTD(last.datetime), source: src(twelve),
    status: STATUS.DELAYED, frequency: 'daily', historical: false,
    metadata: { providerSymbol: route.providerSymbol, open: num(last.open), high: num(last.high), low: num(last.low), previousClose: prev ? num(prev.close) : null, interval: raw.meta && raw.meta.interval }
  });
}

// ExchangeRate-API daily reference rate (all rates are per 1 USD in the response)
function fromExchangeRate(raw, from, to, ins) {
  const r = raw.conversion_rates || {};
  if (!r[from] || !r[to]) throw new Error('ExchangeRate-API: currency missing');
  return makeQuote({
    value: r[to] / r[from], currency: to, unit: `${to} per ${from}`, symbol: ins.symbol, assetType: ins.assetType,
    timestamp: new Date((raw.time_last_update_unix || Date.now() / 1000) * 1000).toISOString(), source: src(fx),
    status: STATUS.DELAYED, frequency: 'daily', historical: false, country: null,
    metadata: { base: from, quote: to, nextUpdateUtc: raw.time_next_update_utc || null, note: 'Daily reference rate, not a live trading price' }
  });
}

// CSE ASPI. Field names are read defensively because the endpoint is undocumented.
function fromCseAspi(raw, ins) {
  const o = Array.isArray(raw) ? raw[0] : (raw && (raw.data || raw.result)) || raw;
  const v = num(pick(o, ['value', 'indexValue', 'lastValue', 'last', 'close']));
  if (v === null) throw new Error('CSE: ASPI value not found');
  return makeQuote({
    value: v, currency: null, unit: 'index points', symbol: ins.symbol, assetType: ins.assetType,
    timestamp: new Date().toISOString(), source: src(cse),
    status: STATUS.DELAYED, frequency: 'intraday', historical: false, country: 'LK',
    metadata: { change: num(pick(o, ['change', 'indexChange'])), changePct: num(pick(o, ['percentage', 'percentageChange', 'changePercentage'])), fieldMapping: 'unverified' }
  });
}

// Candle series (history). Binance rows: [openTime, o, h, l, c, v, ...]; Twelve Data rows are objects.
function seriesFromBinance(rows, ins) {
  return {
    symbol: ins.symbol, assetType: ins.assetType, interval: '1d', source: src(binance), status: STATUS.HISTORICAL,
    points: rows.map(r => ({ t: new Date(r[0]).toISOString(), o: num(r[1]), h: num(r[2]), l: num(r[3]), c: num(r[4]), v: num(r[5]) }))
  };
}
function seriesFromTwelve(raw, ins) {
  return {
    symbol: ins.symbol, assetType: ins.assetType, interval: '1d', source: src(twelve), status: STATUS.HISTORICAL,
    points: (raw.values || []).map(r => ({ t: isoFromTD(r.datetime), o: num(r.open), h: num(r.high), l: num(r.low), c: num(r.close), v: num(r.volume) })).reverse()
  };
}

module.exports = { fromBinance24h, fromTwelveSeries, fromExchangeRate, fromCseAspi, seriesFromBinance, seriesFromTwelve, num, pick };
