import test from 'basictap';
import createTestServers from '../helpers/createTestServers.js';

import c from '../../lib/constants.js';
import tcpocket from 'tcpocket';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function createExampleDocuments (client, count, extraData) {
  const counts = Array(count).fill('').map((_, index) => index);

  return Promise.all(
    counts.map(count => {
      return client.send(c.POST, {
        [c.COLLECTION_ID]: 'tests',
        [c.DATA]: {
          ...extraData,
          foo: 'bar' + (count + 1)
        }
      });
    })
  );
}

test.todo('notify - with multiple servers');

test('notify', async t => {
  t.plan(4);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  client.on('message', ({ command, data }) => {
    t.equal(command, c.NOTIFY);
    t.ok(data.toString().startsWith('{"' + c.DATA + '":"POST:/tests/'));
  });

  const notifyResponse = await client.send(c.NOTIFY_ON, {
    [c.NOTIFY_PATH]: '.*:/tests/.*'
  });

  await client.send(c.POST, {
    [c.COLLECTION_ID]: 'notests',
    [c.DATA]: {
      baz: 'baz'
    }
  });

  const postResponse = await client.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.DATA]: {
      foo: 'bar'
    }
  });

  t.equal(postResponse.command, c.STATUS_CREATED, 'postResponse has STATUS_CREATED');

  await sleep(200);

  await client.send(c.NOTIFY_OFF, {
    [c.NOTIFY_PATH]: '.*:/tests/.*'
  });

  await client.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.DATA]: {
      foo: 'bar'
    }
  });

  t.equal(notifyResponse.command, c.STATUS_OK, 'has status');

  setTimeout(async () => {
    await client.close();
    await servers.close();
    t.pass('instance closed successfully');
  }, 200);
});

test('notify - post', async t => {
  t.plan(3);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  client.on('message', ({ command, data }) => {
    t.equal(command, c.NOTIFY);
    t.ok(data.toString().startsWith('{"' + c.DATA + '":"POST:/tests/'));
  });

  const notifyResponse = await client.send(c.NOTIFY_ON, {
    [c.NOTIFY_PATH]: 'POST:/tests/.*'
  });

  await client.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.DATA]: {
      food: 'bar'
    }
  });

  t.equal(notifyResponse.command, c.STATUS_OK, 'has status');

  await sleep(100);

  await client.close();
  await servers.close();
});

test('notify - put', async t => {
  t.plan(3);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const documents = await createExampleDocuments(client, 3);
  const documentId = documents[0].json()[c.DATA].id;

  client.on('message', ({ command, data }) => {
    t.equal(command, c.NOTIFY);
    t.ok(data.toString().startsWith('{"' + c.DATA + '":"PUT:/tests/' + documentId));
  });

  const notifyResponse = await client.send(c.NOTIFY_ON, {
    [c.NOTIFY_PATH]: 'PUT:/tests/.*'
  });

  await client.send(c.PUT, {
    [c.COLLECTION_ID]: 'tests',
    [c.QUERY]: {
      foo: 'bar1'
    },
    [c.DATA]: {
      foo: 'baz'
    }
  });

  t.equal(notifyResponse.command, c.STATUS_OK, 'has status');

  await sleep(100);

  await client.close();
  await servers.close();
});

test('notify - patch', async t => {
  t.plan(3);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const documents = await createExampleDocuments(client, 3);
  const documentId = documents[0].json()[c.DATA].id;

  client.on('message', ({ command, data }) => {
    t.equal(command, c.NOTIFY);
    t.ok(data.toString().startsWith('{"' + c.DATA + '":"PATCH:/tests/' + documentId));
  });

  const notifyResponse = await client.send(c.NOTIFY_ON, {
    [c.NOTIFY_PATH]: 'PATCH:/tests/.*'
  });

  await client.send(c.PATCH, {
    [c.COLLECTION_ID]: 'tests',
    [c.QUERY]: {
      foo: 'bar1'
    },
    [c.DATA]: {
      foo: 'baz'
    }
  });

  t.equal(notifyResponse.command, c.STATUS_OK, 'has status');

  await sleep(100);

  await client.close();
  await servers.close();
});

test('notify - delete', async t => {
  t.plan(3);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const documents = await createExampleDocuments(client, 3);
  const documentId = documents[0].json()[c.DATA].id;

  client.on('message', ({ command, data }) => {
    t.equal(command, c.NOTIFY);
    t.ok(data.toString().startsWith('{"' + c.DATA + '":"DELETE:/tests/' + documentId));
  });

  const notifyResponse = await client.send(c.NOTIFY_ON, {
    [c.NOTIFY_PATH]: 'DELETE:/tests/.*'
  });

  await client.send(c.DELETE, {
    [c.COLLECTION_ID]: 'tests',
    [c.QUERY]: {
      foo: 'bar1'
    }
  });

  t.equal(notifyResponse.command, c.STATUS_OK, 'has status');

  await sleep(100);

  await client.close();
  await servers.close();
});

test('notify - client disconnections clean up', async t => {
  t.plan(1);

  const servers = await createTestServers(2);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await client.send(c.NOTIFY_ON, {
    [c.NOTIFY_PATH]: '.*:/tests/.*'
  });

  client.close();

  await sleep(100);

  t.equal(servers[0].notify.internalNotifiers.length, 0, 'internal notifier was removed');

  await servers.close();
});

test('notify - reconnections', async t => {
  t.plan(3);

  let [server1, server2, server3] = await createTestServers(3);
  const [client1] = [
    tcpocket.createClient(server1.clientConfig)
  ];
  await client1.waitUntilConnected();

  client1.on('message', ({ command, data }) => {
    t.equal(command, c.NOTIFY);
    t.ok(data.toString().startsWith('{"' + c.DATA + '":"POST:/tests/'));
  });

  await client1.send(c.NOTIFY_ON, {
    [c.NOTIFY_PATH]: '.*:/tests/.*'
  });

  server2.close();
  await sleep(100);
  server2 = await server2.recreate();
  await sleep(100);

  const client2 = tcpocket.createClient(server2.clientConfig);
  await client2.waitUntilConnected();

  const postResponse = await client2.send(c.POST, {
    [c.COLLECTION_ID]: 'tests',
    [c.DATA]: {
      foo: 'bar'
    }
  });

  t.equal(postResponse.command, c.STATUS_CREATED);

  await sleep(200);

  await Promise.all([
    client1.close(),
    client2.close(),
    server1.close(),
    server2.close(),
    server3.close()
  ]);
});
