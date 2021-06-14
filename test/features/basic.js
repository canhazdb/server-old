import test from 'basictap';
import createTestServer from '../helpers/createTestServer.js';

import c from '../../lib/constants.js';
import tcpocket from 'tcpocket';

function createExampleDocuments (client, count) {
  const counts = Array(count).fill('').map((_, index) => index);

  return Promise.all(
    counts.map(count => {
      return client.send({
        [c.COMMAND]: c.POST,
        [c.COLLECTION_ID]: 'tests',
        [c.DATA]: {
          foo: 'bar' + (count + 1)
        }
      });
    })
  );
}

test('invalid data', async t => {
  t.plan(1);

  const servers = await createTestServer(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 1);

  const getResponse = await client.send('');

  t.equal(getResponse[c.STATUS], 400, 'has status');

  await client.close();
  await servers.close();
});

test('invalid command', async t => {
  t.plan(1);

  const servers = await createTestServer(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 1);

  const getResponse = await client.send({
    [c.COMMAND]: -1
  });

  t.equal(getResponse[c.STATUS], 404, 'has status');

  await client.close();
  await servers.close();
});

test('info', async t => {
  t.plan(5);

  const servers = await createTestServer(1);
  const client = tcpocket.createClient(servers[0].clientConfig);

  await client.waitUntilConnected();
  const result = await client.send({
    [c.COMMAND]: c.INFO,
    [c.INTERNAL]: true
  });

  t.equal(result[c.STATUS], 200, 'response had 200 status');
  t.equal(result[c.DATA].nodeName.length, 36, 'nodeName has correct length');
  t.equal(result[c.DATA].nodes.length, 1, 'one node was returned');
  t.equal(result[c.DATA].nodes[0].host, servers[0].options.host, 'first node had correct host');
  t.equal(result[c.DATA].nodes[0].port, servers[0].options.port, 'first node had correct port');

  await Promise.all([
    client.close(),
    servers.close()
  ]);
});

test('post', async t => {
  t.plan(11);

  const servers = await createTestServer(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const postResponses = await createExampleDocuments(client, 3);

  t.equal(postResponses[0][c.STATUS], 201, 'has status');
  t.ok(postResponses[0][c.DATA].id, 'has id');
  t.equal(postResponses[0][c.DATA].foo, 'bar1', 'has foo property');

  const getResponse = await client.send({
    [c.COMMAND]: c.GET,
    [c.COLLECTION_ID]: 'tests'
  });

  t.equal(getResponse[c.STATUS], 200, 'has status');
  t.equal(getResponse[c.DATA].length, 3, 'returned 1 document');

  const sortedDocuments = getResponse[c.DATA]
    .sort((a, b) => a.foo > b.foo ? 1 : -1);

  t.ok(sortedDocuments[0].id, 'has id property');
  t.equal(sortedDocuments[0].foo, 'bar1', 'has foo property');
  t.ok(sortedDocuments[1].id, 'has id property');
  t.equal(sortedDocuments[1].foo, 'bar2', 'has foo property');
  t.ok(sortedDocuments[2].id, 'has id property');
  t.equal(sortedDocuments[2].foo, 'bar3', 'has foo property');

  await client.close();
  await servers.close();
});

test('get - with order (ascending)', async t => {
  t.plan(5);

  const servers = await createTestServer(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 3);

  const getResponse = await client.send({
    [c.COMMAND]: c.GET,
    [c.COLLECTION_ID]: 'tests',
    [c.ORDER]: ['asc(foo)']
  });

  t.equal(getResponse[c.STATUS], 200, 'has status');
  t.equal(getResponse[c.DATA].length, 3, 'returned 1 document');

  t.equal(getResponse[c.DATA][0].foo, 'bar1', 'has foo property');
  t.equal(getResponse[c.DATA][1].foo, 'bar2', 'has foo property');
  t.equal(getResponse[c.DATA][2].foo, 'bar3', 'has foo property');

  await client.close();
  await servers.close();
});

test('get - with order (descending)', async t => {
  t.plan(5);

  const servers = await createTestServer(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 3);

  const getResponse = await client.send({
    [c.COMMAND]: c.GET,
    [c.COLLECTION_ID]: 'tests',
    [c.ORDER]: ['desc(foo)']
  });

  t.equal(getResponse[c.STATUS], 200, 'has status');
  t.equal(getResponse[c.DATA].length, 3, 'returned 1 document');

  t.equal(getResponse[c.DATA][0].foo, 'bar3', 'has foo property');
  t.equal(getResponse[c.DATA][1].foo, 'bar2', 'has foo property');
  t.equal(getResponse[c.DATA][2].foo, 'bar1', 'has foo property');

  await client.close();
  await servers.close();
});

test('get - with limit', async t => {
  t.plan(2);

  const servers = await createTestServer(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 5);

  const getResponse = await client.send({
    [c.COMMAND]: c.GET,
    [c.COLLECTION_ID]: 'tests',
    [c.LIMIT]: 3
  });

  t.equal(getResponse[c.STATUS], 200, 'has status');
  t.equal(getResponse[c.DATA].length, 3, 'returned 1 document');

  await client.close();
  await servers.close();
});
