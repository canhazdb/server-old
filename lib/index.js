import logslot from 'logslot';
import lockbase from 'lockbase';
import EventEmitter from 'events';

import prepareOptions from './prepareOptions.js';
import createHandler from './createHandler.js';
import driver from './driver/index.js';
import waitUntil from './utils/waitUntil.js';
import join from './utils/join.js';

import notifyModule from './modules/notify/index.js';

import c from './constants.js';

const log = logslot('canhazdb.server');

async function persistNode (context, node) {
  const existingRecords = await context.driver.get('system.nodes', {
    name: node.name
  });

  if (existingRecords.length === 0) {
    await context.driver.post('system.nodes', {
      name: node.name,
      host: node.host,
      port: node.port
    });
  }

  node.persisted = true;
}

async function canhazdb (rawOptions) {
  const options = await prepareOptions(rawOptions);
  log.debug('parsed options', options);

  const context = Object.assign(
    new EventEmitter(),
    {
      closed: false,
      clients: [],
      settings: {
        replicas: 3
      },
      info: {
        generators: []
      },
      nodes: [],
      join,
      options
    }
  );

  notifyModule(context);

  context.driver = await driver(context);

  context.locks = lockbase();

  const tcpServer = createHandler(context);
  tcpServer.open();

  context.options.join.forEach(item => {
    const [host, port] = item.split(':');
    join(context, host, port);
  });

  const persistedNodes = await context.driver.get('system.nodes');
  persistedNodes.forEach(node => {
    join(context, node.host, node.port);
  });

  async function syncNodesInfo () {
    if (context.closed) {
      return;
    }

    await Promise.all(
      context.nodes.map(async node => {
        const result = await node.client.send(c.INFO, {
          [c.DATA]: {
            nodes: context.nodes.map(node => ({
              host: node.host,
              port: node.port
            }))
          },
          [c.INTERNAL]: true
        }).catch(error => {
          log.warn('syncNodesInfo: client disconnected', { error: error.code });
          return null;
        });

        if (!result || result.command !== c.STATUS_OK) {
          return;
        }

        const resultData = result.json();

        context.emit('node.infoReceived', resultData[c.DATA]);

        node.info = resultData;
        node.name = resultData[c.DATA].nodeName;

        persistNode(context, node);
      })
    );

    context.syncNodesInfoTimer = setTimeout(syncNodesInfo, 250);
  }
  syncNodesInfo();

  await waitUntil(() => {
    const nodesWithName = context.nodes.filter(node => node.persisted);
    return context.nodes.length === nodesWithName.length;
  });

  context.close = async function () {
    context.closed = true;

    context.locks.cancel();
    clearTimeout(context.syncNodesInfoTimer);

    await Promise.all(context.nodes.map(node => {
      return node.close();
    }));

    await context.driver.close();
    await new Promise(resolve => tcpServer.close(resolve));
  };

  context.clientConfig = {
    host: context.options.host,
    port: context.options.port,
    ...context.options.tls
  };

  context.thisNode = context.nodes.find(node => node.name === context.options.nodeName);

  return context;
}

export default canhazdb;
