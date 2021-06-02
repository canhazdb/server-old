const fs = require('fs');

const WebSocket = require('ws');
const test = require('basictap');

const httpRequest = require('./helpers/httpRequest');
const createTestCluster = require('./helpers/createTestCluster');

const {
  STATUS,
  DOCUMENT,
  DOCUMENTS,
  QUERY,
  COLLECTION_ID
} = require('../lib/constants');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

test('get: getAll some data', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const insertResponses = await Promise.all([
    httpRequest(`${node.url}/tests`, {
      method: 'POST',
      data: { a: 1 }
    }),

    httpRequest(`${node.url}/tests`, {
      method: 'POST',
      data: { a: 2 }
    })
  ]);

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify([1, 'GET', {
      [COLLECTION_ID]: 'tests',
      [QUERY]: {
        a: 1
      }
    }]));
  });

  ws.on('message', async function incoming (rawData) {
    const [type, acceptId, data] = JSON.parse(rawData);

    t.equal(type, 'A', 'should have correct type');
    t.equal(acceptId, 1, 'should have correct acceptId');
    t.equal(data[STATUS], 200, 'should have correct status');
    t.equal(data[DOCUMENTS][0].id, insertResponses[0].data.id, 'had correct document id');
    t.equal(data[DOCUMENTS][0].a, 1, 'should return document field');

    cluster.closeAll();
  });
});

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
