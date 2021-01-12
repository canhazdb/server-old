#!/usr/bin/env node
const packageJson = require('../package.json');

const path = require('path');

const chalk = require('chalk');
const argv = require('minimist')(process.argv.slice(2));

const canhazdb = require('./');

function showHelp () {
  console.log(`
The scalable, sharded database engine.
https://github.com/markwylde/canhazdb

The following commands and arguments are available when starting Bitabase
Arguments:
  --data-dir         optional     The port to bind the https query server on (default: ./canhazdata)

  --driver           optional     The driver to use for data storage (default: sqlite)

  --host             optional     The host to bind the internal and query server on (default: localhost)
  --port             optional     The port to bind the internal server on (default: 7060)
  --query-port       optional     The port to bind the https query server on (default: 8060)

  --tls-ca           optional     The certificate authority to use for the certs
  --tls-cert         optional     The public certificate for the internal and query servers
  --tls-key          optional     The private key for the internal and query servers

  --join             optional     Join another canhazdb node
  --join-from-dns    optional     Lookup other canhazdb nodes to join from a dns lookup

  --single           optional     Start the node in single none clustered mode

  `.trim() + '\n');
}

console.log(`${chalk.green(chalk.bold(`📦 ${packageJson.name}`))} ${chalk.green(`- v${packageJson.version}`)}`);

if (argv.join) {
  argv.join = Array.isArray(argv.join) ? argv.join : [argv.join];
}

if (argv.help) {
  showHelp();
  process.exit(1);
} else {
  canhazdb({
    dataDirectory: argv['data-dir'] || path.resolve(process.cwd(), './canhazdata'),
    driver: argv.driver || 'sqlite',
    host: argv.host || 'localhost',
    port: argv.port || 7060,
    queryPort: argv['query-port'] || 8060,
    tlsCa: argv['tls-ca'],
    tlsCert: argv['tls-cert'],
    tlsKey: argv['tls-key'],
    join: argv.join,
    joinFromDns: argv['join-from-dns'],
    single: argv.single
  }).then(node => {
    console.log('');
    console.log(`${chalk.cyan('internal server')}: ${node.host}:${node.port}`);
    console.log(`${chalk.cyan('query server')}:    ${node.url}`);
  }).catch(error => {
    console.log(error);
    process.exit(1);
  });
}
