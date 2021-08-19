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

test('systemCollections - post increments documentCount', async t => {
  t.plan(6);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const postResponses = await createExampleDocuments(client, 3);

  t.equal(postResponses[0].command, c.STATUS_CREATED, 'has correct status');

  await sleep(250);

  const getResponse = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'system.collections',
    [c.QUERY]: { collectionId: 'tests' }
  });

  const documents = getResponse.json()[c.DATA];

  t.equal(getResponse.command, c.STATUS_OK, 'has status');
  t.equal(documents.length, 1, 'returned 1 document');
  t.ok(documents[0].id, 'had id');
  t.equal(documents[0].collectionId, 'tests', 'collectionId is tests');
  t.equal(documents[0].documentCount, 3, 'documentCount is 3');

  await client.close();
  await servers.close();
});

test('systemCollections - post batch increments documentCount', async t => {
  t.plan(10);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  // First batch
  {
    await createExampleDocuments(client, 3);
    await sleep(250);

    const getResponse = await client.send(c.GET, {
      [c.COLLECTION_ID]: 'system.collections',
      [c.QUERY]: { collectionId: 'tests' }
    });

    const documents = getResponse.json()[c.DATA];

    t.equal(getResponse.command, c.STATUS_OK, 'has status');
    t.equal(documents.length, 1, 'returned 1 document');
    t.ok(documents[0].id, 'had id');
    t.equal(documents[0].collectionId, 'tests', 'collectionId is tests');
    t.equal(documents[0].documentCount, 3, 'documentCount is 3');
  }

  // Second batch
  {
    await createExampleDocuments(client, 3);
    await sleep(250);

    const getResponse = await client.send(c.GET, {
      [c.COLLECTION_ID]: 'system.collections',
      [c.QUERY]: { collectionId: 'tests' }
    });

    const documents = getResponse.json()[c.DATA];

    t.equal(getResponse.command, c.STATUS_OK, 'has status');
    t.equal(documents.length, 1, 'returned 1 document');
    t.ok(documents[0].id, 'had id');
    t.equal(documents[0].collectionId, 'tests', 'collectionId is tests');
    t.equal(documents[0].documentCount, 6, 'documentCount is 6');
  }

  await client.close();
  await servers.close();
});
