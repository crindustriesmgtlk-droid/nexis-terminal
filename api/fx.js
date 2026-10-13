// Vercel serverless function: GET /api/fx?type=latest  |  /api/fx?type=codes
// Needs the EXCHANGERATE_API_KEY environment variable (Vercel > Settings > Environment Variables).
// The key stays on the server and is never sent to the browser.
module.exports = async function handler(req, res) {
  const key = process.env.EXCHANGERATE_API_KEY;
  if (!key) return res.status(500).json({ error: 'EXCHANGERATE_API_KEY not set' });
  const type = req.query.type === 'codes' ? 'codes' : 'latest';
  const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/${type === 'codes' ? 'codes' : 'latest/USD'}`;
  try {
    const data = await (await fetch(url)).json();
    if (data.result !== 'success') return res.status(502).json({ error: data['error-type'] || 'upstream error' });
    // Rates update once a day on the free plan, so cache for a long time to save the monthly quota
    res.setHeader('Cache-Control', `s-maxage=${type === 'codes' ? 86400 : 10800}, stale-while-revalidate=86400`);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'upstream failed' });
  }
};
