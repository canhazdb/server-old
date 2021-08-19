import test from 'basictap';
import { v4 as uuid } from 'uuid';
import { getNewPort, tls } from '../helpers/createTestServers.js';

import c from '../../lib/constants.js';
import tcpocket from 'tcpocket';
import canhazdb from '../../lib/index.js';

test('health - info system route works as intended', async t => {
  t.plan(4);

  const port = getNewPort();
  const nodeName = uuid();

  const server = await canhazdb({
    dataDirectory: './canhazdata/' + nodeName,
    nodeName: nodeName,
    host: 'localhost',
    port: port,
    join: ['localhost:10001'],
    tls
  });

  const client = tcpocket.createClient(server.clientConfig);
  await client.waitUntilConnected();

  const result = await client.send(c.INFO, {
    [c.SYSTEM]: true
  });

  const resultData = result.json()[c.DATA];

  t.equal(server.thisNode.status, 'unhealthy', 'server had unhealthy status');

  t.equal(result.command, c.STATUS_OK, 'response had 200 status');
  t.equal(resultData.nodeName.length, 36, 'nodeName has correct length');
  t.equal(resultData.nodes.length, 2, 'two nodes where returned');

  await Promise.all([
    client.close(),
    server.close()
  ]);
});

test('health - unhealthy nodes reject external routes', async t => {
  t.plan(2);

  const port = getNewPort();
  const nodeName = uuid();

  const server = await canhazdb({
    dataDirectory: './canhazdata/' + nodeName,
    nodeName: nodeName,
    host: 'localhost',
    port: port,
    join: ['localhost:10001'],
    tls
  });

  const client = tcpocket.createClient(server.clientConfig);
  await client.waitUntilConnected();

  const result = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'test'
  });

  t.equal(result.command, c.STATUS_SERVER_UNHEALTHY, 'response had offline status');
  t.equal(result.data, undefined);

  await Promise.all([
    client.close(),
    server.close()
  ]);
});
