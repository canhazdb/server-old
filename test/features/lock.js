import test from 'basictap';
import createTestServers from '../helpers/createTestServers.js';

import c from '../../lib/constants.js';
import tcpocket from 'tcpocket';
import waitUntil from '../../lib/utils/waitUntil.js';

test('lock - and post some data (success)', async t => {
  t.plan(5);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const lockRequest = await client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  });

  const postRequest = await client.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID],
    [c.DATA]: {
      foo: 'bar'
    }
  });

  const getRequest = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'tests',
    [c.QUERY]: { id: postRequest.json()[c.DATA].id }
  });

  const unlockRequest = await client.send(c.UNLOCK, {
    [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID]
  });
  t.equal(unlockRequest.command, c.STATUS_OK);

  await client.close();
  await servers.close();

  t.equal(postRequest.command, c.STATUS_CREATED);

  const getData = getRequest.json()[c.DATA];

  t.deepEqual(getRequest.json()[c.DATA], [{
    id: getData[0].id ? getData[0].id : t.fail(),
    foo: 'bar'
  }]);

  t.equal(postRequest.command, c.STATUS_CREATED);
  t.equal(getRequest.command, c.STATUS_OK);
});

test('lock - delete lock with incorrect id', async t => {
  t.plan(1);
  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const unlockRequest = await client.send(c.UNLOCK, {
    [c.LOCK_ID]: 'wrong'
  });

  t.equal(unlockRequest.command, c.STATUS_NOT_FOUND);

  await client.close();
  await servers.close();
});

test('lock - multiple happen in order', async t => {
  t.plan(6);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  let firstFinished = false;
  let secondFinished = false;

  const first = client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  }).then(async lockRequest => {
    const postRequest = await client.send(c.POST, {
      [c.COLLECTION_ID]: 'tests',
      [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID],
      [c.DATA]: {
        a: 1
      }
    });

    t.equal(postRequest.command, c.STATUS_CREATED);

    firstFinished = true;

    const unlockRequest = await client.send(c.UNLOCK, {
      [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID]
    });

    t.equal(unlockRequest.command, c.STATUS_OK);
  });

  const second = client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  }).then(async lockRequest => {
    t.ok(firstFinished, 'first lock has finished before second starts');

    const postRequest = await client.send(c.POST, {
      [c.COLLECTION_ID]: 'tests',
      [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID],
      [c.DATA]: {
        a: 2
      }
    });

    t.equal(postRequest.command, c.STATUS_CREATED);

    secondFinished = true;

    const unlockRequest = await client.send(c.UNLOCK, {
      [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID]
    });

    t.equal(unlockRequest.command, c.STATUS_OK);
  });

  await Promise.all([first, second]);

  await client.close();
  await servers.close();

  t.ok(secondFinished, 'second lock ran');
});

test('lock - and post some data (conflict + fail)', async t => {
  t.plan(2);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const lockRequest = await client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  });

  const postRequest = await client.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.LOCK_STRATEGY]: c.LOCK_STRATEGY_FAIL,
    [c.DATA]: {
      foo: 'bar'
    }
  });

  const unlockRequest = await client.send(c.UNLOCK, {
    [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID]
  });

  t.equal(unlockRequest.command, c.STATUS_OK);

  await client.close();
  await servers.close();

  t.equal(postRequest.command, c.STATUS_SERVER_ERROR);
});

test('lock - and post some data (conflict + wait)', async t => {
  t.plan(5);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const lockRequest = await client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  });

  client.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID],
    [c.LOCK_STRATEGY]: c.LOCK_STRATEGY_WAIT,
    [c.DATA]: {
      foo: 'bar'
    }
  }).then(async postRequest => {
    const postDocument = postRequest.json()[c.DATA];

    const getRequest = await client.send(c.GET, {
      [c.COLLECTION_ID]: 'tests',
      [c.QUERY]: { id: postDocument.id }
    });

    await servers.close();

    t.equal(postRequest.command, c.STATUS_CREATED);
    t.deepEqual(postDocument, {
      id: postDocument.id ? postDocument.id : t.fail(),
      foo: 'bar'
    });

    t.equal(postRequest.command, c.STATUS_CREATED);
    t.equal(getRequest.command, c.STATUS_OK);
  });

  const unlockRequest = await client.send(c.UNLOCK, {
    [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID]
  });

  t.equal(unlockRequest.command, c.STATUS_OK);
});

