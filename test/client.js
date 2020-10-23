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

// test('get', async t => {
//   t.plan(1);

//   await clearData();

//   const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
//   const client = createClient(node.url, { tls });

//   const result = await client.getAll('tests');

//   await node.close();

//   t.deepEqual(result, []);
// });

// test('get with limit', async t => {
//   t.plan(1);

//   await clearData();

//   const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
//   const client = createClient(node.url, { tls });

//   await Promise.all([
//     await client.post('tests', { a: 1 }),
//     await client.post('tests', { a: 2 }),
//     await client.post('tests', { a: 3 })
//   ]);

//   const result = await client.getAll('tests', { limit: 2 });

//   await node.close();

//   t.deepEqual(result.length, 2);
// });

// test('post and get', async t => {
//   t.plan(1);

//   await clearData();

//   const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
//   const client = createClient(node.url, { tls });

//   await client.post('tests', { a: 1 });
//   const result = await client.getAll('tests');

//   await node.close();

//   t.deepEqual(result[0].a, 1);
// });

// test('post and get specific fields', async t => {
//   t.plan(1);

//   await clearData();

//   const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
//   const client = createClient(node.url, { tls });

//   await client.post('tests', { a: 1, b: 2, c: 3 });
//   const result = await client.getAll('tests', { fields: ['b'] });

//   await node.close();

//   t.deepEqual(result, [{
//     id: result[0].id,
//     b: 2
//   }]);
// });

// test('post, put and get', async t => {
//   t.plan(5);

//   await clearData();

//   const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
//   const client = createClient(node.url, { tls });

//   await client.post('tests', { a: 1 });
//   const document = await client.post('tests', { a: 2 });
//   const putted = await client.put('tests', { b: 3 }, { query: { id: document.id } });
//   const reget = await client.getOne('tests', { query: { id: document.id } });

//   await node.close();

//   t.deepEqual(document.a, 2);
//   t.deepEqual(putted.changes, 1);
//   t.ok(reget.id);
//   t.ok(reget.b);
//   t.deepEqual(reget.b, 3);
// });

// test('post, patch and get', async t => {
//   t.plan(6);

//   await clearData();

//   const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
//   const client = createClient(node.url, { tls });

//   await client.post('tests', { a: 1 });
//   const document = await client.post('tests', { a: 2 });
//   const patched = await client.patch('tests', { b: 3 }, { query: { id: document.id } });
//   const reget = await client.getOne('tests', { query: { id: document.id } });

//   await node.close();

//   t.deepEqual(document.a, 2);
//   t.deepEqual(patched.changes, 1);
//   t.ok(reget.id);
//   t.ok(reget.b);
//   t.deepEqual(reget.a, 2);
//   t.deepEqual(reget.b, 3);
// });

// test('post, delete and get', async t => {
//   t.plan(3);

//   await clearData();

//   const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
//   const client = createClient(node.url, { tls });

//   const document = await client.post('tests', { a: 1 });
//   const deletion = await client.delete('tests', { id: document.id });
//   const reget = await client.getOne('tests', { query: { id: document.id } });

//   await node.close();

//   t.deepEqual(document.a, 1);
//   t.deepEqual(deletion.changes, 1);
//   t.notOk(reget);
// });

// test('serialise undefined', async t => {
//   t.plan(5);

//   const client = await createClient('http://example.com');

//   try {
//     await client.getAll('test', { query: { un: undefined } });
//   } catch (error) {
//     t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
//   }

//   try {
//     await client.getOne('test', { query: { un: undefined } });
//   } catch (error) {
//     t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
//   }

//   try {
//     await client.put('test', {}, { query: { un: undefined } });
//   } catch (error) {
//     t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
//   }

//   try {
//     await client.patch('test', {}, { query: { un: undefined } });
//   } catch (error) {
//     t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
//   }

//   try {
//     await client.delete('test', { query: { un: undefined } });
//   } catch (error) {
//     t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
//   }
// });

test('invalid query - getAll', async t => {
  t.plan(2);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1 });

  try {
    await client.getAll('tests', {
      query: {
        $nin: ['1']
      }
    });
  } catch (error) {
    t.equal(error.message, 'canhazdb error');
    t.deepEqual(error.data, {
      error: 'SQLITE_ERROR: no such column: undefined',
      type: 'get',
      collectionId: 'tests',
      query: { $nin: ['1'] },
      fields: '',
      order: null,
      limit: null
    });
  }

  await node.close();
});

test('invalid query - getOne', async t => {
  t.plan(2);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1 });

  try {
    await client.getOne('tests', {
      query: {
        $nin: ['1']
      }
    });
  } catch (error) {
    t.equal(error.message, 'canhazdb error');
    t.deepEqual(error.data, {
      error: 'SQLITE_ERROR: no such column: undefined',
      type: 'get',
      collectionId: 'tests',
      query: { $nin: ['1'] },
      fields: '',
      order: null,
      limit: null
    });
  }

  await node.close();
});

test('invalid query - put', async t => {
  t.plan(2);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1 });

  try {
    await client.put('tests', {}, {
      query: {
        $nin: ['1']
      }
    });
  } catch (error) {
    t.equal(error.message, 'canhazdb error');
    t.deepEqual(error.data, {
      error: 'SQLITE_ERROR: no such column: undefined',
      type: 'put',
      collectionId: 'tests',
      query: { $nin: ['1'] }
    });
  }

  await node.close();
});

test('invalid query - patch', async t => {
  t.plan(2);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1 });

  try {
    await client.patch('tests', {}, {
      query: {
        $nin: ['1']
      }
    });
  } catch (error) {
    t.equal(error.message, 'canhazdb error');
    t.deepEqual(error.data, {
      error: 'SQLITE_ERROR: no such column: undefined',
      type: 'patch',
      collectionId: 'tests',
      query: { $nin: ['1'] }
    });
  }

  await node.close();
});

test('invalid query - delete', async t => {
  t.plan(2);

  await clearData();

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1 });

  try {
    await client.delete('tests', {
      query: {
        $nin: ['1']
      }
    });
  } catch (error) {
    t.equal(error.message, 'canhazdb error');
    t.deepEqual(error.data, {
      error: 'SQLITE_ERROR: no such column: undefined',
      type: 'delete',
      collectionId: 'tests',
      query: { $nin: ['1'] }
    });
  }

  await node.close();
});
