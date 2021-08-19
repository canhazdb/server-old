import fs from 'fs';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import canhazdb from '../../lib/index.js';

try {
  fs.rmSync('./canhazdata', { recursive: true });
} catch (error) {}
fs.mkdirSync('./canhazdata');

export const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

let lastUsedPort = 11000;
export const getNewPort = () => {
  lastUsedPort = lastUsedPort + 1;
  return lastUsedPort;
};

const waitUntil = promisify(function (fn, cb) {
  const result = fn();
  if (!result) {
    setTimeout(() => waitUntil(fn, cb));
    return;
  }

  cb();
});

const defaultOptions = {
  waitUntilOnline: true
};

async function createTestServers (count, options = {}) {
  options = Object.assign({}, defaultOptions, options);

  const join = [];

  const servers = await Promise.all(
    Array(count)
      .fill(null)
      .map(async (_, index) => {
        const port = getNewPort();
        const nodeName = uuid();

        const create = async () => {
          const server = await canhazdb({
            dataDirectory: './canhazdata/' + nodeName,
            nodeName: nodeName,
            host: 'localhost',
            port: port,
            join,
            tls
          });

          server.recreate = create;

          if (options.waitUntilOnline) {
            await waitUntil(() => {
              return server.thisNode && server.thisNode.status === 'healthy';
            });
          }

          return server;
        };

        const server = create();

        join.push('localhost:' + port);

        return server;
      })
  );

  servers.close = function () {
    return Promise.all(servers.map(server => server.close()));
  };

  return servers;
}

export default createTestServers;
