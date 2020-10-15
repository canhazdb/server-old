const fs = require('fs');
const https = require('https');

const httpsAgent = new https.Agent({
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')]
});

module.exports = require('axios')
  .create({ httpsAgent, validateStatus: () => true });
