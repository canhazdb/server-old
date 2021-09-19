import logslot from 'logslot';
import lockbase from 'lockbase';
import EventEmitter from 'events';

import prepareOptions from './prepareOptions.js';
import createHandler from './createHandler.js';
import driver from './driver/index.js';
import join from './utils/join.js';
import waitUntil from './utils/waitUntil.js';

import notifyModule from './modules/notify/index.js';
import controllersModule from './modules/controllers/index.js';
import collectionsModule from './modules/collections/index.js';
import conflictsModule from './modules/conflicts/index.js';
import lockModule from './modules/lock/index.js';

import c from './constants.js';

const log = logslot('canhazdb.server');

async function persistNode (context, node) {
  if (context.closed) {
    return;
  }

  const existingRecords = await context.driver.get('system.nodes', {
    name: node.name
  });

  if (existingRecords.length === 0) {
    process.context = context;
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
        syncInterval: 250,
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

  const activeModules = [
    controllersModule(context),
    notifyModule(context),
    collectionsModule(context),
    conflictsModule(context),
    lockModule(context)
  ];

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
        if (!node.client) {
          return;
        }
        const result = await node.client.send(c.INFO, {
          [c.DATA]: {
            nodes: context.nodes.map(node => ({
              host: node.host,
              port: node.port
            }))
          },
          [c.SYSTEM]: true
        }).catch(error => {
          log.warn('syncNodesInfo: client disconnected', { error: error.code });
          return null;
        });

        if (!result || result.command !== c.STATUS_OK) {
          return;
        }

        const resultData = result.json();

        node.info = resultData[c.DATA];
        node.name = resultData[c.DATA].nodeName;
        node.status = resultData[c.DATA].status;

        if (node.name) {
          node.online = true;
        }

        persistNode(context, node);

        context.thisNode = context.nodes.find(node => node.name === context.options.nodeName);
        context.emit('node.infoReceived', node);
      })
    );

    context.syncNodesInfoTimer = setTimeout(syncNodesInfo, context.settings.syncInterval);
  }
  syncNodesInfo();

  context.sendToAllNodes = (context, command, data) => {
    if (!context.nodes) {
      return [];
    }

    return Promise.all(
      context.nodes
        .map(node => {
          if (!node.connected) {
            return {
              command: c.STATUS_SERVER_ERROR,
              error: new Error('client not connected'),
              node
            };
          }

          return node.client.send(command, data)
            .then(result => {
              return {
                ...result,
                node
              };
            })
            .catch(error => {
              log.warn(error);
              return {
                command: c.STATUS_SERVER_ERROR,
                node
              };
            });
        })
    );
  };

  context.close = async function () {
    context.closed = true;

    context.locks.cancel(
      Object.assign(new Error('server was closed'), { status: c.STATUS_SERVER_CLOSED })
    );

    await waitUntil(() => {
      const activeRequests = context.clients.reduce((total, client) => {
        return total + client.activeRequests;
      }, 0);

      return activeRequests === 0;
    });

    await new Promise(resolve => tcpServer.close(resolve));

    clearTimeout(context.syncNodesInfoTimer);

    await Promise.all(context.nodes.map(node => {
      return node.close();
    }));

    await Promise.all(
      activeModules.filter(item => !!item).map(item => item.cleanup && item.cleanup())
    );

    await context.driver.close();
  };

  context.clientConfig = {
    host: context.options.host,
    port: context.options.port,
    ...context.options.tls
  };

  return context;
}

export default canhazdb;
