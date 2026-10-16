// News normalizer. One item shape for every news provider.
//   { title, url, publishedAt, summary, imageUrl, publisher:{name}, provider:{...source}, edition, retrievedAt }
const { makeSource } = require('../contract');
const nd = require('../providers/newsData').meta;

const clean = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const iso = s => { const t = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(String(s)) ? Date.parse(String(s).replace(' ', 'T') + 'Z') : Date.parse(s); return isNaN(t) ? null : new Date(t).toISOString(); };

function fromNewsData(raw, edition) {
  const retrievedAt = new Date().toISOString();
  return (raw.results || []).filter(a => a && a.title && a.link).map(a => ({
    title: clean(a.title), url: a.link, publishedAt: iso(a.pubDate), summary: clean(a.description).slice(0, 300),
    imageUrl: a.image_url || null,
    publisher: { name: a.source_name || a.source_id || null },   // credit the real publisher, not NEXIS
    provider: makeSource({ name: nd.name, type: nd.type, url: nd.url, level: nd.level, retrievedAt }),
    edition, retrievedAt
  }));
}

module.exports = { fromNewsData };
