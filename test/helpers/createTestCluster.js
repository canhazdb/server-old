const canhazdb = require('../../server');

const selectRandomItemFromArray = require('../../utils/selectRandomItemFromArray');

async function createTestCluster (count, tls) {
  const nodeOptions = Array(count)
    .fill(null)
    .map((_, index) => {
      const port = 7060 + index;

      return {
        host: 'localhost',
        logger: () => {},
        port,
        queryPort: 8060 + index,
        dataDirectory: './canhazdata/' + index,
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
      return Promise.all(
        nodes.map(node => node.close())
      );
    },

    nodes
  };
}
module.exports = createTestCluster;
