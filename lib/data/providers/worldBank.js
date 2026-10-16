// Provider adapter: World Bank Open Data (annual country statistics, no key). Official multilateral source.
const { fetchJson } = require('../http');
const meta = { id: 'worldBank', name: 'World Bank Open Data', type: 'official', level: 1, url: 'https://data.worldbank.org', env: null };
const isConfigured = () => true;

// Friendly names used across NEXIS -> World Bank indicator codes
const INDICATORS = Object.freeze({
  GDP_GROWTH: { id: 'NY.GDP.MKTP.KD.ZG', unit: 'percent', currency: null },
  INFLATION: { id: 'FP.CPI.TOTL.ZG', unit: 'percent', currency: null },
  UNEMPLOYMENT: { id: 'SL.UEM.TOTL.ZS', unit: 'percent', currency: null },
  CURRENT_ACCOUNT: { id: 'BN.CAB.XOKA.GD.ZS', unit: 'percent of GDP', currency: null },
  GDP: { id: 'NY.GDP.MKTP.CD', unit: 'current US$', currency: 'USD' }
});

function indicator(countryCode, indicatorId, mrv = 8) {
  if (!/^[A-Za-z]{2,3}$/.test(countryCode)) throw new Error('invalid country code');
  if (!/^[A-Z0-9.]{5,30}$/.test(indicatorId)) throw new Error('invalid indicator');
  return fetchJson(`https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorId}?format=json&mrv=${Math.min(30, +mrv || 8)}`);
}

module.exports = { meta, isConfigured, INDICATORS, indicator };
