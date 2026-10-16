// Provider adapter: Binance public market data (no API key). Returns RAW provider JSON; normalize/ maps it.
const { fetchJson } = require('../http');
const BASE = 'https://api.binance.com/api/v3';
const meta = { id: 'binance', name: 'Binance', type: 'exchange', level: 2, url: 'https://www.binance.com', env: null };
const SAFE = /^[A-Z0-9]{5,15}$/;
const check = s => { if (!SAFE.test(s)) throw new Error('invalid Binance symbol'); return s; };

const ticker24h = symbol => fetchJson(`${BASE}/ticker/24hr?symbol=${check(symbol)}`);
const klines = (symbol, interval = '1d', limit = 30) => fetchJson(`${BASE}/klines?symbol=${check(symbol)}&interval=${encodeURIComponent(interval)}&limit=${Math.min(1000, +limit || 30)}`);
const isConfigured = () => true;

module.exports = { meta, isConfigured, ticker24h, klines };
