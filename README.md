# canhazdb
[![Build Status](https://travis-ci.org/markwylde/canhazdb.svg?branch=master)](https://travis-ci.org/markwylde/canhazdb)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/markwylde/canhazdb)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/markwylde/canhazdb)](https://github.com/markwylde/canhazdb/blob/master/package.json)
[![GitHub](https://img.shields.io/github/license/markwylde/canhazdb)](https://github.com/markwylde/canhazdb/blob/master/LICENSE)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg)](https://github.com/standard/semistandard)

A sharded and clustered database communicated over http rest.

## Getting Started
Create the tls files you need to secure your cluster.

A bash script `./makeCerts.sh` provided will create a folder with test certs you can use.

```bash
./makeCerts.sh
```

You can opt out of tls by omitting the tls option from canhazdb.

### Via the CLI
```bash
npm install --global canhazdb
```

```bash
canhazdb --host localhost \
         --port 7061 \
         --query-port 8061 \
         --data-dir ./canhazdb/one \
         --tls-ca ./certs/ca.cert.pem \
         --tls-cert ./certs/localhost.cert.pem \
         --tls-key ./certs/localhost.privkey.pem

canhazdb --host localhost \
         --port 7062 \
         --query-port 8062 \
         --data-dir ./canhazdb/two \
         --tls-ca ./certs/ca.cert.pem \
         --tls-cert ./certs/localhost.cert.pem \
         --tls-key ./certs/localhost.privkey.pem \
         --join localhost:7061

canhazdb --host localhost \
         --port 7063 \
         --query-port 8063 \
         --data-dir ./canhazdb/three \
         --tls-ca ./certs/ca.cert.pem \
         --tls-cert ./certs/localhost.cert.pem \
         --tls-key ./certs/localhost.privkey.pem \
         --join localhost:7061
```

### Via NodeJS
```bash
npm install --save canhazdb
```

```javascript
const fs = require('fs');
const axios = require('axios');
const canhazdb = require('canhazdb');

async function main () {
  const tls = {
    key: fs.readFileSync('certs/localhost.privkey.pem'),
    cert: fs.readFileSync('certs/localhost.cert.pem'),
    ca: [ fs.readFileSync('certs/ca.cert.pem') ],
    requestCert: true /* this denys any cert not signed with our ca above */
  };

  const node1 = await canhazdb({
    host: 'localhost', port: 7061, queryPort: 8061, dataDirectory: './canhazdata/one', tls
  })
  const node2 = await canhazdb({
    host: 'localhost', port: 7062, queryPort: 8062, dataDirectory: './canhazdata/two', tls
  })

  await node2.join({ host: 'localhost', port: 7061 })

  const postRequest = await axios(`${node1.url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  // node2.url === 'https://localhost:8061'
  const result = await axios(`${node2.url}/tests/${postRequest.data.id}`);

  console.log(result.data);

  /*
    {
      a: 1,
      b: 2,
      c: 3
    }
  */
}
```

## Endpoints

<table>
  <tr>
    <th></th>
    <th>Method</th>
    <th>Path</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.1</a></td>
    <td>GET</td>
    <td>/:collectionId</td>
    <td>List all resources for a collection</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.2</a></td>
    <td>GET</td>
    <td>/:collectionId?query={"a":1}</td>
    <td>List all resources matching mongodb query syntax</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.3</a></td>
    <td>GET</td>
    <td>/:collectionId/:resourceId</td>
    <td>Get a resource by id</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.4</a></td>
    <td>POST</td>
    <td>/:collectionId</td>
    <td>Create a new resource</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.5</a></td>
    <td>PUT</td>
    <td>/:collectionId/:resourceId</td>
    <td>Replace a resource by id</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.6</a></td>
    <td>PUT</td>
    <td>/:collectionId?query={"a":1}</td>
    <td>Replace multiple resource matching mongodb query syntax</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.7</a></td>
    <td>DELETE</td>
    <td>/:collectionId/:resourceId</td>
    <td>Delete a resource by id</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.8</a></td>
    <td>DELETE</td>
    <td>/:collectionId?query={"a":1}</td>
    <td>Delete multiple resource matching mongodb query syntax</td>
  </tr>
</table>

## License
This project is licensed under the terms of the AGPL-3.0 license.