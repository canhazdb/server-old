const fs = require('fs');
const https = require('https');

const httpsAgent = new https.Agent({ ca: [fs.readFileSync('./certs/ca.cert.pem')] });

module.exports = require('axios')
  .create({ httpsAgent, validateStatus: () => true });
