// Provider adapter: NewsData.io licensed news API. Needs NEWSDATA_API_KEY. Check the plan's terms for commercial use.
const { fetchJson, requireEnv, ProviderError } = require('../http');
const meta = { id: 'newsData', name: 'NewsData.io', type: 'provider', level: 3, url: 'https://newsdata.io', env: 'NEWSDATA_API_KEY' };
const isConfigured = () => !!process.env[meta.env];

const EDITIONS = Object.freeze({
  global: 'category=business&language=en',
  lk: 'country=lk&language=en',
  us: 'country=us&category=business&language=en',
  asia: 'country=in,jp,cn,sg,au&language=en',
  eu: 'country=gb,de,fr,it,es&language=en'
});

async function latest(edition = 'global') {
  const q = EDITIONS[edition];
  if (!q) throw new Error('unknown edition');
  const j = await fetchJson(`https://newsdata.io/api/1/latest?apikey=${encodeURIComponent(requireEnv(meta.env))}&${q}`);
  if (j.status !== 'success') throw new ProviderError('upstream_error', 'NewsData.io error');
  return j;
}

module.exports = { meta, isConfigured, EDITIONS, latest };
