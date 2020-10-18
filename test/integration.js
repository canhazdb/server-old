const fs = require('fs');

const test = require('tape-catch');
const httpRequest = require('./helpers/httpRequest');
const clearData = require('./helpers/clearData');
const createTestCluster = require('./helpers/createTestCluster');
const canhazdb = require('../lib');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

test('post: and get some data', async t => {
  t.plan(3);

  await clearData();

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const postRequest = await httpRequest(`${node.url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const getRequest = await httpRequest(`${node.url}/tests/${postRequest.data.id}`);
  cluster.closeAll();

  t.deepEqual(getRequest.data, {
    id: getRequest.data.id ? getRequest.data.id : t.fail(),
    a: 1,
    b: 2,
    c: 3
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('post: some data with invalid collection name', async t => {
  t.plan(2);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/not$allowed/notfound`, {
    method: 'POST',
    data: {
      a: 1
    }
  });

  cluster.closeAll();

  t.deepEqual(postRequest.data, {
    errors: ['collectionId can only contain a-z, A-Z, 0-9, dashs or dots']
  });

  t.equal(postRequest.status, 422);
});

test('put: some data', async t => {
  t.plan(3);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1
    }
  });

  await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`, {
    method: 'PUT',
    data: {
      a: 2
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {
    id: postRequest.data.id,
    a: 2
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('patch: some data', async t => {
  t.plan(3);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1
    }
  });

  await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`, {
    method: 'PATCH',
    data: {
      b: "a'2"
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {
    id: postRequest.data.id,
    a: 1,
    b: "a'2"
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('delete: record returns a 404', async t => {
  t.plan(4);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const deleteRequest = await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`, {
    method: 'DELETE'
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests/${postRequest.data.id}`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {});

  t.equal(postRequest.status, 201);
  t.equal(deleteRequest.status, 200);
  t.equal(getRequest.status, 404);
});

test('find: collection does not exist', async t => {
  t.plan(2);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

  cluster.closeAll();

  t.deepEqual(getRequest.status, 404);
  t.deepEqual(getRequest.data, []);
});

test('find: return all three records', async t => {
  t.plan(8);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  await Promise.all([
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { a: 1, b: 2, c: 3 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { d: 4, e: 5, f: 6 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { g: 7, h: 8, i: 9 }
    })
  ]);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

  cluster.closeAll();

  t.equal(getRequest.data.length, 3);
  t.equal(getRequest.status, 200);

  t.ok(getRequest.data[0].id);
  t.ok(getRequest.data[1].id);
  t.ok(getRequest.data[2].id);

  getRequest.data.forEach(item => {
    delete item.id;
  });

  t.deepEqual(getRequest.data.find(item => item.a), { a: 1, b: 2, c: 3 });
  t.deepEqual(getRequest.data.find(item => item.d), { d: 4, e: 5, f: 6 });
  t.deepEqual(getRequest.data.find(item => item.g), { g: 7, h: 8, i: 9 });
});

test('find: filter by querystring', async t => {
  t.plan(4);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  await Promise.all([
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { a: 1, b: 2, c: 3 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { d: 4, e: 5, f: 6 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { g: 7, h: 8, i: 9 }
    })
  ]);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?query={"d":4}`);

  cluster.closeAll();

  t.equal(getRequest.data.length, 1);
  t.equal(getRequest.status, 200);

  t.ok(getRequest.data[0].id);
  delete getRequest.data[0].id;

  t.deepEqual(getRequest.data[0], { d: 4, e: 5, f: 6 });
});

test('filter: find one out of three records', async t => {
  t.plan(4);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  await Promise.all([
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { a: 1, b: 2, c: 3 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { d: 4, e: 5, f: 6 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { g: 7, h: 8, i: 9 }
    })
  ]);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?query={"d":4}`);

  cluster.closeAll();

  t.equal(getRequest.data.length, 1);
  t.equal(getRequest.status, 200);

  t.ok(getRequest.data[0].id);
  delete getRequest.data[0].id;

  t.deepEqual(getRequest.data[0], { d: 4, e: 5, f: 6 });
});

test('filter: delete two out of three records', async t => {
  t.plan(5);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const deletions = await httpRequest(`${cluster.nodes[2].url}/tests?query={"index":{"$gt":5}}`, { method: 'DELETE' });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

  cluster.closeAll();

  t.equal(deletions.status, 200);
  t.equal(deletions.data.changes, 4);

  t.equal(getRequest.status, 200);
  t.equal(getRequest.data.length, 6);

  t.ok(getRequest.data[0].id);
  delete getRequest.data[0].id;
});

test('filter: put two out of three records', async t => {
  t.plan(5);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const deletions = await httpRequest(`${cluster.nodes[2].url}/tests?query={"index":{"$gt":5}}`, {
    method: 'PUT',
    data: {
      a: 1
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

  cluster.closeAll();

  t.equal(deletions.status, 200);
  t.equal(deletions.data.changes, 4);

  t.equal(getRequest.status, 200);
  t.equal(getRequest.data.length, 10);

  t.equal(getRequest.data.filter(item => item.a === 1).length, 4);
});

test('limit: find three records', async t => {
  t.plan(2);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?limit=3`);

  cluster.closeAll();

  t.equal(getRequest.data.length, 3);
  t.equal(getRequest.status, 200);
});

test('order: ascending order three records', async t => {
  t.plan(5);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?order=asc(index)`);

  cluster.closeAll();

  t.equal(getRequest.data.length, 10);
  t.equal(getRequest.status, 200);

  t.deepEqual(getRequest.data[0].index, 0);
  t.deepEqual(getRequest.data[1].index, 1);
  t.deepEqual(getRequest.data[5].index, 5);
});

test('order: descending order three records', async t => {
  t.plan(5);

  await clearData();

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?order=desc(index)`);

  cluster.closeAll();

  t.equal(getRequest.data.length, 10);
  t.equal(getRequest.status, 200);

  t.deepEqual(getRequest.data[0].index, 9);
  t.deepEqual(getRequest.data[1].index, 8);
  t.deepEqual(getRequest.data[5].index, 4);
});

test('autojoin: join learned nodes automatically', async t => {
  t.plan(4);

  await clearData();

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const node4 = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  await node4.join({ host: node.host, port: node.port });

  cluster.closeAll();
  node4.close();

  const getAllPorts = node => node.state.nodes.map(node => node.port).sort();
  t.deepEqual(getAllPorts(node4), [7060, 7061, 7062, 7071]);

  t.deepEqual(getAllPorts(cluster.nodes[0]), [7060, 7061, 7062, 7071]);
  t.deepEqual(getAllPorts(cluster.nodes[1]), [7060, 7061, 7062, 7071]);
  t.deepEqual(getAllPorts(cluster.nodes[2]), [7060, 7061, 7062, 7071]);
});
