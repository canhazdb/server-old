const fs = require('fs');

const test = require('basictap');

const canhazdb = require('../server');
const createClient = require('../client');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')]
};

test('unknown keys', async t => {
  t.plan(7);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  client.getOne('tests', { wrongKey: 1 }).catch(error => {
    t.equal(error.message, 'canhazdb error: unknown keys wrongKey');
  });

  client.getAll('tests', { wrongKey: 1 }).catch(error => {
    t.equal(error.message, 'canhazdb error: unknown keys wrongKey');
  });

  client.post('tests', { a: 1 }, { wrongKey: 1 }).catch(error => {
    t.equal(error.message, 'canhazdb error: unknown keys wrongKey');
  });

  client.put('tests', { a: 1 }, { wrongKey: 1 }).catch(error => {
    t.equal(error.message, 'canhazdb error: unknown keys wrongKey');
  });

  client.patch('tests', { a: 1 }, { wrongKey: 1 }).catch(error => {
    t.equal(error.message, 'canhazdb error: unknown keys wrongKey');
  });

  client.delete('tests', { wrongKey: 1 }).catch(error => {
    t.equal(error.message, 'canhazdb error: unknown keys wrongKey');
  });

  client.lock('not array').catch(error => {
    t.equal(error.message, 'canhazdb error: keys must be array but got not array');
  });

  await node.close();
  await client.close();
});

test('lock and unlock', async t => {
  t.plan(5);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  const lock1 = client.lock(['tests']).then(async lockId => {
    t.pass('lock 1 ran');
    t.equal(lockId.length, 36, 'lockId was uuid');
    return client.unlock(lockId);
  });

  const lock2 = client.lock(['tests']).then(async lockId => {
    t.pass('lock 2 ran');
    return client.unlock(lockId);
  });

  const lock3 = client.lock(['tests']).then(async lockId => {
    t.pass('lock 3 ran');
    return client.unlock(lockId);
  });

  await Promise.all([lock1, lock2, lock3]);

  await node.close();
  await client.close();

  t.pass();
});

test('get', async t => {
  t.plan(1);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  const result = await client.getAll('tests');

  await node.close();
  await client.close();

  t.deepEqual(result, []);
});

test('get with limit', async t => {
  t.plan(1);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  await Promise.all([
    await client.post('tests', { a: 1 }),
    await client.post('tests', { a: 2 }),
    await client.post('tests', { a: 3 })
  ]);

  const result = await client.getAll('tests', { limit: 2 });

  await node.close();
  await client.close();

  t.deepEqual(result.length, 2);
});

test('post and get', async t => {
  t.plan(1);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1 });
  const result = await client.getAll('tests');

  await node.close();
  await client.close();

  t.deepEqual(result[0].a, 1);
});

test('post and get specific fields', async t => {
  t.plan(1);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1, b: 2, c: 3 });
  const result = await client.getAll('tests', { fields: ['b'] });

  await node.close();
  await client.close();

  t.deepEqual(result, [{
    id: result[0].id,
    b: 2
  }]);
});

test('post, put and get', async t => {
  t.plan(5);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1 });
  const document = await client.post('tests', { a: 2 });
  const putted = await client.put('tests', { b: 3 }, { query: { id: document.id } });
  const reget = await client.getOne('tests', { query: { id: document.id } });

  await node.close();
  await client.close();

  t.deepEqual(document.a, 2);
  t.deepEqual(putted.changes, 1);
  t.ok(reget.id);
  t.ok(reget.b);
  t.deepEqual(reget.b, 3);
});

test('post, patch and get', async t => {
  t.plan(6);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  await client.post('tests', { a: 1 });
  const document = await client.post('tests', { a: 2 });
  const patched = await client.patch('tests', { b: 3 }, { query: { id: document.id } });
  const reget = await client.getOne('tests', { query: { id: document.id } });

  await node.close();
  await client.close();

  t.deepEqual(document.a, 2);
  t.deepEqual(patched.changes, 1);
  t.ok(reget.id);
  t.ok(reget.b);
  t.deepEqual(reget.a, 2);
  t.deepEqual(reget.b, 3);
});

