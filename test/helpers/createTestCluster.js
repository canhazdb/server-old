const canhazdb = require('../../server');

const selectRandomItemFromArray = require('../../utils/selectRandomItemFromArray');

async function createTestCluster (count, tls) {
  const nodePromises = Array(count)
    .fill(null)
    .map((_, index) => {
      return canhazdb({
        host: 'localhost',
        logger: () => {},
        port: 7060 + index,
        queryPort: 8060 + index,
        dataDirectory: './canhazdata/' + index,
        tls
      });
    });

  const nodes = await Promise.all(nodePromises);

  await Promise.all(nodes.map(node => {
    return Array(count)
      .fill(null)
      .map((_, index) => {
        return node.join({ host: 'localhost', port: 7060 + index });
      });
  }).flat());

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
