const packageJson = require('../package.json');

const path = require('path');
const tcpocket = require('tcpocket');

const handleExternal = require('./handleExternal');
const createInternalServer = require('./createInternalServer');

const { flushCache } = require('./utils/cachableSqlite');

const { INFO, DATA } = require('./constants');

async function canhazdb (options) {
  const log = (options.logger || console.log);

  options.dataDirectory = options.dataDirectory || path.resolve(process.cwd(), './canhazdata');
  options.port = parseInt(options.port);

  const state = {
    options,

    nodes: [],

    data: {}
  };

  async function makeConnection (host, port, tls, node) {
    if (!state.opened) {
      return;
    }

    if (node.connection) {
      console.log('Aborting connection to ', host, port, 'as already connected');
      return;
    }

    node.status = 'unhealthy';

    node.reconnect = () => {
      clearTimeout(node.reconnectionTimer);

      node.reconnectionTimer = setTimeout(() => {
        delete node.reconnectionTimer;
        makeConnection(host, port, tls, node);
      }, 1000);
    };

    function handleError (error) {
      if (['CLOSED', 'ECONNREFUSED', 'ECONNRESET'].includes(error.code)) {
        node.status = 'unhealthy';
        delete node.connection;
        node.reconnect();
        return;
      }

      throw error;
    }

    try {
      const client = await tcpocket.createClient({ host, port, tls });
      node.status = 'healthy';

      client.on('close', () => {
        handleError(Object.assign(new Error('client closed'), { code: 'CLOSED' }));
      });

      client.on('error', handleError);

      node.connection = client;

      return client;
    } catch (error) {
      handleError(error);
    }
  }

  const internalServer = await createInternalServer(state, options.port, options.tls);

  await makeConnection(options.host, options.port, options.tls, state.nodes[0]);

  let server;

  if (options.tls) {
    server = require('https').createServer(options.tls, handleExternal.bind(null, state));
  } else {
    server = require('http').createServer(handleExternal.bind(null, state));
  }

  async function join ({ host, port }, alreadyRecursed) {
    port = parseInt(port);

    if (state.nodes.find(node => node.host === host && node.port === port)) {
      return;
    }

    log(`  joining ${host}:${port}`);

    const newNode = {
      host,
      port
    };

    state.nodes.push(newNode);

    await makeConnection(host, port, options.tls, newNode);

    newNode.info = await newNode.connection.ask(INFO, {
      nodes: state.nodes.map(node => ({ host: node.host, port: node.port }))
    });

    if (!alreadyRecursed) {
      const otherJoins = newNode.info[DATA].nodes.map(node => {
        return join({ ...node }, true);
      });

      await Promise.all(otherJoins);
    }
  }

  state.join = join;

  const serverReturn = {
    url: `${options.tls ? 'https' : 'http'}://` + options.host + ':' + options.queryPort,
    host: options.host,
    port: options.port,
    queryPort: options.queryPort,

    state,

    join,

    open: () => {
      const openPromise = new Promise((resolve) => {
        server.on('listening', async () => {
          state.opened = true;

          state.nodes.forEach(node => node.reconnect());

          resolve(serverReturn);
        });
      });
      internalServer.server.close();
      internalServer.server.listen(options.port);
      server.listen(options.queryPort);

      return openPromise;
    },

    close: () => {
      state.opened = false;

      state.nodes.forEach(node => {
        node.connection && node.connection.close();
        delete node.connection;
      });
      server.close();
      internalServer.close();
      flushCache();
    }
  };

  await serverReturn.open();

  const newNode = {
    host: options.host,
    port: options.port,
    info: {
      version: packageJson.version
    }
  };
  state.nodes.push(newNode);
  await makeConnection(newNode.host, newNode.port, options.tls, newNode);

  return serverReturn;
}

module.exports = canhazdb;
