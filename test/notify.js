const fs = require('fs');

const WebSocket = require('ws');
const test = require('basictap');

const httpRequest = require('./helpers/httpRequest');
const createTestCluster = require('./helpers/createTestCluster');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

test('notify: post some data', async t => {
  t.plan(6);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify([1, { 'POST:/tests/.*': true }]));

    httpRequest(`${node.url}/tests`, {
      method: 'POST',
      data: { a: 1 }
    }).then(() => {
      cluster.closeAll();
    });
  });

  ws.on('message', function incoming (rawData) {
    const [type, data] = JSON.parse(rawData);

    if (type === 'A') {
      t.equal(data, 1);
      return;
    }

    const [path, resource, pattern] = data;
    t.equal(pattern, 'POST:/tests/.*');
    t.ok(resource.startsWith('/tests/'));
    t.equal(resource.length, 43);
    t.ok(path.startsWith('POST:/tests/'));
    t.equal(path.length, 48);
  });
});

test('notify: twos posts', async t => {
  t.plan(10);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify([1, { 'POST:/tests1/.*': true }]));
    ws.send(JSON.stringify([2, { 'POST:/tests2/.*': true }]));

    const promises = [];
    promises[0] = httpRequest(`${node.url}/tests1`, {
      method: 'POST',
      data: { a: 1 }
    });

    promises[1] = httpRequest(`${node.url}/tests2`, {
      method: 'POST',
      data: { a: 2 }
    });

    Promise.all(promises).then(() => cluster.closeAll());
  });

  const store = [];
  function done () {
    if (store.length !== 2) {
      return;
    }

    store.sort((a, b) => a[2] > b[2] ? 1 : -1);

    {
      const [path, resource, pattern] = store[0];
      t.equal(pattern, 'POST:/tests1/.*');
      t.ok(resource.startsWith('/tests1/'));
      t.equal(resource.length, 44);
      t.ok(path.startsWith('POST:/tests1/'));
      t.equal(path.length, 49);
    }

    {
      const [path, resource, pattern] = store[1];
      t.equal(pattern, 'POST:/tests2/.*');
      t.ok(resource.startsWith('/tests2/'));
      t.equal(resource.length, 44);
      t.ok(path.startsWith('POST:/tests2/'));
      t.equal(path.length, 49);
    }
  }

  ws.on('message', function incoming (rawData) {
    const [type, parsedData] = JSON.parse(rawData);
    if (type === 'A') {
      return;
    }

    store.push(parsedData);
    done();
  });
});

test('notify: one not the other', async t => {
  t.plan(6);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify([1, { 'POST:/tests2/.*': true }]));

    const promises = [];
    promises[0] = httpRequest(`${node.url}/tests1`, {
      method: 'POST',
      data: { a: 1 }
    });

    promises[1] = httpRequest(`${node.url}/tests2`, {
      method: 'POST',
      data: { a: 2 }
    });

    promises[3] = httpRequest(`${node.url}/tests3`, {
      method: 'POST',
      data: { a: 3 }
    });

    Promise.all(promises).then(() => cluster.closeAll());
  });

  ws.on('message', function incoming (rawData) {
    const [type, data] = JSON.parse(rawData);
    if (type === 'A') {
      t.equal(data, 1);
      return;
    }

    const [path, resource, pattern] = data;
    t.equal(pattern, 'POST:/tests2/.*');
    t.ok(resource.startsWith('/tests2/'));
    t.equal(resource.length, 44);
    t.ok(path.startsWith('POST:/tests2/'));
    t.equal(path.length, 49);
  });
});
