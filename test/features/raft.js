import test from 'basictap';
import tcpocket from 'tcpocket';
import createTestServers from '../helpers/createTestServers.js';
import waitUntil from '../../lib/utils/waitUntil.js';
import c from '../../lib/constants.js';

test('raft - one node elect self as leader', async t => {
  t.plan(1);

  const servers = await createTestServers(1);
  const leader = await waitUntil(() => {
    return servers[0]?.raft?.leader;
  });

  t.ok(leader, 'leader was elected');

  await servers.close();
});

test('raft - two nodes elect a leader', async t => {
  t.plan(1);

  const servers = await createTestServers(2);
  const leader = await waitUntil(() => {
    return servers[0]?.raft?.leader;
  });

  t.ok(leader, 'leader was elected');

  await servers.close();
});

test('raft - lock syncs raft state to all nodes', async t => {
  t.plan(2);
  t.timeout(5000);

  const servers = await createTestServers(2);

  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();
  await servers.waitForInitialLocks();

  await client.send(c.LOCK, {
    [c.LOCK_KEY]: 'tests'
  });

  await t.waitFor(async () => {
    t.deepEqual(servers[0].raft.state.locks?.queue?.length, 1);
    t.deepEqual(servers[1].raft.state.locks?.queue?.length, 1);
  });

  await client.close();
  await servers.close();
});
