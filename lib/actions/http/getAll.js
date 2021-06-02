const writeResponse = require('write-response');

const orderByFields = require('../../../utils/orderByFields');

const {
  COMMAND,
  GET,
  STATUS,
  DATA,
  COLLECTION_ID,
  QUERY,
  DOCUMENTS,
  FIELDS,
  ORDER,
  LIMIT
} = require('../../constants');

function askOnAllNodes (state, data) {
  return Promise.all(
    state.nodes.map(node => node.connection.send(data))
  );
}

async function handleGetAll (state, request, response, { collectionId, url }) {
  const limit = url.searchParams.get('limit') && JSON.parse(url.searchParams.get('limit'));
  const orders = url.searchParams.get('order') && JSON.parse(url.searchParams.get('order'));

  const responses = await askOnAllNodes(state, {
    [COMMAND]: GET,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query')),
      [FIELDS]: url.searchParams.get('fields') && JSON.parse(url.searchParams.get('fields')),
      [ORDER]: orders || undefined,
      [LIMIT]: limit || undefined
    }
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  if (!responses.find(response => response[STATUS] === 200)) {
    writeResponse(200, [], response);
    return;
  }

  let results = responses
    .map(response => response[DOCUMENTS])
    .flat()
    .filter(item => !!item);

  if (limit) {
    results = results.slice(0, limit);
  }

  if (orders) {
    orders.forEach(order => {
      orderByFields(results, order);
    });
  }

  writeResponse(200, results, response);
}

module.exports = handleGetAll;