test('post, delete and get', async t => {
  t.plan(3);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  const document = await client.post('tests', { a: 1 });
  const deletion = await client.delete('tests', { query: { id: document.id } });
  const reget = await client.getOne('tests', { query: { id: document.id } });

  await node.close();
  await client.close();

  t.deepEqual(document.a, 1);
  t.deepEqual(deletion.changes, 1);
  t.notOk(reget);
});

test('serialise undefined', async t => {
  t.plan(5);

  const client = await createClient('http://example.com', { disableNotify: true });

  try {
    await client.getAll('test', { query: { un: undefined } });
  } catch (error) {
    t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
  }

  try {
    await client.getOne('test', { query: { un: undefined } });
  } catch (error) {
    t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
  }

  try {
    await client.put('test', {}, { query: { un: undefined } });
  } catch (error) {
    t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
  }

  try {
    await client.patch('test', {}, { query: { un: undefined } });
  } catch (error) {
    t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
  }

  try {
    await client.delete('test', { query: { un: undefined } });
  } catch (error) {
    t.equal(error.message, 'canhazdb:client can not serialise an object with undefined');
  }

  await client.close();
});

test('invalid query - getAll', async t => {
  t.plan(2);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
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
      error: error.data.error,
      type: 'GET',
      collectionId: 'tests',
      query: { $nin: ['1'] },
      fields: ''
    });
  }

  await node.close();
  await client.close();
});

test('invalid query - getOne', async t => {
  t.plan(2);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
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
      error: error.data.error,
      type: 'GET',
      collectionId: 'tests',
      query: { $nin: ['1'] },
      fields: ''
    });
  }

  await node.close();
  await client.close();
});

test('invalid query - put', async t => {
  t.plan(2);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
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
      error: error.data.error,
      type: 'PUT',
      collectionId: 'tests',
      query: { $nin: ['1'] }
    });
  }

  await node.close();
  await client.close();
});

test('invalid query - patch', async t => {
  t.plan(2);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
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
      error: error.data.error,
      type: 'PATCH',
      collectionId: 'tests',
      query: { $nin: ['1'] }
    });
  }

  await node.close();
  await client.close();
});

test('invalid query - delete', async t => {
  t.plan(2);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
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
      error: error.data.error,
      type: 'DELETE',
      collectionId: 'tests',
      query: { $nin: ['1'] }
    });
  }

  await node.close();
  await client.close();
});

test('post and notify', async t => {
  t.plan(5);

  const node = await canhazdb({ host: 'localhost', port: 11505, queryPort: 11506, tls, single: true });
  const client = createClient(node.url, { tls });

  let alreadyHandled = false;

  return new Promise((resolve) => {
    async function handler (path, collectionId, resourceId, pattern) {
      if (alreadyHandled) {
        t.fail('handler should only be called once');
      }

      client.off('POST:/tests', handler);

      client.post('tests', { a: 1 }).then(async document => {
        await node.close();
        await client.close();
        resolve();
      });

      t.equal(pattern, 'POST:/tests');
      t.ok(path.startsWith('POST:/tests/'), 'path starts with /tests/');
      t.equal(path.length, 48);
      t.equal(collectionId, 'tests');
      t.equal(resourceId.length, 36);

      alreadyHandled = true;
    }

    client.on('POST:/tests', handler).then(() => {
      client.post('tests', { a: 1 });
    });
  });
});

test('post and notify to multiple', async t => {
  t.plan(5);

  const node = await canhazdb({ host: 'localhost', tls, single: true });
  const client = createClient(node.url, { tls });

  let alreadyHandled = false;

  async function handler (path, collectionId, resourceId, pattern) {
    if (alreadyHandled) {
      t.fail('handler should only be called once');
    }

    client.off('POST:/tests', handler);

    client.post('tests', { a: 1 }).then(async document => {
      gotCalled();
    });

    t.equal(pattern, 'POST:/tests');
    t.ok(path.startsWith('POST:/tests/'), 'path starts with /tests/');
    t.equal(path.length, 48);
    t.equal(collectionId, 'tests');
    t.equal(resourceId.length, 36);

    alreadyHandled = true;
  }

  let calls = 0;
  async function gotCalled () {
    calls = calls + 1;
    if (calls === 2) {
      await node.close();
      await client.close();
      t.pass('got called twice');
    }
  }
  client.on('POST:/tests', handler).then(() => {
    client.post('tests', { a: 1 });
  });
  client.on('POST:/tests', gotCalled);
});
