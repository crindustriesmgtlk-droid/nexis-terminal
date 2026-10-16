# NEXIS Data Engine (STEP 03 foundation)

Server-side data layer for NEXIS. It is NOT connected to the frontend yet. Existing `/api/cse`, `/api/fx`,
`/api/news`, `/api/quote`, `/api/te` keep working exactly as before.

```
providers/  raw adapters (one file per provider; they fetch and know nothing about NEXIS)
normalize/  raw provider JSON  ->  NEXIS contract (quotes, macro, news)
cache/      TTL classes + in-memory cache with request de-duplication + CDN Cache-Control helper
registry.js symbol -> ordered provider routes, fallbacks, source priority levels
contract.js the one shape every value leaves the engine in (+ validation)
http.js     fetch with timeout, safe errors (URLs and keys never appear in error messages)
```

## Contract
`{ value, currency, unit, symbol, assetType, timestamp, source{name,type,url,level,retrievedAt}, status, frequency, historical, country, metadata }`

Status: `live`, `delayed`, `historical`, `estimated`, `unavailable`.
If nothing real can be obtained the engine returns `unavailable` with `value: null`. It never invents numbers.

## Source priority
1 official (CSE, World Bank) / 2 licensed or trusted (Twelve Data, Trading Economics, Binance) /
3 reliable secondary (ExchangeRate-API, NewsData.io) / 4 fallback (cached or sample, must be labelled; not created by the engine).

## Use from an API function (next step)
```js
const data = require('../lib/data');
const q = await data.getQuote({ symbol: 'USD/LKR' });      // contract quote
res.setHeader('Cache-Control', data.cache.cdnCacheControl(data.cache.TTL.FX_DAILY));
```

## Environment variables (server only, set in Vercel)
`TWELVE_DATA_KEY`, `EXCHANGERATE_API_KEY`, `NEWSDATA_API_KEY`, `TE_API_KEY`. Never put them in browser code or in Git.

## Adding an instrument
Add one entry to `INSTRUMENTS` in `registry.js` with its provider routes.

## Tests
`node tests/data-engine.test.js` (mocked network, no keys needed).

## Notes
- The memory cache is per warm serverless instance; the CDN `s-maxage` header is the shared cache.
- `lib/` is deployed with the site. It contains code only (no secrets), but static hosting can serve it as files.
- CSE and Trading Economics field names are read defensively and flagged `fieldMapping: 'unverified'` until checked against live responses.
