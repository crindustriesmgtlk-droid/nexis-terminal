// Small fetch wrapper shared by every provider adapter: timeout, JSON parsing and safe error objects.
// IMPORTANT: error messages never contain the request URL, because many provider URLs carry API keys.

class ProviderError extends Error {
  constructor(code, message, extra) { super(message || code); this.name = 'ProviderError'; this.code = code; Object.assign(this, extra || {}); }
}

// Server secrets are read only here, from process.env. They are never returned to callers.
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new ProviderError('not_configured', `${name} is not set`);
  return v;
}

async function fetchJson(url, { method = 'GET', headers = {}, body, timeoutMs = 8000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method, headers, body, signal: ctl.signal });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* handled below */ }
    if (!r.ok) throw new ProviderError('http_' + r.status, `HTTP ${r.status}`, { status: r.status });
    if (json === null) throw new ProviderError('bad_json', 'Provider did not return JSON');
    return json;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e && e.name === 'AbortError') throw new ProviderError('timeout', 'Provider timed out');
    throw new ProviderError('network', 'Network error');
  } finally { clearTimeout(timer); }
}

module.exports = { ProviderError, requireEnv, fetchJson };
