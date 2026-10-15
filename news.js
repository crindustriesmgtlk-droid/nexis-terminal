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
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? m[1] : ''; };

module.exports = async function handler(req, res) {
  const url = FEEDS[String(req.query.ed || 'global')];
  if (!url) return res.status(400).json({ error: 'unknown edition' });
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NEXIS/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' } });
    if (!r.ok) throw new Error('feed HTTP ' + r.status);
    const xml = await r.text();
    const channelTitle = strip(tag(xml.split(/<item[\s>]/i)[0], 'title'));
    const items = (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).slice(0, 8).map(it => {
      const img = (it.match(/<media:thumbnail[^>]*url="([^"]+)"/i) || it.match(/<media:content[^>]*url="([^"]+)"/i) || it.match(/<enclosure[^>]*url="([^"]+)"/i) || [])[1] || '';
      const link = strip(tag(it, 'link')) || (it.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
      return { title: strip(tag(it, 'title')), link, pubDate: strip(tag(it, 'pubDate')), description: strip(tag(it, 'description')).slice(0, 300), image: img, author: strip(tag(it, 'dc:creator')) };
    }).filter(i => i.title);
    if (!items.length) throw new Error('no items');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({ feed: channelTitle, items });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || 'feed failed') });
  }
};
