const writeResponse = require('write-response');

const {
  COMMAND,
  GET,
  STATUS,
  DATA,
  COLLECTION_ID,
  RESOURCE_ID,
  QUERY,
  LIMIT,
  DOCUMENTS,
  FIELDS
} = require('../../constants');

function askOnAllNodes (state, data) {
  return Promise.all(
    state.nodes.map(node => node.connection.send(data))
  );
}

async function handleGetOne (state, request, response, { collectionId, resourceId, url }) {
  const responses = await askOnAllNodes(state, {
    [COMMAND]: GET,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query')),
      [RESOURCE_ID]: resourceId,
      [LIMIT]: 1,
      [FIELDS]: url.searchParams.get('fields') && JSON.parse(url.searchParams.get('fields'))
    }
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  if (!responses.find(response => response[STATUS] === 200)) {
    writeResponse(404, {}, response);
    return;
  }

  const results = responses
    .map(response => response[DOCUMENTS] || [])
    .flat();

  if (results.length === 0) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, results[0], response);
}

module.exports = handleGetOne;
