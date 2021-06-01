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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('notify: post some data', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify([1, 'NOTIFY', 'POST:/tests/.*']));

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

    const [path, collectionId, resourceId, pattern] = data;

    t.ok(path.startsWith('POST:/tests/'));
    t.equal(collectionId, 'tests');
    t.equal(resourceId.length, 36);
    t.equal(pattern, 'POST:/tests/.*');
  });
});

test('unnotify', async t => {
  t.plan(2);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', async function open () {
    ws.send(JSON.stringify([1, 'NOTIFY', 'POST:/tests/.*']));
    await sleep(50);
    ws.send(JSON.stringify([1, 'UNNOTIFY', 'POST:/tests/.*']));
    await sleep(50);

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

    t.fail('should not have been called');
  });
});

test('notify: twos posts', async t => {
  t.plan(8);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify([1, 'NOTIFY', 'POST:/tests1/.*']));
    ws.send(JSON.stringify([2, 'NOTIFY', 'POST:/tests2/.*']));

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

    store.sort((a, b) => a[3] > b[3] ? 1 : -1);

    {
      const [path, collectionId, resourceId, pattern] = store[0];

      t.ok(path.startsWith('POST:/tests1/'));
      t.equal(collectionId, 'tests1');
      t.equal(resourceId.length, 36);
      t.equal(pattern, 'POST:/tests1/.*');
    }

    {
      const [path, collectionId, resourceId, pattern] = store[1];

      t.ok(path.startsWith('POST:/tests2/'));
      t.equal(collectionId, 'tests2');
      t.equal(resourceId.length, 36);
      t.equal(pattern, 'POST:/tests2/.*');
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
  t.plan(5);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', function open () {
    ws.send(JSON.stringify([1, 'NOTIFY', 'POST:/tests2/.*']));

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

    const [path, collectionId, resourceId, pattern] = data;

    t.ok(path.startsWith('POST:/tests2/'));
    t.equal(collectionId, 'tests2');
    t.equal(resourceId.length, 36);
    t.equal(pattern, 'POST:/tests2/.*');
  });
});

test('ws - unknown command', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const ws = new WebSocket(node.wsUrl, tls);
  ws.on('open', async function open () {
    ws.send(JSON.stringify([1, 'UNKNOWN']));
  });

  ws.on('message', function incoming (rawData) {
    const [type, acceptId, data] = JSON.parse(rawData);

    t.equal(type, 'R');
    t.equal(acceptId, 1);
    t.equal(data, 'COMMAND_NOT_FOUND');

    cluster.closeAll();
  });
});
