import test from 'basictap';
import createTestServer from './helpers/createTestServer.js';

import c from '../lib/constants.js';
import tcpocket from 'tcpocket';

// wtfnode.init();

test('info - single server', async t => {
  t.plan(5);

  const servers = await createTestServer(1);
  const client = tcpocket.createClient(servers[0].clientConfig);

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

test('info - multiple servers', async t => {
  t.plan(5);

  const servers = await createTestServer(5);
  const client = tcpocket.createClient(servers[0].clientConfig);

  const result = await client.send({
    [c.COMMAND]: c.INFO,
    [c.INTERNAL]: true
  });

  t.equal(result[c.STATUS], 200, 'response had 200 status');
  t.equal(result[c.DATA].nodeName.length, 36, 'nodeName has correct length');
  t.equal(result[c.DATA].nodes.length, 5, 'five nodes were returned');
  t.equal(result[c.DATA].nodes[0].host, servers[0].options.host, 'first node had correct host');
  t.equal(result[c.DATA].nodes[0].port, servers[0].options.port, 'first node had correct port');

  await Promise.all([
    client.close(),
    servers.close()
  ]);
});

test('post - single server', async t => {
  t.plan(11);

  const servers = await createTestServer(1);
  const client = tcpocket.createClient(servers[0].clientConfig);

  const postResponses = await Promise.all([
    client.send({
      [c.COMMAND]: c.POST,
      [c.COLLECTION_ID]: 'tests',
      [c.DATA]: {
        foo: 'bar1'
      }
    }),

    client.send({
      [c.COMMAND]: c.POST,
      [c.COLLECTION_ID]: 'tests',
      [c.DATA]: {
        foo: 'bar2'
      }
    }),

    client.send({
      [c.COMMAND]: c.POST,
      [c.COLLECTION_ID]: 'tests',
      [c.DATA]: {
        foo: 'bar3'
      }
    })
  ]);

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
