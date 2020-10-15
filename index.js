const packageJson = require('./package.json');

const tcpocket = require('tcpocket');

const handleExternal = require('./handleExternal');
const createInternalServer = require('./createInternalServer');

const { INFO } = require('./constants');

async function makeConnection (host, port, tls) {
  const client = await tcpocket.createClient({ host, port, tls });
  client.on('testResp', (data, sender) => {
    console.log(data);
  });
  return client;
}

async function canhazdb (options) {
  const state = {
    nodes: [{
      host: options.host,
      port: options.port,
      info: {
        version: packageJson.version
      }
    }],

    data: {}
  };

  const internalServer = await createInternalServer(state, options.port, options.tls);

  state.nodes[0].connection = await makeConnection(options.host, options.port, options.tls);

  let server;

  if (options.tls) {
    server = require('https').createServer(options.tls, handleExternal.bind(null, state));
  } else {
    server = require('http').createServer(handleExternal.bind(null, state));
  }

  server.listen(options.queryPort);

  return new Promise((resolve) => {
    server.on('listening', async () => {
      resolve({
        url: `${options.tls ? 'https' : 'http'}://` + options.host + ':' + options.queryPort,

        state,

        join: async ({ host, port }) => {
          if (state.nodes.find(node => node.host === host && node.port === port)) {
            return;
          }

          const connection = await makeConnection(host, port, options.tls);

          state.nodes.push({
            host,
            port,
            connection,
            info: await connection.ask(INFO)
          });
        },

        close: () => {
          state.nodes.forEach(node => {
            node.connection.close();
          });
          server.close();
          internalServer.close();
        }
      });
    });
  });
}

module.exports = canhazdb;
