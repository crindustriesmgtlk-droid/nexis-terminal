// Provider adapter: ExchangeRate-API v6 (daily reference rates for 160+ currencies). Needs EXCHANGERATE_API_KEY.
const { fetchJson, requireEnv, ProviderError } = require('../http');
const meta = { id: 'exchangeRate', name: 'ExchangeRate-API', type: 'provider', level: 3, url: 'https://www.exchangerate-api.com', env: 'EXCHANGERATE_API_KEY' };
const isConfigured = () => !!process.env[meta.env];

async function call(path) {
  const j = await fetchJson(`https://v6.exchangerate-api.com/v6/${encodeURIComponent(requireEnv(meta.env))}/${path}`);
  if (j.result !== 'success') throw new ProviderError('upstream_error', 'ExchangeRate-API error', { upstreamCode: j['error-type'] });
  return j;
}
const latest = (base = 'USD') => call(`latest/${encodeURIComponent(base)}`);
const codes = () => call('codes');

module.exports = { meta, isConfigured, latest, codes };
