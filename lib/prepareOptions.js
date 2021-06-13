import dns from 'dns';
import os from 'os';
import fs from 'fs';
import path from 'path';

async function prepareOptions (rawOptions) {
  const options = {
    ...rawOptions,
    join: rawOptions.join || []
  };

  options.nodeName = rawOptions.nodeName || process.env.CANHAZDB_NODE_NAME || os.hostname();
  options.port = parseInt(options.port);

  if (rawOptions.joinFromDns) {
    const dnsLookupResults = await dns.promises.lookup(rawOptions.joinFromDns, { all: true });
    console.log('joining from dns:', { dnsLookupResults });
    options.join = dnsLookupResults.map(item => `${item.address}:${options.port}`);
  } else {
    options.join.push(`${rawOptions.host}:${options.port}`);
  }

  if (rawOptions.tlsCa || rawOptions.tlsCert || rawOptions.tlsKey) {
    if (!rawOptions.tlsCa || !rawOptions.tlsCert || !rawOptions.tlsKey) {
      console.log('You must specifiy either all [tls-key, tls-cert, tls-ca] or none of them');
      return;
    }

    options.tls = {
      key: fs.readFileSync(rawOptions.tlsKey),
      cert: fs.readFileSync(rawOptions.tlsCert),
      ca: [fs.readFileSync(rawOptions.tlsCa)],
      requestCert: true
    };
  }

  options.dataDirectory = rawOptions.dataDirectory ||
    path.resolve(process.cwd(), './canhazdata', options.nodeName);

  return options;
}

export default prepareOptions;
