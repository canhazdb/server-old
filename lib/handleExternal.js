const writeResponse = require('write-response');
const finalStream = require('final-stream');

const validateAlphaNumericDashDot = require('./utils/validateAlphaNumericDashDot');
const selectRandomItemFromArray = require('./utils/selectRandomItemFromArray');

const {
  STATUS,
  DATA,
  DOCUMENT,
  DOCUMENTS,
  GET,
  POST,
  PUT,
  DELETE,
  COLLECTION_ID,
  RESOURCE_ID,
  QUERY,
  LIMIT,
  ORDER
} = require('./constants');

function askOnAllNodes (state, command, data) {
  return Promise.all(
    state.nodes.map(node => node.connection.ask(command, data))
  );
}

function accumulateChanges (responses) {
  return responses.reduce((accumulator, response) => {
    if (!response[DATA]) {
      return accumulator;
    }

    accumulator = accumulator + response[DATA].changes;
    return accumulator;
  }, 0);
}

async function handleGetOne (state, request, response, { collectionId, resourceId }) {
  const responses = await askOnAllNodes(state, GET, {
    [COLLECTION_ID]: collectionId,
    [RESOURCE_ID]: resourceId
  });

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

function dynamicSort (property, direction = 1) {
  return function (a, b) {
    var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
    return result * direction;
  };
}

function orderByFields (results, order) {
  const matcher = /(desc|asc)\((.*?)\)/g;
  [...order.matchAll(matcher)]
    .forEach(field => {
      const fieldName = field[2];
      const fieldDirection = field[1];
      results.sort(dynamicSort(fieldName, fieldDirection === 'asc' ? 1 : -1));
    });
}

async function handleGetAll (state, request, response, { collectionId, url }) {
  const limit = url.searchParams.get('limit') && JSON.parse(url.searchParams.get('limit'));
  const order = url.searchParams.get('order');

  const responses = await askOnAllNodes(state, GET, {
    [COLLECTION_ID]: collectionId,
    [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query')),
    [ORDER]: url.searchParams.get('order'),
    [LIMIT]: limit
  });

  if (!responses.find(response => response[STATUS] === 200)) {
    writeResponse(404, {}, response);
    return;
  }

  let results = responses
    .map(response => response[DOCUMENTS])
    .flat()
    .filter(item => !!item);

  if (limit) {
    results = results.slice(0, limit);
  }

  if (order) {
    orderByFields(results, order);
  }

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

async function handlePutOne (state, request, response, { collectionId, resourceId }) {
  const body = await finalStream(request).then(JSON.parse);

  const results = await askOnAllNodes(state, PUT, {
    [COLLECTION_ID]: collectionId,
    [RESOURCE_ID]: resourceId,
    [DOCUMENT]: body
  });

  const result = results.find(response => response[STATUS] === 200);

  if (!result) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, result, response);
}

async function handlePutAll (state, request, response, { collectionId, url }) {
  const body = await finalStream(request).then(JSON.parse);

  const responses = await askOnAllNodes(state, PUT, {
    [COLLECTION_ID]: collectionId,
    [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query')),
    [DOCUMENT]: body
  });

  const changes = accumulateChanges(responses);

  writeResponse(200, { changes }, response);
}

async function handleDeleteOne (state, request, response, { collectionId, resourceId }) {
  const responses = await askOnAllNodes(state, DELETE, {
    [COLLECTION_ID]: collectionId,
    [RESOURCE_ID]: resourceId
  });

  const changes = accumulateChanges(responses);

  if (changes === 0) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, {}, response);
}

async function handleDeleteAll (state, request, response, { collectionId, url }) {
  const responses = await askOnAllNodes(state, DELETE, {
    [COLLECTION_ID]: collectionId,
    [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query'))
  });

  const changes = accumulateChanges(responses);

  writeResponse(200, { changes }, response);
}

function handleExternal (state, request, response) {
  const url = new URL(request.url, 'http://localhost');

  const [, collectionId, resourceId] = url.pathname.split('/');

  if (collectionId && !validateAlphaNumericDashDot(collectionId)) {
    writeResponse(422, {
      errors: ['collectionId can only contain a-z, A-Z, 0-9, dashs or dots']
    }, response);
    return;
  }

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

  if (request.method === 'PUT' && resourceId) {
    handlePutOne(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'PUT' && !resourceId) {
    handlePutAll(state, request, response, { collectionId, url });
    return;
  }

  if (request.method === 'DELETE' && resourceId) {
    handleDeleteOne(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'DELETE' && !resourceId) {
    handleDeleteAll(state, request, response, { collectionId, url });
    return;
  }

  response.writeHead(404);
  response.end();
}

module.exports = handleExternal;
