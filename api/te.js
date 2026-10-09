// Vercel serverless function: GET /api/te?path=/markets/commodities
// Optional. Needs a Trading Economics API key in the TE_API_KEY environment variable.
const OK = /^\/(markets\/(commodities|currency|index|bond|crypto|stocks)|news|calendar|country\/[A-Za-z%20 ]{2,40}|indicators\/country\/[A-Za-z%20 ]{2,40})$/;

module.exports = async function handler(req, res) {
  const path = String(req.query.path || '');
  if (!OK.test(path)) return res.status(400).json({ error: 'path not allowed' });
  const key = process.env.TE_API_KEY;
  if (!key) return res.status(500).json({ error: 'TE_API_KEY not set' });
  try {
    const r = await fetch(`https://api.tradingeconomics.com${path}?c=${encodeURIComponent(key)}&f=json`);
    const text = await r.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(r.ok ? 200 : 502).send(text);
  } catch (e) {
    return res.status(502).json({ error: 'upstream failed' });
  }
};
