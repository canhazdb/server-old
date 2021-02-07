const fs = require('fs');
const uuid = require('uuid').v4;
const canhazdb = require('../../lib');

const selectRandomItemFromArray = require('../../utils/selectRandomItemFromArray');

try {
  fs.rmdirSync('./canhazdata', { recursive: true });
} catch (error) {
  console.log(error);
}

let lastUsedPort = 11000;
const getNewPort = () => {
  lastUsedPort = lastUsedPort + 1;
  return lastUsedPort;
};

async function createTestCluster (count, tls) {
  const nodeOptions = Array(count)
    .fill(null)
    .map((_, index) => {
      const port = getNewPort();

      return {
        host: 'localhost',
        logger: () => {},
        port,
        queryPort: getNewPort(),
        dataDirectory: './canhazdata/' + uuid(),
        tls
      };
    });

  const nodePromises = nodeOptions
    .map((options) => canhazdb({
      ...options,
      join: nodeOptions.map(options => `localhost:${options.port}`)
    }));

  const nodes = await Promise.all(nodePromises);

  return {
    getRandomNodeUrl: () => {
      return selectRandomItemFromArray(nodes);
    },

    closeAll: () => {
      return Promise.all(nodes.map(node => node.close()));
    },

    nodes
  };
}
module.exports = createTestCluster;
