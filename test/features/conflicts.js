import assert from 'assert';
import c from '../../lib/constants.js';
import createTestServers from '../helpers/createTestServers.js';
import tcpocket from 'tcpocket';
import test from 'basictap';
import waitUntil from '../../lib/utils/waitUntil.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function createConflict (servers, client) {
  let disablePost = true;

  servers[1].controllers.internal.add({
    command: c.POST,
    priority: 10,
    conditions: [() => disablePost],
    handler: async () => {
      throw new Error('some error, preventing post');
    }
  });

  // Post a new document
  const result = await client.send(c.POST, {
    [c.COLLECTION_ID]: 'test',
    [c.DATA]: {
      foo: 'bar'
    }
  });

  assert.equal(result.command, c.STATUS_CREATED);

  // Test all servers receive the conflict
  await sleep(500);

  for (const server of servers) {
    const foundConflict = server.conflicts.items.find(conflict => {
      return conflict.document && conflict.document.foo === 'bar';
    });

    assert.ok(foundConflict);
  }

  // Disable our fake error and test all servers receive the resolution
  disablePost = false;
}

test('conflicts - post failure creates conflict', async t => {
  t.plan(2);
  t.timeout(3000);

  const servers = await createTestServers(2);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createConflict(servers, client);

  await sleep(500);

  for (const server of servers) {
    const foundConflict = server.conflicts.items.find(conflict => {
      return !conflict.resolved && conflict.document && conflict.document.foo === 'bar';
    });

    t.equal(foundConflict, undefined, 'conflict not found');
  }

  await waitUntil(() => {
    const unhealthyServers = servers.filter((server) => {
      return server.thisNode.status !== 'healthy';
    });

    return unhealthyServers.length === 0;
  });

  await Promise.all([
    client.close(),
    servers.close()
  ]);
});

test('conflicts - cleanup resolved', async t => {
  t.plan(4);
  t.timeout(3000);

  const servers = await createTestServers(2);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createConflict(servers, client);

  await sleep(500);

  for (const server of servers) {
    const foundConflict = server.conflicts.items.find(conflict => {
      return !conflict.resolved && conflict.document && conflict.document.foo === 'bar';
    });

    t.equal(foundConflict, undefined, 'conflict not found');
  }

  await sleep(1500);

  for (const server of servers) {
    const foundConflict = server.conflicts.items.find(conflict => {
      return conflict.document && conflict.document.foo === 'bar';
    });

    t.equal(foundConflict, undefined, 'conflict should not be found');
  }

  await Promise.all([
    client.close(),
    servers.close()
  ]);
});

test('conflicts - post to offline node', async t => {
  t.plan(9);
  t.timeout(5000);

  const servers = await createTestServers(3);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await servers[2].close();

  // Post a new document
  const result = await client.send(c.POST, {
    [c.COLLECTION_ID]: 'test',
    [c.DATA]: {
      foo: 'bar'
    }
  });

  t.equal(result.command, c.STATUS_CREATED, 'post should return STATUS_CREATED');

  // Test all servers receive the conflict
  await sleep(500);

  for (const server of servers.slice(0, -1)) {
    const foundConflict = server.conflicts.items.find(conflict => {
      return conflict.document && conflict.document.foo === 'bar';
    });

    t.ok(foundConflict, 'found conflict');
  }

  // Disable our fake error and test all servers receive the resolution
  servers[2] = await servers[2].recreate();

  await sleep(500);

  for (const server of servers) {
    const foundConflict = server.conflicts.items.find(conflict => {
      return !conflict.resolved && conflict.document && conflict.document.foo === 'bar';
    });

    t.equal(foundConflict, undefined, 'conflict not found');
  }

  await sleep(500);

  for (const server of servers) {
    t.equal(server.thisNode.status, 'healthy', 'server status is healthy');
  }

  await Promise.all([
    client.close(),
    servers.close()
  ]);
});
