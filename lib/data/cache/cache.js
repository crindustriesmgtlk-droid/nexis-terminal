// NEXIS DATA ENGINE: cache
//
// Two layers work together (no paid database needed):
//   1. CDN cache: API endpoints send "Cache-Control: s-maxage=..." so Vercel's edge serves repeated requests
//      without running the function at all. This is the layer that protects provider quotas and cost.
//   2. In-memory cache inside a warm serverless instance (this file): de-duplicates identical provider calls that
//      arrive together (1,000 users, 1 provider call) and survives between requests while the instance is warm.
//      It is best-effort only: every cold start begins empty and instances do not share memory.
//
// Failed lookups are never cached, so a provider outage is retried on the next request.

// Freshness classes, in seconds. Pick the class that matches how often the underlying value really changes.
const TTL = Object.freeze({
  LIVE_QUOTE: 15,          // crypto and other streaming prices
  MARKET_QUOTE: 60,        // exchange data refreshed every minute
  PROVIDER_DAILY: 300,     // provider daily candles with strict API quotas (Twelve Data)
  FX_DAILY: 3 * 3600,      // daily reference FX rates (ExchangeRate-API updates once a day)
  NEWS: 600,
  MACRO_ANNUAL: 24 * 3600, // annual statistics change a few times a year
  POLICY_RATE: 6 * 3600,   // changes only at policy meetings
  STATIC: 7 * 86400
});

const MAX_ENTRIES = 500;
const store = new Map();     // key -> { value, expires }
const inflight = new Map();  // key -> Promise (request de-duplication)

async function remember(key, ttlSeconds, loader) {
  const now = Date.now(), hit = store.get(key);
  if (hit && hit.expires > now) return hit.value;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    const value = await loader();                       // throws on failure, so nothing bad is cached
    if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value); // drop the oldest entry
    store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    return value;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

// Header value for API endpoints, so the CDN caches the response as well.
function cdnCacheControl(ttlSeconds, staleSeconds) {
  return `s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds ?? ttlSeconds * 6}`;
}

function clear() { store.clear(); inflight.clear(); }
function size() { return store.size; }

module.exports = { TTL, remember, cdnCacheControl, clear, size };