test('lock - all methods lock', async t => {
  t.plan(4);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  let unlocked = false;

  const postRequest = await client.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.DATA]: {
      foo: 'bar'
    }
  });

  const postDocument = postRequest.json()[c.DATA];

  const lockRequest = await client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  });

  const putRequest = client.send(c.PUT, {
    [c.COLLECTION_ID]: 'tests',
    [c.QUERY]: { id: postDocument.id },
    [c.DATA]: {
      foo: 'baz'
    }
  });

  const patchRequest = client.send(c.PATCH, {
    [c.COLLECTION_ID]: 'tests',
    [c.QUERY]: { id: postDocument.id },
    [c.DATA]: {
      foo: 'baz'
    }
  });

  Promise.all([putRequest, patchRequest])
    .then(async (args) => {
      const deleteRequest = await client.send(c.DELETE, {
        [c.COLLECTION_ID]: 'tests',
        [c.QUERY]: { id: postDocument.id }
      });

      await await servers.close();
      t.deepEqual(args.map(arg => arg.command), [c.STATUS_OK, c.STATUS_OK]);
      t.equal(deleteRequest.command, c.STATUS_OK);
      t.ok(unlocked, 'requests happened after unlock');
    });

  const unlockRequest = await client.send(c.UNLOCK, {
    [c.LOCK_ID]: lockRequest.json()[c.LOCK_ID]
  });

  t.equal(unlockRequest.command, c.STATUS_OK);

  unlocked = true;
});

test('lock - and wait but client closes', async t => {
  t.plan(1);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  });

  client.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.LOCK_STRATEGY]: c.LOCK_STRATEGY_WAIT,
    [c.DATA]: {
      foo: 'bar'
    }
  }).then(() => {
    t.fail('should not have resolved successfully');
  }).catch(async error => {
    await servers.close();
    t.equal(error.message, 'client disconnected');
  });

  setTimeout(() => {
    client.close();
  }, 200);
});

test('lock - and wait but node closes', async t => {
  t.plan(1);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  });

  client.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.LOCK_STRATEGY]: c.LOCK_STRATEGY_WAIT,
    [c.DATA]: {
      foo: 'bar'
    }
  }).then((postResponse) => {
    t.equal(postResponse.command, c.STATUS_SERVER_ERROR);
    client.close();
  });

  setTimeout(() => {
    servers.close();
  }, 500);
});

test('lock - system collection (system.locks)', async t => {
  t.plan(4);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const lockRequest = await client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  });

  t.equal(lockRequest.command, c.STATUS_OK, 'lockRequest has ok status');

  const getResponse = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'system.locks'
  });

  t.equal(getResponse.command, c.STATUS_OK, 'getResponse has ok status');

  const locks = getResponse.json()[c.DATA];

  const filteredLocks = locks.filter(lock => lock.path === 'tests');

  t.equal(filteredLocks.length, 1, 'had 1 lock');
  t.ok(filteredLocks[0].id, 'first lock had id');

  await client.close();
  await servers.close();
});

test.skip('lock - releases when node disconnects', async t => {
  t.plan(3);

  const servers = await createTestServers(3);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const lockResult = await client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  });

  t.equal(lockResult.command, c.STATUS_OK, 'lock had ok status');

  {
    const testLocks = servers[1].locks.queue.filter(lock => lock.path === 'tests');
    t.equal(testLocks.length, 1, 'lock was added');
  }

  await servers[0].close();

  const testLocks = await waitUntil(() => {
    const testLocks = servers[1].locks.queue.filter(lock => lock.path === 'tests');

    return testLocks.length === 0 ? testLocks : null;
  });

  t.equal(testLocks.length, 0, 'lock was removed');

  await client.close();
  await servers.close();
});
