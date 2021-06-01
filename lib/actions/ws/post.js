const selectRandomItemFromArray = require('../../../utils/selectRandomItemFromArray');

const {
  COMMAND,
  DATA,
  POST
} = require('../../constants');

async function handlePost (acceptId, state, data, socket) {
  const node = selectRandomItemFromArray(state.nodes);

  const result = await node.connection.send({
    [COMMAND]: POST,
    [DATA]: data
  });

  socket.send(JSON.stringify(['A', acceptId, result]));
}

module.exports = handlePost;
