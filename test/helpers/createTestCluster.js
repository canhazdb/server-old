const canhazdb = require('../../');

const selectRandomItemFromArray = require('../../utils/selectRandomItemFromArray');

async function createTestCluster (count) {
  const nodePromises = Array(count)
    .fill(null)
    .map((_, index) => {
      return canhazdb({ host: 'localhost', port: 7060 + index, queryPort: 8060 + index });
    });

  const nodes = await Promise.all(nodePromises);

  await Promise.all(nodes.map(node => {
    return Array(count)
      .fill(null)
      .map((_, index) => {
        return node.join('haz://localhost:' + (7060 + index));
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
