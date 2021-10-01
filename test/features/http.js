import test from 'basictap';
import tcpocket from 'tcpocket';
import createTestServers from '../helpers/createTestServers.js';
import httpRequest from '../helpers/httpRequest.js';
import createExampleDocuments from '../helpers/createExampleDocuments.js';
import c from '../../lib/constants.js';

test('http - get collection', async t => {
  t.plan(3);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();
  const domain = `${servers[0].options.httpHost}:${servers[0].options.httpPort}`;

  await createExampleDocuments(client, 3);

  const request = await httpRequest(`https://${domain}/api/tests`);
  const documents = request.data.sort((a, b) => {
    return a.foo > b.foo ? 1 : -1;
  });

  t.equal(request.status, 200);
  t.equal(documents.length, 3);
  t.equal(documents[0].foo, 'bar1');

  await client.close();
  await servers.close();
});

test('http - get document', async t => {
  t.plan(3);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();
  const domain = `${servers[0].options.httpHost}:${servers[0].options.httpPort}`;

  const createResults = await createExampleDocuments(client, 1);
  const document = createResults[0].json()[c.DATA];

  const request = await httpRequest(`https://${domain}/api/tests/${document.id}`);

  t.equal(request.status, 200);
  t.ok(request.data.id, 'has an id');
  t.equal(request.data.foo, 'bar1');

  await client.close();
  await servers.close();
});
