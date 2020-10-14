# canhazdb
[![Build Status](https://travis-ci.org/markwylde/canhazdb.svg?branch=master)](https://travis-ci.org/markwylde/canhazdb)
[![David DM](https://david-dm.org/markwylde/canhazdb.svg)](https://david-dm.org/markwylde/canhazdb)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/markwylde/canhazdb)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/markwylde/canhazdb)](https://github.com/markwylde/canhazdb/blob/master/package.json)
[![GitHub](https://img.shields.io/github/license/markwylde/canhazdb)](https://github.com/markwylde/canhazdb/blob/master/LICENSE)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)

A sharded and clustered database communicated over http rest.

## Getting Started
Create the tls files you need to secure your cluster.

```bash
mkdir certs

# Create a new Certificate Authority
openssl genrsa -out certs/ca.key 2048
openssl req -new -x509 -key certs/ca.key -subj "/C=GB/L=interwebz/O=acme/CN=localhost" -out certs/ca.crt

# Create a new keypair for your first node
openssl req -new -nodes -days 365 -subj "/C=GB/L=interwebz/O=acme/CN=localhost" -keyout certs/node1.key -out certs/node1.csr
openssl x509 -req -in certs/node1.csr -CA certs/ca.crt -CAkey certs/ca.key -CAcreateserial -out certs/node1.crt -days 365 -sha256
```

```javascript
const fs = require('fs');
const axios = require('axios');
const canhazdb = require('canhazdb');

async function main () {
  const tls = {
    key: fs.readFileSync('certs/node1.key'),
    cert: fs.readFileSync('certs/node1.crt'),
    ca: [ fs.readFileSync('certs/ca.crt') ]
  };

  const node1 = await canhazdb({ host: 'localhost', port: 7061, queryPort: 8061, tls })
  const node2 = await canhazdb({ host: 'localhost', port: 7062, queryPort: 8062, tls })

  await node1.join({ host: 'localhost', port: 7062 })
  await node2.join({ host: 'localhost', port: 7061 })

  const postRequest = await axios(`${node1.url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

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
    <td colspan=4>
      <strong>External</strong></br>
      These requests will collect results from all known nodes.
    </td>
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
    <td>List all resources partially matching query</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.3</a></td>
    <td>GET</td>
    <td>/:collectionId/:resourceId</td>
    <td>Get all fields for a resource</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.4</a></td>
    <td>POST</td>
    <td>/:collectionId/:resourceId</td>
    <td>Remove then set all fields on a resource</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.5</a></td>
    <td>PATCH</td>
    <td>/:collectionId/:resourceId</td>
    <td>Set fields on a resource</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.6</a></td>
    <td>DELETE</td>
    <td>/:collectionId/:resourceId</td>
    <td>Delete all fields for a resource</td>
  </tr>
</table>

## License
This project is licensed under the terms of the AGPL-3.0 license.