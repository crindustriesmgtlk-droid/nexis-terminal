// Vercel serverless function: GET /api/news?ed=global|lk|us|asia|eu
// Reads public RSS feeds on the server and returns headline, short summary, image and link only.
const FEEDS = {
  global: 'https://feeds.bbci.co.uk/news/business/rss.xml',
  lk: 'https://economynext.com/feed/',
  us: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
  asia: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
  eu: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml'
};
const decode = s => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#8217;/g, '\u2019').replace(/&amp;/g, '&');
const strip = s => decode(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
// BBC RSS thumbnails are only 240px wide; the same image is available at larger widths
const upscale = u => String(u || '').replace(/(ichef\.bbci\.co\.uk\/(?:ace\/standard|ace\/ws|news)\/)\d+\//, '$1976/');

// Many feeds ship no picture. For those items we read the article page and use its own preview image (og:image),
// so the photo always belongs to that story.
const safeUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(x.hostname) && x.hostname.includes('.'); } catch (e) { return false; } };
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};
async function ogImage(link, dbg) {
  const note = o => { if (dbg) dbg.push({ link, ...o }); };
  if (!safeUrl(link)) { note({ error: 'unsafe or invalid url' }); return ''; }
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(link, { signal: ctl.signal, headers: BROWSER_HEADERS, redirect: 'follow' });
    if (!r.ok) { note({ status: r.status }); return ''; }
    const html = (await r.text()).slice(0, 300000);
    const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["']/i);
    note({ status: r.status, bytes: html.length, found: !!m });
    return m ? decode(m[1]) : '';
  } catch (e) { note({ error: String(e.name || e.message) }); return ''; } finally { clearTimeout(t); }
}
async function fillImages(items, dbg) {
  await Promise.all(items.slice(0, 6).map(async it => { if (!it.image && it.link) it.image = await ogImage(it.link, dbg); }));
  items.forEach(it => { it.image = upscale(it.image); });
  return items;
}
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? m[1] : ''; };


// Licensed news API (NewsData.io). Used when the NEWSDATA_API_KEY environment variable is set; otherwise falls back to RSS.
const ND_QUERY = {
  global: 'category=business&language=en',
  lk: 'country=lk&language=en',
  us: 'country=us&category=business&language=en',
  asia: 'country=in,jp,cn,sg,au&language=en',
  eu: 'country=gb,de,fr,it,es&language=en'
};
async function fromNewsData(ed, key) {
  const r = await fetch(`https://newsdata.io/api/1/latest?apikey=${encodeURIComponent(key)}&${ND_QUERY[ed] || ND_QUERY.global}`);
  const j = await r.json();
  if (j.status !== 'success' || !Array.isArray(j.results) || !j.results.length) throw new Error((j.results && j.results.message) || 'newsdata error');
  const items = j.results.slice(0, 8).map(a => ({ title: a.title || '', link: a.link || '', pubDate: a.pubDate || '', description: strip(a.description || '').slice(0, 300), image: a.image_url || '', author: '', source: a.source_name || a.source_id || '' })).filter(i => i.title);
  return { feed: 'NewsData.io', items: await fillImages(items) };
}

module.exports = async function handler(req, res) {
  const ed = String(req.query.ed || 'global');
  const url = FEEDS[ed];
  if (!url) return res.status(400).json({ error: 'unknown edition' });
  try {
    if (process.env.NEWSDATA_API_KEY) {
      try {
        const data = await fromNewsData(ed, process.env.NEWSDATA_API_KEY);
        res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
        return res.status(200).json(data);
      } catch (e) { /* fall through to RSS */ }
    }
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NEXIS/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' } });
    if (!r.ok) throw new Error('feed HTTP ' + r.status);
    const xml = await r.text();
    const channelTitle = strip(tag(xml.split(/<item[\s>]/i)[0], 'title'));
    const items = (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).slice(0, 8).map(it => {
      const img = (it.match(/<media:thumbnail[^>]*url="([^"]+)"/i) || it.match(/<media:content[^>]*url="([^"]+)"/i) || it.match(/<enclosure[^>]*url="([^"]+)"/i) || decode(tag(it, 'content:encoded')).match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '';
      const link = strip(tag(it, 'link')) || (it.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
      return { title: strip(tag(it, 'title')), link, pubDate: strip(tag(it, 'pubDate')), description: strip(tag(it, 'description')).slice(0, 300), image: img, author: strip(tag(it, 'dc:creator')) };
    }).filter(i => i.title);
    if (!items.length) throw new Error('no items');
    const dbg = req.query.debug ? [] : null;
    await fillImages(items, dbg);
    res.setHeader('Cache-Control', dbg ? 'no-store' : 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json(dbg ? { feed: channelTitle, debug: dbg, items } : { feed: channelTitle, items });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || 'feed failed') });
  }
};
