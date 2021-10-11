import tcpocket from 'tcpocket';
import createTestServers from '../../helpers/createTestServers.js';
import createExampleDocuments from '../../helpers/createExampleDocuments.js';

async function prepareTest () {
  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();
  const domain = `${servers[0].options.httpHost}:${servers[0].options.httpPort}`;

  const exampleDocuments = await createExampleDocuments(client, 3);

  return { client, servers, domain, exampleDocuments };
}

export default prepareTest;
