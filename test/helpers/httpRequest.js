module.exports = require('axios')
  .create({ validateStatus: () => true });
