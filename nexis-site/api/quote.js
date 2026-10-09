// Vercel serverless function: GET /api/quote?symbol=EUR/USD&size=3
// Set TWELVE_DATA_KEY in Vercel > Project > Settings > Environment Variables.
const ALLOWED = new Set(['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'XAU/USD', 'XAG/USD']);

module.exports = async function handler(req, res) {
  const symbol = String(req.query.symbol || '');
  const size = Math.min(60, Math.max(2, parseInt(req.query.size, 10) || 3));
  if (!ALLOWED.has(symbol)) return res.status(400).json({ error: 'symbol not allowed' });
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) return res.status(500).json({ error: 'TWELVE_DATA_KEY not set' });
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${size}&apikey=${key}`;
    const data = await (await fetch(url)).json();
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(data.status === 'error' ? 502 : 200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'upstream failed' });
  }
}
