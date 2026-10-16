// Provider adapter: Colombo Stock Exchange website endpoints (official exchange, but UNOFFICIAL/undocumented API).
// Field names are not guaranteed to stay the same, so normalize/ reads them defensively.
const { fetchJson } = require('../http');
const meta = { id: 'cse', name: 'Colombo Stock Exchange', type: 'official', level: 1, url: 'https://www.cse.lk', env: null };
const isConfigured = () => true;
const ENDPOINTS = Object.freeze({ aspi: 'aspiData', snp: 'snpData', gainers: 'topGainers', losers: 'topLooses', active: 'mostActiveTrades', summary: 'marketSummery' });

function get(type) {
  const ep = ENDPOINTS[type];
  if (!ep) throw new Error('unknown CSE type');
  return fetchJson(`https://www.cse.lk/api/${ep}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }, body: '{}' });
}

module.exports = { meta, isConfigured, ENDPOINTS, get };
