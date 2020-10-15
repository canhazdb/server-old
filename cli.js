#!/usr/bin/env node
const fs = require('fs');
const canhazdb = require('./');

const argv = require('minimist')(process.argv.slice(2));

async function main () {
  let tls;

  if (argv['tls-ca']) {
    tls = {
      key: fs.readFileSync(argv['tls-key']),
      cert: fs.readFileSync(argv['tls-cert']),
      ca: [fs.readFileSync(argv['tls-ca'])],
      requestCert: true
    };
  }

  const host = argv.host;
  const port = argv.port;
  const node = await canhazdb({ host, port, queryPort: argv['query-port'], tls });

  console.log(`canhazdb listening on ${host}:${port}`);

  if (argv.join) {
    const [host, port] = argv.join.split(':');
    console.log(`  joining ${host}:${port}`);
    await node.join({ host, port });
  }
}

main();
