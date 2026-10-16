// NEXIS DATA ENGINE: data contract
// Every number that leaves the engine is wrapped in the same shape, so the UI, NEXIS AI, alerts and the public API
// can always show WHERE a value came from, HOW FRESH it is and WHAT it measures.
//
//   { value, currency, unit, symbol, assetType, timestamp, source, status, frequency, historical, country, metadata }
//
// Rule: if a value cannot be obtained from a real provider the engine returns status "unavailable" with value null.
// It never invents or estimates a number by itself.

const STATUS = Object.freeze({
  LIVE: 'live',               // streaming / near real-time from the venue or provider
  DELAYED: 'delayed',         // delayed, end-of-day or daily reference value
  HISTORICAL: 'historical',   // a published statistic for a past period (e.g. annual GDP growth)
  ESTIMATED: 'estimated',     // modelled / forecast values supplied by a provider (never created by NEXIS)
  UNAVAILABLE: 'unavailable'  // no trustworthy value could be obtained
});

const ASSET_TYPES = Object.freeze(['stock', 'index', 'forex', 'commodity', 'crypto', 'bond', 'macro', 'rate']);
const FREQUENCIES = Object.freeze(['realtime', 'intraday', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'irregular']);

// Source hierarchy (see registry.js): 1 official, 2 licensed/trusted provider, 3 reliable secondary, 4 fallback
const SOURCE_LEVELS = Object.freeze({ OFFICIAL: 1, LICENSED: 2, SECONDARY: 3, FALLBACK: 4 });

function makeSource({ name, type = 'provider', url = null, level = null, retrievedAt = new Date().toISOString() }) {
  return { name, type, url, level, retrievedAt };
}

function makeQuote(o) {
  return {
    value: o.value ?? null,
    currency: o.currency ?? null,
    unit: o.unit ?? null,
    symbol: o.symbol,
    assetType: o.assetType,
    timestamp: o.timestamp ?? null,
    source: o.source,
    status: o.status,
    frequency: o.frequency ?? null,
    historical: !!o.historical,
    country: o.country ?? null,
    metadata: o.metadata || {}
  };
}

function unavailableQuote({ symbol, assetType, reason, source, attempts }) {
  return makeQuote({
    value: null, symbol, assetType, status: STATUS.UNAVAILABLE, historical: false,
    source: source || makeSource({ name: 'none', type: 'none' }),
    metadata: { reason, ...(attempts && attempts.length ? { attempts } : {}) }
  });
}

// Returns a list of problems; an empty list means the object follows the contract.
function validateQuote(q) {
  const errs = [];
  if (!q || typeof q !== 'object') return ['not an object'];
  if (!q.symbol) errs.push('symbol missing');
  if (!ASSET_TYPES.includes(q.assetType)) errs.push('assetType invalid: ' + q.assetType);
  if (!Object.values(STATUS).includes(q.status)) errs.push('status invalid: ' + q.status);
  if (!q.source || !q.source.name) errs.push('source.name missing');
  if (q.status !== STATUS.UNAVAILABLE) {
    if (typeof q.value !== 'number' || !isFinite(q.value)) errs.push('value must be a finite number');
    if (!q.timestamp || isNaN(Date.parse(q.timestamp))) errs.push('timestamp must be an ISO date');
    if (q.frequency && !FREQUENCIES.includes(q.frequency)) errs.push('frequency invalid: ' + q.frequency);
  } else if (q.value !== null) errs.push('unavailable quotes must have value null');
  return errs;
}

module.exports = { STATUS, ASSET_TYPES, FREQUENCIES, SOURCE_LEVELS, makeSource, makeQuote, unavailableQuote, validateQuote };
