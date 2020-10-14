const packageJson = require('./package.json');

const http = require('http');
const tcpocket = require('tcpocket');

const handleExternal = require('./handleExternal');
const createInternalServer = require('./createInternalServer');

const { INFO } = require('./constants');

async function makeConnection (host, port) {
  const client = await tcpocket.createClient({ host, port });
  client.on('testResp', (data, sender) => {
    console.log(data);
  });
  return client;
}

async function canhazdb (options) {
  const uri = `haz://${options.host}:${options.port}`;

  const state = {
    nodes: [{
      uri,
      info: {
        version: packageJson.version
      }
    }],

    data: {}
  };

  const internalServer = await createInternalServer(state, options.port);

  state.nodes[0].connection = await makeConnection(options.host, options.port);

  const server = http.createServer(handleExternal.bind(null, state));

  server.listen(options.queryPort);

  return new Promise((resolve) => {
    server.on('listening', async () => {
      resolve({
        url: 'http://' + options.host + ':' + options.queryPort,

        state,

        join: async rawUri => {
          const uri = new URL(rawUri);

          if (state.nodes.find(node => node.uri === rawUri)) {
            return;
          }

          const connection = await makeConnection(uri.hostname, uri.port);

          state.nodes.push({
            uri: rawUri,
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
