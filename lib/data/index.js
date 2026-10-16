// Single entry point for API functions:  const data = require('../lib/data');  await data.getQuote({ symbol: 'BTC' })
module.exports = { ...require('./registry'), contract: require('./contract'), cache: require('./cache/cache') };
