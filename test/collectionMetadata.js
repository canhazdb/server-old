const fs = require('fs');

const test = require('basictap');
const httpRequest = require('./helpers/httpRequest');
const createTestCluster = require('./helpers/createTestCluster');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

test('collectionMetadata - create a record', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  await sleep(100);

  const metadataRequest = await httpRequest(`${cluster.nodes[1].url}/system.collections`, {
    method: 'GET'
  });

  t.equal(metadataRequest.data[0].documentCount, 1);

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

test('collectionMetadata - delete a record before debarrel', async t => {
  t.plan(5);

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

  await sleep(100);

  const metadataRequest = await httpRequest(`${cluster.nodes[1].url}/system.collections`, {
    method: 'GET'
  });

  t.equal(metadataRequest.data[0].documentCount, 0);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests/${postRequest.data.id}`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {});

  t.equal(postRequest.status, 201);
  t.equal(deleteRequest.status, 200);
  t.equal(getRequest.status, 404);
});

test('collectionMetadata - delete a record after tick', async t => {
  t.plan(4);

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  await sleep(300);

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
