import test from 'basictap';
import createTestServer from './helpers/createTestServer.js';

import c from '../lib/constants.js';
import tcpocket from 'tcpocket';

test('cluster - post', async t => {
  t.plan(11);

  const servers = await createTestServer(5);

  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

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

test('cluster - post - two goes down', async t => {
  t.plan(11);

  const servers = await createTestServer(3);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

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

  await Promise.all([
    servers[1].close(),
    servers[2].close()
  ]);

  const getResponse = await client.send({
    [c.COMMAND]: c.GET,
    [c.COLLECTION_ID]: 'tests'
  });

  t.equal(getResponse[c.STATUS], 200, 'has status');
  t.equal(getResponse[c.DATA].length, 3, 'returned 1 document');

  const sortedDocuments = getResponse[c.DATA]
    .sort((a, b) => a.foo > b.foo ? 1 : -1);

  t.ok(sortedDocuments[0].id, 'has id property');
  t.equal(sortedDocuments[0].foo, 'bar1', 'has foo=bar1 property');
  t.ok(sortedDocuments[1].id, 'has id property');
  t.equal(sortedDocuments[1].foo, 'bar2', 'has foo=bar2 property');
  t.ok(sortedDocuments[2].id, 'has id property');
  t.equal(sortedDocuments[2].foo, 'bar3', 'has foo=bar3 property');

  await client.close();
  await servers.close();
});
