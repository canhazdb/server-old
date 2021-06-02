const {
  COMMAND,
  DATA,
  GET,
  STATUS,
  DOCUMENTS,
  LIMIT,
  ORDER
} = require('../../constants');

const orderByFields = require('../../../utils/orderByFields');

function askOnAllNodes (state, data) {
  return Promise.all(
    state.nodes.map(node => node.connection.send(data))
  );
}

async function handleGetAll (acceptId, state, data, socket) {
  const responses = await askOnAllNodes(state, {
    [COMMAND]: GET,
    [DATA]: data
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    socket.send(JSON.stringify(['A', acceptId, responses[0]]));
    return;
  }

  if (!responses.find(response => response[STATUS] === 200)) {
    socket.send(JSON.stringify(['A', acceptId, []]));
    return;
  }

  let results = responses
    .map(response => response[DOCUMENTS])
    .flat()
    .filter(item => !!item);

  if (data[LIMIT]) {
    results = results.slice(0, data[LIMIT]);
  }

  if (data[ORDER]) {
    data[ORDER].forEach(order => {
      orderByFields(results, order);
    });
  }

  socket.send(JSON.stringify(['A', acceptId, {
    [STATUS]: 200,
    [DOCUMENTS]: results
  }]));
}

module.exports = handleGetAll;
