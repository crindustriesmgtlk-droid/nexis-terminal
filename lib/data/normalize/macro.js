// Macro-economic normalizers (World Bank, Trading Economics).
const { STATUS, makeQuote, makeSource } = require('../contract');
const wb = require('../providers/worldBank');
const te = require('../providers/tradingEconomics').meta;
const { num, pick } = require('./quotes');

const src = (m) => makeSource({ name: m.name, type: m.type, url: m.url, level: m.level });

// World Bank indicator -> one macro value (latest non-empty year) plus the previous year for context
function fromWorldBank(raw, countryCode, indicatorKey) {
  const def = wb.INDICATORS[indicatorKey];
  const rows = ((raw && raw[1]) || []).filter(r => r.value !== null && r.value !== undefined);
  if (!def || !rows.length) throw new Error('World Bank: no data');
  const [a, b] = rows;
  return makeQuote({
    value: num(a.value), currency: def.currency, unit: def.unit,
    symbol: `${countryCode.toUpperCase()}.${indicatorKey}`, assetType: 'macro',
    timestamp: `${a.date}-12-31T00:00:00Z`, source: src(wb.meta),
    status: STATUS.HISTORICAL, frequency: 'annual', historical: true, country: countryCode.toUpperCase(),
    metadata: { indicatorId: def.id, indicatorName: a.indicator && a.indicator.value, period: a.date, previousValue: b ? num(b.value) : null, previousPeriod: b ? b.date : null }
  });
}

// Trading Economics /markets/<category> -> list of quotes (display licence is the caller's responsibility)
function fromTradingEconomicsMarkets(rows, assetType) {
  return (Array.isArray(rows) ? rows : []).map(r => {
    const v = num(pick(r, ['Last', 'Close']));
    if (v === null) return null;
    return makeQuote({
      value: v, currency: null, unit: null, symbol: String(pick(r, ['Symbol', 'Ticker']) || pick(r, ['Name'])), assetType,
      timestamp: pick(r, ['Date']) ? new Date(pick(r, ['Date'])).toISOString() : new Date().toISOString(), source: src(te),
      status: STATUS.DELAYED, frequency: 'intraday', historical: false,
      metadata: { name: pick(r, ['Name']), dailyChangePct: num(pick(r, ['DailyPercentualChange'])), fieldMapping: 'unverified' }
    });
  }).filter(Boolean);
}

module.exports = { fromWorldBank, fromTradingEconomicsMarkets };
