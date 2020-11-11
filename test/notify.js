const fs = require('fs');

const WebSocket = require('ws');
const test = require('tape-catch');

const httpRequest = require('./helpers/httpRequest');
const clearData = require('./helpers/clearData');
const createTestCluster = require('./helpers/createTestCluster');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

test('notify: post some data', async t => {
  t.plan(2);

  await clearData();

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify({ '/tests/.*': true }));

    httpRequest(`${node.url}/tests`, {
      method: 'POST',
      data: { a: 1 }
    });
  });

  ws.on('message', function incoming (data) {
    cluster.closeAll();

    const parsedData = JSON.parse(data);
    t.equal(parsedData[0], '/tests/.*');
    t.ok(parsedData[1].startsWith('/tests/'));
  });
});

test('notify: twos posts', async t => {
  t.plan(4);

  await clearData();

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify({ '/tests1/.*': true }));
    ws.send(JSON.stringify({ '/tests2/.*': true }));

    httpRequest(`${node.url}/tests1`, {
      method: 'POST',
      data: { a: 1 }
    });

    httpRequest(`${node.url}/tests2`, {
      method: 'POST',
      data: { a: 2 }
    });
  });

  const store = [];
  function done () {
    if (store.length !== 2) {
      return;
    }

    store.sort((a, b) => a[0] > b[0] ? 1 : -1);

    cluster.closeAll();

    t.equal(store[0][0], '/tests1/.*');
    t.ok(store[0][1].startsWith('/tests1/'));

    t.equal(store[1][0], '/tests2/.*');
    t.ok(store[1][1].startsWith('/tests2/'));
  }

  ws.on('message', function incoming (data) {
    const parsedData = JSON.parse(data);
    store.push(parsedData);
    done();
  });
});

test('notify: one not the other', async t => {
  t.plan(2);

  await clearData();

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify({ '/tests2/.*': true }));

    httpRequest(`${node.url}/tests1`, {
      method: 'POST',
      data: { a: 1 }
    });
    httpRequest(`${node.url}/tests2`, {
      method: 'POST',
      data: { a: 1 }
    });
    httpRequest(`${node.url}/tests3`, {
      method: 'POST',
      data: { a: 1 }
    });
  });

  ws.on('message', function incoming (data) {
    cluster.closeAll();

    const parsedData = JSON.parse(data);
    t.equal(parsedData[0], '/tests2/.*');
    t.ok(parsedData[1].startsWith('/tests2/'));
  });
});
