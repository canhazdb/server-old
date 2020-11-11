const packageJson = require('../package.json');

const path = require('path');
const tcpocket = require('tcpocket');

const httpHandler = require('./httpHandler');
const tcpHandler = require('./tcpHandler');
const wsHandler = require('./wsHandler');

const { COMMAND, INFO, DATA } = require('./constants');

async function canhazdb (options) {
  const log = (options.logger || console.log);

  options.driver = options.driver || 'sqlite';
  options.dataDirectory = options.dataDirectory || path.resolve(process.cwd(), './canhazdata');
  options.port = parseInt(options.port);

  const state = {
    options,

    clients: [],
    nodes: [],

    data: {}
  };

  state.driver = require('./drivers/' + options.driver)(state);

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
      if (!state.opened) {
        return;
      }

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
      state.clients.push(client);
      node.status = 'healthy';

      client.on('message', data => {
        state.handleMessage && state.handleMessage(data);
      });

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

  const tcpServer = tcpHandler(state, options.port, options.tls);
  tcpServer.open();

  await makeConnection(options.host, options.port, options.tls, state.nodes[0]);

  let server;

  if (options.tls) {
    server = require('https').createServer(options.tls, httpHandler.bind(null, state));
  } else {
    server = require('http').createServer(httpHandler.bind(null, state));
  }

  const wss = wsHandler(server, state, options);

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

    newNode.info = await newNode.connection.send({
      [COMMAND]: INFO,
      [DATA]: {
        nodes: state.nodes.map(node => ({ host: node.host, port: node.port }))
      }
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
    wsUrl: `${options.tls ? 'wss' : 'ws'}://` + options.host + ':' + options.queryPort,

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
      tcpServer.close();
      tcpServer.open();
      server.listen(options.queryPort);

      return openPromise;
    },

    close: async () => {
      state.opened = false;

      await Promise.all(state.clients.map(node => {
        return node.close();
      }));

      server.close();
      wss.close();
      tcpServer.close();
      state.driver.close();
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
