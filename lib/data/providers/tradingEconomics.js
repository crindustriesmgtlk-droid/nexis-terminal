// Provider adapter: Trading Economics (markets, indicators, calendar). Needs TE_API_KEY and a licence that allows display.
const { fetchJson, requireEnv } = require('../http');
const meta = { id: 'tradingEconomics', name: 'Trading Economics', type: 'provider', level: 2, url: 'https://tradingeconomics.com', env: 'TE_API_KEY' };
const isConfigured = () => !!process.env[meta.env];
// Same allow-list idea as api/te.js: only known read-only paths can be requested.
const ALLOWED = /^\/(markets\/(commodities|currency|index|bond|crypto|stocks)|news|calendar|country\/[A-Za-z%20 ]{2,40}|indicators\/country\/[A-Za-z%20 ]{2,40})$/;

function request(path) {
  if (!ALLOWED.test(path)) throw new Error('Trading Economics path not allowed');
  return fetchJson(`https://api.tradingeconomics.com${path}?c=${encodeURIComponent(requireEnv(meta.env))}&f=json`);
}
const markets = category => request(`/markets/${category}`);
const calendar = () => request('/calendar');

module.exports = { meta, isConfigured, request, markets, calendar };
