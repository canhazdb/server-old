const path = require('path');
const fs = require('fs');
const os = require('os');
const dns = require('dns').promises;

const chalk = require('chalk');
const tcpocket = require('tcpocket');
const enableDestroy = require('server-destroy');
const getPort = require('get-port');

const httpHandler = require('./httpHandler');
const tcpHandler = require('./tcpHandler');
const wsHandler = require('./wsHandler');

const { COMMAND, INFO, DATA } = require('./constants');

async function prepareOptions (rawOptions) {
  const options = {
    ...rawOptions,
    log: (rawOptions.logger || console.log),
    join: rawOptions.join || [],
    single: rawOptions.single
  };

  options.port = options.port ? parseInt(options.port) : await getPort();
  options.queryPort = options.queryPort ? parseInt(options.queryPort) : await getPort();

  if (rawOptions.joinFromDns) {
    const dnsLookupResults = await dns.lookup(rawOptions.joinFromDns, { all: true });
    options.join = dnsLookupResults.map(item => `${item.address}:${options.port}`);
  }

  if (options.join.length > 0 && options.single) {
    throw new Error('Can not start canhazdb in both single mode and attempt to join other nodes.');
  }

  if (!options.join || options.join.length === 0) {
    if (options.single) {
      options.join = [`${rawOptions.host}:${options.port}`];
    } else {
      throw new Error('You must start canhazdb in --single mode or join it to another node and itself');
    }
  }

  if (rawOptions.tlsCa || rawOptions.tlsCert || rawOptions.tlsKey) {
    if (!rawOptions.tlsCa || !rawOptions.tlsCert || !rawOptions.tlsKey) {
      console.log(chalk.red('You must specifiy either all [tls-key, tls-cert, tls-ca] or none of them'));
      return;
    }

    options.tls = {
      key: fs.readFileSync(rawOptions.tlsKey),
      cert: fs.readFileSync(rawOptions.tlsCert),
      ca: [fs.readFileSync(rawOptions.tlsCa)],
      requestCert: true
    };
  }

  options.driver = process.env.CANHAZDB_DRIVER || rawOptions.driver || 'canhazdb-driver-ejdb';
  options.nodeName = options.nodeName || process.env.CANHAZDB_NODE_NAME || os.hostname();
  options.dataDirectory = rawOptions.dataDirectory
    ? path.resolve(rawOptions.dataDirectory, options.nodeName)
    : path.resolve(process.cwd(), './canhazdata', options.nodeName);

  return options;
}

async function makeConnection (scope, host, port, tls, node) {
  if (scope.closed) {
    return;
  }

  if (node.connection) {
    // console.log('Aborting connection to ', host, port, 'as already connected');
    return;
  }

  node.status = 'unhealthy';

  node.reconnect = () => {
    if (scope.closed) {
      return;
    }

    clearTimeout(node.reconnectionTimer);

    node.reconnectionTimer = setTimeout(() => {
      delete node.reconnectionTimer;
      makeConnection(scope, host, port, tls, node);
    }, 1000);
  };

  function handleError (error) {
    if (['CLOSED', 'ECONNREFUSED', 'EHOSTUNREACH', 'ECONNRESET'].includes(error.code)) {
      node.status = 'unhealthy';
      delete node.connection;
      node.reconnect();
      return;
    }

    throw error;
  }

  try {
    const servername = scope.options.joinFromDns;

    const client = await tcpocket.createClient({ host, port, servername, ...tls });
    scope.clients.push(client);
    node.status = 'healthy';

    client.on('message', data => {
      scope.handleMessage && scope.handleMessage(data);
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

async function join (scope, { host, port }, alreadyRecursed) {
  port = parseInt(port);

  if (scope.nodes.find(node => node.host === host && node.port === port)) {
    return;
  }

  if (!scope.options.single) {
    scope.log(`  joining ${host}:${port}`);
  }

  const newNode = {
    host,
    port
  };
  scope.nodes.push(newNode);

  await makeConnection(scope, host, port, scope.options.tls, newNode);

  try {
    newNode.info = await newNode.connection.send({
      [COMMAND]: INFO,
      [DATA]: {
        nodes: scope.nodes.map(node => ({ host: node.host, port: node.port }))
      }
    });

    if (!alreadyRecursed) {
      const otherJoins = newNode.info[DATA].nodes.map(node => {
        return join(scope, { ...node }, true);
      });

      await Promise.all(otherJoins);
    }
  } catch (error) {
    console.log('could not connect to new node', newNode.host, newNode.port);
    console.log('  ', error.message);
  }
}

async function canhazdb (rawOptions) {
  const options = await prepareOptions(rawOptions);

  const scope = {
    options,
    log: options.log,

    url: `${options.tls ? 'https' : 'http'}://` + options.host + ':' + options.queryPort,
    wsUrl: `${options.tls ? 'wss' : 'ws'}://` + options.host + ':' + options.queryPort,

    host: options.host,
    port: options.port,
    queryPort: options.queryPort,

    clients: [],
    nodes: [],

    data: {}
  };

  scope.driver = require(options.driver)(scope);

  const tcpServer = tcpHandler(scope, options.port, options.tls);
  tcpServer.open();

  let server;
  if (options.tls) {
    server = require('https').createServer(options.tls, httpHandler.bind(null, scope));
  } else {
    server = require('http').createServer(httpHandler.bind(null, scope));
  }
  enableDestroy(server);

  const wss = wsHandler(server, scope, options);

  options.join.forEach(async item => {
    const [host, port] = item.split(':');
    await join(scope, { host, port });
  });

  scope.join = join.bind(null, scope);

  const serverReturn = {
    ...scope,

    open: async () => {
      delete scope.closed;
      const openPromise = new Promise((resolve) => {
        server.once('listening', async () => {
          scope.nodes.forEach(node => node.reconnect());

          resolve(serverReturn);
        });
      });
      tcpServer.close();
      tcpServer.open();
      scope.driver.open && scope.driver.open();
      server.listen(options.queryPort);

      return openPromise;
    },

    close: async () => {
      scope.closed = true;

      scope.locks.cancel();

      await Promise.all(scope.clients.map(node => {
        return node.close();
      }));

      server.destroy();
      wss.close();
      tcpServer.close();
      scope.driver.close();
    }
  };

  await serverReturn.open();

  return serverReturn;
}

module.exports = canhazdb;
