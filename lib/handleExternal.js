const writeResponse = require('write-response');
const finalStream = require('final-stream');

const selectRandomItemFromArray = require('./utils/selectRandomItemFromArray');

const {
  STATUS,
  DOCUMENT,
  DOCUMENTS,
  GET_ONE,
  GET_ALL,
  POST,
  PUT,
  DELETE,
  COLLECTION_ID,
  RESOURCE_ID,
  QUERY
} = require('./constants');

async function handleGetOne (state, request, response, { collectionId, resourceId }) {
  const responses = await Promise.all(
    state.nodes.map(node => node.connection.ask(GET_ONE, { [COLLECTION_ID]: collectionId, [RESOURCE_ID]: resourceId }))
  );

  const resource = responses.find(response => response[STATUS] === 200);

  if (!resource) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, resource[DOCUMENT], response);
}

async function handleGetAll (state, request, response, { collectionId, url }) {
  const responses = await Promise.all(
    state.nodes.map(node => node.connection.ask(GET_ALL, {
      [COLLECTION_ID]: collectionId,
      [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query'))
    }))
  );

  const results = responses
    .map(response => response[DOCUMENTS])
    .flat();

  writeResponse(200, results, response);
}

async function handlePost (state, request, response, { collectionId }) {
  const body = await finalStream(request).then(JSON.parse);

  const node = selectRandomItemFromArray(state.nodes);

  const result = await node.connection.ask(POST, {
    [COLLECTION_ID]: collectionId,
    [DOCUMENT]: body
  });

  writeResponse(201, result[DOCUMENT], response);
}

async function handlePut (state, request, response, { collectionId, resourceId }) {
  const body = await finalStream(request).then(JSON.parse);

  const responses = await Promise.all(
    state.nodes.map(node => node.connection.ask(PUT, {
      [COLLECTION_ID]: collectionId,
      [RESOURCE_ID]: resourceId,
      [DOCUMENT]: body
    }))
  );

  const results = await Promise.all(responses);

  const result = results.find(response => response[STATUS] === 200);

  if (!result) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, result[DOCUMENT], response);
}

async function handleDelete (state, request, response, { collectionId, resourceId }) {
  const responses = await Promise.all(
    state.nodes.map(node => node.connection.ask(DELETE, {
      [COLLECTION_ID]: collectionId,
      [RESOURCE_ID]: resourceId
    }))
  );

  const results = await Promise.all(responses);

  const result = results.find(response => response[STATUS] === 200);

  if (!result) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, {}, response);
}

function handleExternal (state, request, response) {
  const url = new URL(request.url, 'http://localhost');

  const [, collectionId, resourceId] = url.pathname.split('/');

  if (request.method === 'GET' && resourceId) {
    handleGetOne(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'GET' && !resourceId) {
    handleGetAll(state, request, response, { collectionId, url });
    return;
  }

  if (request.method === 'POST') {
    handlePost(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'PUT') {
    handlePut(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'DELETE') {
    handleDelete(state, request, response, { collectionId, resourceId });
    return;
  }

  response.writeHead(404);
  response.end();
}

module.exports = handleExternal;
