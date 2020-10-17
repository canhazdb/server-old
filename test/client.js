const fs = require('fs');

const test = require('tape');

const clearData = require('./helpers/clearData');

const canhazdb = require('../lib');
const createClient = require('../lib/client');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')]
};

test('get', async t => {
  t.plan(1);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  const result = await client.getAll('tests');

  await node.close();

  t.deepEqual(result, []);
});

test('get with limit', async t => {
  t.plan(1);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  await Promise.all([
    await client.post('tests', { a: 1 }),
    await client.post('tests', { a: 2 }),
    await client.post('tests', { a: 3 })
  ]);

  const result = await client.getAll('tests', { limit: 2 });

  await node.close();

  t.deepEqual(result.length, 2);
});

test('post and get', async t => {
  t.plan(1);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1 });
  const result = await client.getAll('tests');

  await node.close();

  t.deepEqual(result[0].a, 1);
});

test('post, put and get', async t => {
  t.plan(5);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  const document = await client.post('tests', { a: 1 });
  const deletion = await client.put('tests', { b: 2 }, { id: document.id });
  const reget = await client.getOne('tests', { query: { id: document.id } });

  await node.close();

  t.deepEqual(document.a, 1);
  t.deepEqual(deletion.changes, 1);
  t.ok(reget.id);
  t.ok(reget.b);
  t.deepEqual(reget.b, 2);
});

test('post, delete and get', async t => {
  t.plan(3);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  const document = await client.post('tests', { a: 1 });
  const deletion = await client.delete('tests', { id: document.id });
  const reget = await client.getOne('tests', { query: { id: document.id } });

  await node.close();

  t.deepEqual(document.a, 1);
  t.deepEqual(deletion.changes, 1);
  t.notOk(reget);
});
