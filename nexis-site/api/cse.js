// Vercel serverless function: GET /api/cse?type=gainers|losers|active|aspi|snp|summary
// Uses the Colombo Stock Exchange website's public (unofficial) endpoints. They can change without notice.
const EP = { aspi: 'aspiData', snp: 'snpData', gainers: 'topGainers', losers: 'topLooses', active: 'mostActiveTrades', summary: 'marketSummery' };

module.exports = async function handler(req, res) {
  const ep = EP[String(req.query.type || '')];
  if (!ep) return res.status(400).json({ error: 'unknown type' });
  try {
    const r = await fetch(`https://www.cse.lk/api/${ep}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }, body: '{}' });
    const text = await r.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(r.ok ? 200 : 502).send(text);
  } catch (e) {
    return res.status(502).json({ error: 'upstream failed' });
  }
}
