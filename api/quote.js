// Vercel serverless function: GET /api/quote?symbol=EUR/USD&size=3
// STEP 04: this endpoint now uses the NEXIS Data Engine instead of calling Twelve Data directly.
// Provider API keys remain server-side. The response keeps the legacy `values` shape so the existing
// frontend (pivots/correlation) continues working without a UI rewrite.

const data = require('../lib/data');

const MAX_SIZE = 60;

module.exports = async function handler(req, res) {
  const rawSymbol = String(req.query.symbol || '').trim();
  const size = Math.min(
    MAX_SIZE,
    Math.max(2, parseInt(req.query.size, 10) || 3)
  );

  if (!rawSymbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }

  const symbol = data.canonical(rawSymbol);

  try {
    // The Data Engine owns provider selection, normalization, caching and source metadata.
    const history = await data.getHistory({
      symbol,
      limit: size
    });

    if (
      !history ||
      history.status === data.contract.STATUS.UNAVAILABLE ||
      !history.points ||
      !history.points.length
    ) {
      return res.status(400).json({
        error: 'symbol not supported or data unavailable',
        symbol,
        status: history && history.status
          ? history.status
          : 'unavailable',
        source: history && history.source
          ? history.source
          : null
      });
    }

    // Preserve the old Twelve Data-compatible shape expected by the current frontend.
    const values = history.points
      .slice()
      .reverse()
      .map(p => ({
        datetime: String(p.t).slice(0, 10),
        open: p.o,
        high: p.h,
        low: p.l,
        close: p.c,
        ...(p.v != null ? { volume: p.v } : {})
      }));

    res.setHeader(
      'Cache-Control',
      data.cache.cdnCacheControl(
        data.cache.TTL.PROVIDER_DAILY,
        3600
      )
    );

    return res.status(200).json({
      status: 'ok',
      symbol: rawSymbol,
      values,

      // New NEXIS metadata for future consumers.
      // Existing frontend safely ignores this field.
      nexis: {
        status: history.status,
        source: history.source,
        assetType: history.assetType,
        interval: history.interval,
        retrievedAt: new Date().toISOString()
      }
    });
  } catch (e) {
    // Do not expose provider URLs, keys, or raw upstream errors to the browser.
    return res.status(502).json({
      error: 'data provider unavailable',
      symbol
    });
  }
};
