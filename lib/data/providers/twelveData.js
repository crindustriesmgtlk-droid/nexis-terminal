// Provider adapter: Twelve Data (forex, metals, indices on supported plans). Needs TWELVE_DATA_KEY on the server.
const { fetchJson, requireEnv, ProviderError } = require('../http');
const meta = { id: 'twelveData', name: 'Twelve Data', type: 'provider', level: 2, url: 'https://twelvedata.com', env: 'TWELVE_DATA_KEY' };
const SAFE = /^[A-Za-z0-9./:_-]{2,20}$/;
const isConfigured = () => !!process.env[meta.env];

async function timeSeries(symbol, interval = '1day', size = 30) {
  if (!SAFE.test(symbol)) throw new Error('invalid Twelve Data symbol');
  const key = requireEnv(meta.env);
  const j = await fetchJson(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputsize=${Math.min(500, +size || 30)}&apikey=${encodeURIComponent(key)}`);
  if (j.status === 'error') throw new ProviderError('upstream_error', 'Twelve Data returned an error', { upstreamCode: j.code });
  return j;
}

module.exports = { meta, isConfigured, timeSeries };
