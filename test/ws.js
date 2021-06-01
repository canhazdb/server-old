const fs = require('fs');

const WebSocket = require('ws');
const test = require('basictap');

const httpRequest = require('./helpers/httpRequest');
const createTestCluster = require('./helpers/createTestCluster');

const {
  STATUS,
  DOCUMENT,
  COLLECTION_ID
} = require('../lib/constants');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

test('post: post some data', async t => {
  t.plan(6);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify([1, 'POST', {
      [COLLECTION_ID]: 'tests',
      [DOCUMENT]: {
        a: 1
      }
    }]));
  });

  ws.on('message', async function incoming (rawData) {
    const [type, acceptId, data] = JSON.parse(rawData);

    t.equal(type, 'A', 'should have correct type');
    t.equal(acceptId, 1, 'should have correct acceptId');
    t.equal(data[STATUS], 201, 'should have correct status');
    t.equal(data[DOCUMENT].id.length, 36, 'should return valid id');
    t.equal(data[DOCUMENT].a, 1, 'should return document field');

    const response = await httpRequest(`${node.url}/tests`, {
      method: 'GET'
    });

    t.deepEqual(response.data[0], data[DOCUMENT], 'future query returns document');
    cluster.closeAll();
  });
});
