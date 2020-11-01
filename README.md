# canhazdb
![Node.js Test Runner](https://github.com/puzed/puzed-api/workflows/Node.js%20Test%20Runner/badge.svg)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/markwylde/canhazdb)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/markwylde/canhazdb)](https://github.com/markwylde/canhazdb/blob/master/package.json)
[![GitHub](https://img.shields.io/github/license/markwylde/canhazdb)](https://github.com/markwylde/canhazdb/blob/master/LICENSE)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg)](https://github.com/standard/semistandard)

A sharded and clustered database communicated over http rest.

## Getting Started
You must have a minimum version of Node 12 installed.

Create the tls files you need to secure your cluster.

A bash script `./makeCerts.sh` provided will create a folder with test certs you can use.

You can opt out of tls by omitting the tls option from canhazdb.

### Client
You can talk to the database using http/https using your favourite http client, or
you can use the built in client api.

```javascript
const client = require('canhazdb/client');

const tls = {
  key: fs.readFileSync('certs/localhost.privkey.pem'),
  cert: fs.readFileSync('certs/localhost.cert.pem'),
  ca: [ fs.readFileSync('certs/ca.cert.pem') ],
  requestCert: true /* this denys any cert not signed with our ca above */
};
const client = createClient('https://localhost:8063', { tls });

const document = await client.post('tests', { a: 1 });
const changed = await client.put('tests', { id: document.id }, { query: { b: 2 } });
const changedDocument = await client.getOne('tests', { query: { id: document.id } });

console.log( {
  document, /* { a: 1 } */
  changed, /* { changes: 1 } */
  changedDocument, /* { b: 2 } */
})
```

### Server Via the CLI
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

### Server Via NodeJS
```bash
npm install --save canhazdb
```

```javascript
const fs = require('fs');
const axios = require('axios');
const canhazdb = require('canhazdb/server');

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
    <td><a href="https://www.github.com/markwylde/canhazdb">1</a></td>
    <td>GET</td>
    <td>/:collectionId?fields</td>
    <td>List all documents for a collection</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">2</a></td>
    <td>GET</td>
    <td>/:collectionId/:documentId?query&fields&limit&order</td>
    <td>Get a document by id</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">3</a></td>
    <td>POST</td>
    <td>/:collectionId</td>
    <td>Create a new document</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">4</a></td>
    <td>PUT</td>
    <td>/:collectionId/:documentId</td>
    <td>Replace a document by id</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">5</a></td>
    <td>PUT</td>
    <td>/:collectionId/:documentId?query</td>
    <td>Replace multiple document matching query</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">6</a></td>
    <td>PATCH</td>
    <td>/:collectionId/:documentId</td>
    <td>Partially update a document by id</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">7</a></td>
    <td>PATCH</td>
    <td>/:collectionId/:documentId?query</td>
    <td>Partially update multiple document matching query</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">8</a></td>
    <td>DELETE</td>
    <td>/:collectionId/:documentId</td>
    <td>Delete a document by id</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">9</a></td>
    <td>DELETE</td>
    <td>/:collectionId/:documentId?query</td>
    <td>Delete multiple document matching query</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">10</a></td>
    <td>POST</td>
    <td>/_/locks</td>
    <td>Lock a collection/document/field combination</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">11</a></td>
    <td>DELETE</td>
    <td>/_/locks/:lockId</td>
    <td>Release a lock</td>
  </tr>
</table>

### Examples
<details>
<summary>1. Get item by id</summary>
  
<table>
  <tr><td><strong>Method</strong></td><td>GET</td></tr>
  <tr><td><strong>URL</strong></td><td>/collectionId</td></tr>
  <tr><td><strong>Fields</strong></td><td>JSON Array</td></tr>
</table>

**HTTP Request:**
```javascript
axios({
  url: 'https://localhost:8061/tests/example-uuid-paramater?fields=["firstName"]',
})
```

**Client:**
```javascript
client.get('tests', { 
  query: {
    id: 'example-uuid-paramater'
  }
});
```
</details>

<details>
<summary>2. Get items in a collection</summary>

<table>
  <tr><td><strong>Method</strong></td><td>GET</td></tr>
  <tr><td><strong>URL</strong></td><td>/collectionId</td></tr>
  <tr><td><strong>Query</strong></td><td>Mongo Query Syntax</td></tr>
  <tr><td><strong>Fields</strong></td><td>JSON Array</td></tr>
  <tr><td><strong>Limit</strong></td><td>Number</td></tr>
  <tr><td><strong>Order</strong></td><td>Direction(fieldName)</td></tr>
</table>

**HTTP Request:**
```javascript
axios({
  url: 'https://localhost:8061/tests?query={"firstName":"Joe"}&fields=["firstName"]&limit=10&order=desc(firstName)',
})
```

**Client:**
```javascript
client.get('tests', {
  query: {
    firstName: 'Joe'
  },
  limit: 10,
  order: 'desc(firstName)'
});
```
</details>

<details>
<summary>3. Create a new document in a collection</summary>

<table>
  <tr><td><strong>Method</strong></td><td>POST</td></tr>
  <tr><td><strong>URL</strong></td><td>/collectionId</td></tr>
  <tr><td><strong>Data</strong></td><td>JSON</td></tr>
</table>

**HTTP Request:**
```javascript
axios({
  url: 'https://localhost:8061/tests',
  method: 'POST',
  data: {
    firstName: 'Joe'
  }
})
```

**Client:**
```javascript
client.post('tests', {
  firstName: 'Joe'
});
```
</details>

<details>
<summary>4. Replace a document by id</summary>

<table>
  <tr><td><strong>Method</strong></td><td>PUT</td></tr>
  <tr><td><strong>URL</strong></td><td>/collectionId/documentId</td></tr>
  <tr><td><strong>Data</strong></td><td>JSON</td></tr>
</table>

**HTTP Request:**
```javascript
axios({
  url: 'https://localhost:8061/tests/example-uuid-paramater',
  method: 'PUT',
  data: {
    firstName: 'Zoe'
  }
})
```

**Client:**
```javascript
client.put('tests', {
  firstName: 'Joe'
});
```
</details>

<details>
<summary>5. Replace multiple documents by query</summary>

<table>
  <tr><td><strong>Method</strong></td><td>PUT</td></tr>
  <tr><td><strong>URL</strong></td><td>/collectionId/documentId</td></tr>
  <tr><td><strong>Data</strong></td><td>JSON</td></tr>
</table>

**HTTP Request:**
```javascript
axios({
  url: 'https://localhost:8061/tests?query={"location":"GB"}',
  method: 'PUT',
  data: {
    firstName: 'Zoe',
    location: 'GB',
    timezone: 'GMT'
  }
})
```

**Client:**
```javascript
client.put('tests', {
    firstName: 'Zoe',
    location: 'GB',
    timezone: 'GMT'
}, {
  query: {
    location: 'GB'
  }
});
```
</details>

<details>
<summary>6. Partially update multiple documents by id</summary>

<table>
  <tr><td><strong>Method</strong></td><td>PATCH</td></tr>
  <tr><td><strong>URL</strong></td><td>/collectionId/documentId</td></tr>
  <tr><td><strong>Data</strong></td><td>JSON</td></tr>
</table>

**HTTP Request:**
```javascript
axios({
  url: 'https://localhost:8061/tests/example-uuid-paramater',
  method: 'PATCH',
  data: {
    timezone: 'GMT'
  }
})
```

**Client:**
```javascript
client.patch('tests', {
    timezone: 'GMT'
}, {
  query: {
    location: 'GB'
  }
});
```
</details>

<details>
<summary>7. Partially update multiple documents by query</summary>

<table>
  <tr><td><strong>Method</strong></td><td>PATCH</td></tr>
  <tr><td><strong>URL</strong></td><td>/collectionId/documentId</td></tr>
  <tr><td><strong>Data</strong></td><td>JSON</td></tr>
</table>

**HTTP Request:**
```javascript
axios({
  url: 'https://localhost:8061/tests?query={"location":"GB"}',
  method: 'PATCH',
  data: {
    timezone: 'GMT'
  }
})
```

**Client:**
```javascript
client.patch('tests', {
    timezone: 'GMT'
}, {
  query: {
    location: 'GB'
  }
});
```
</details>

<details>
<summary>8. Delete a document by id</summary>

<table>
  <tr><td><strong>Method</strong></td><td>DELETE</td></tr>
  <tr><td><strong>URL</strong></td><td>/collectionId/documentId</td></tr>
</table>

**HTTP Request:**
```javascript
axios({
  url: 'https://localhost:8061/tests/example-uuid-paramater',
  method: 'DELETE'
})
```

**Client:**
```javascript
client.delete('tests', {
  query: {
    id: 'example-uuid-paramater'
  }
});
```

</details>

<details>
<summary>9. Delete multiple documents by query</summary>

<table>
  <tr><td><strong>Method</strong></td><td>DELETE</td></tr>
  <tr><td><strong>URL</strong></td><td>/collectionId/documentId</td></tr>
</table>

**HTTP Request:**
```javascript
axios({
  url: 'https://localhost:8061/tests?query={"location":"GB"}',
  method: 'DELETE'
})
```

**Client:**
```javascript
client.delete('tests', {
  query: {
    location: 'GB'
  }
});
```
</details>

<details>
<summary>10. Lock a collection/document/field combination</summary>

<table>
  <tr><td><strong>Method</strong></td><td>POST</td></tr>
  <tr><td><strong>URL</strong></td><td>/_/locks</td></tr>
  <tr><td><strong>Data</strong></td><td>JSON Array</td></tr>
</table>

**HTTP Request:**
```javascript
const lock = await axios({
  url: 'https://localhost:8061/_/locks',
  method: 'POST',
  data: ['users']
});
const lockId = lock.data.id;
```

**Client:**
```javascript
const lockId = await client.lock('users');
```
</details>

<details>
<summary>11. Release a lock</summary>

<table>
  <tr><td><strong>Method</strong></td><td>DELETE</td></tr>
  <tr><td><strong>URL</strong></td><td>/_/locks/:lockId</td></tr>
</table>

**HTTP Request:**
```javascript
const lock = await axios({
  url: 'https://localhost:8061/_/locks',
  method: 'POST',
  data: ['users']
});
const lockId = lock.data.id;

const lock = await axios({
  url: 'https://localhost:8061/users',
  method: 'POST',
  headers: {
    'x-lock-id': lockId,
    'x-lock-strategy': 'wait' // optional: can be 'fail' or 'wait'. default is 'wait'.
  }
});

await axios({
  url: `https://localhost:8061/_/locks/${lockId}`,
  method: 'DELETE'
});
```

**Client:**
```javascript
const lockId = await client.lock(['users']);
const newDocument = await client.post('users', {
  name: 'mark'
}, {
  lockId,
  lockStrategy: 'wait' // optional: can be 'fail' or 'wait'. default is 'wait'.
});
await client.unlock(lockId);
```
</details>

## License
This project is licensed under the terms of the AGPL-3.0 license.
