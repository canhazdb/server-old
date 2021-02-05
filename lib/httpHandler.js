const writeResponse = require('write-response');
const finalStream = require('final-stream');
const uuid = require('uuid').v4;

const validateAlphaNumericDashDot = require('../utils/validateAlphaNumericDashDot');
const selectRandomItemFromArray = require('../utils/selectRandomItemFromArray');
const orderByFields = require('../utils/orderByFields');

const {
  COMMAND,
  STATUS,
  DATA,
  DOCUMENT,
  DOCUMENTS,
  LOCK,
  UNLOCK,
  COUNT,
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
  LOCK_ID,
  COLLECTION_ID,
  RESOURCE_ID,
  QUERY,
  FIELDS,
  LIMIT,
  ORDER,
  LOCK_STRATEGY,
  LOCK_STRATEGY_FAIL,
  LOCK_STRATEGY_WAIT
} = require('./constants');

function askOnAllNodes (state, data) {
  return Promise.all(
    state.nodes.map(node => node.connection.send(data))
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

async function handleGetOne (state, request, response, { collectionId, resourceId, url }) {
  const responses = await askOnAllNodes(state, {
    [COMMAND]: GET,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [RESOURCE_ID]: resourceId,
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

async function handleCount (state, request, response, { collectionId, url }) {
  const responses = await askOnAllNodes(state, {
    [COMMAND]: COUNT,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query'))
    }
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  if (!responses.find(response => response[STATUS] === 200)) {
    writeResponse(200, { documentCount: 0 }, response);
    return;
  }

  const documentCount = responses
    .reduce((total, response) => {
      if (response[STATUS] !== 200) {
        return total;
      }

      return total + response[DATA].documentCount;
    }, 0);

  writeResponse(200, { documentCount }, response);
}

async function handlePost (state, request, response, { collectionId }) {
  const body = await finalStream(request).then(JSON.parse);

  const documents = Array.isArray(body) ? body : [body];

  const promises = documents.map(document => {
    const node = selectRandomItemFromArray(state.nodes);

    return node.connection.send({
      [COMMAND]: POST,
      [DATA]: {
        [COLLECTION_ID]: collectionId,
        [LOCK_ID]: request.headers['x-lock-id'],
        [LOCK_STRATEGY]: request.headers['x-lock-strategy'] === 'fail' ? LOCK_STRATEGY_FAIL : LOCK_STRATEGY_WAIT,
        [DOCUMENT]: document
      }
    });
  });

  const results = await Promise.all(promises);
  if (results.length === 1) {
    writeResponse(results[0][STATUS], results[0][DOCUMENT] || results[0][DATA], response);
    return;
  }

  writeResponse(201, results.map(result => ({
    status: result[STATUS],
    document: result[DOCUMENT]
  })), response);
}

async function handlePutOne (state, request, response, { collectionId, resourceId }) {
  const body = await finalStream(request).then(JSON.parse);

  const responses = await askOnAllNodes(state, {
    [COMMAND]: PUT,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [RESOURCE_ID]: resourceId,
      [DOCUMENT]: body
    }
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  const result = responses.find(response => response[STATUS] === 200);

  if (!result) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, result, response);
}

async function handlePutAll (state, request, response, { collectionId, url }) {
  const body = await finalStream(request).then(JSON.parse);

  const responses = await askOnAllNodes(state, {
    [COMMAND]: PUT,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query')),
      [DOCUMENT]: body
    }
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  const changes = accumulateChanges(responses);

  writeResponse(200, { changes }, response);
}

async function handlePatchOne (state, request, response, { collectionId, resourceId }) {
  const body = await finalStream(request).then(JSON.parse);

  const responses = await askOnAllNodes(state, {
    [COMMAND]: PATCH,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [RESOURCE_ID]: resourceId,
      [DOCUMENT]: body
    }
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  const result = responses.find(response => response[STATUS] === 200);

  if (!result) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, result, response);
}

async function handlePatchAll (state, request, response, { collectionId, url }) {
  const body = await finalStream(request).then(JSON.parse);

  const responses = await askOnAllNodes(state, {
    [COMMAND]: PATCH,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query')),
      [DOCUMENT]: body
    }
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  const changes = accumulateChanges(responses);

  writeResponse(200, { changes }, response);
}

async function handleDeleteOne (state, request, response, { collectionId, resourceId }) {
  const responses = await askOnAllNodes(state, {
    [COMMAND]: DELETE,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [RESOURCE_ID]: resourceId
    }
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  const changes = accumulateChanges(responses);

  if (changes === 0) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, {}, response);
}

async function handleDeleteAll (state, request, response, { collectionId, url }) {
  const responses = await askOnAllNodes(state, {
    [COMMAND]: DELETE,
    [DATA]: {
      [COLLECTION_ID]: collectionId,
      [QUERY]: url.searchParams.get('query') && JSON.parse(url.searchParams.get('query'))
    }
  });

  if (responses.find(response => response[STATUS] >= 500)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  const changes = accumulateChanges(responses);

  writeResponse(200, { changes }, response);
}

async function handleLock (state, request, response) {
  const body = await finalStream(request).then(JSON.parse);

  const id = uuid();
  const responses = await askOnAllNodes(state, {
    [COMMAND]: LOCK,
    [DATA]: {
      id,
      keys: body
    }
  });

  if (responses.find(response => response[STATUS] !== 200)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  writeResponse(200, { id }, response);
}

async function handleUnlock (state, request, response, { resourceId }) {
  const responses = await askOnAllNodes(state, {
    [COMMAND]: UNLOCK,
    [DATA]: {
      id: resourceId
    }
  });

  if (responses.find(response => response[STATUS] === 404)) {
    writeResponse(404, {}, response);
    return;
  }

  if (responses.find(response => response[STATUS] !== 200)) {
    writeResponse(500, responses[0][DATA], response);
    return;
  }

  writeResponse(200, {}, response);
}

function handleSystem (state, request, response, { url }) {
  const [,, collectionId, resourceId] = url.pathname.split('/');

  if (request.method === 'POST' && collectionId === 'locks') {
    handleLock(state, request, response);
    return;
  }

  if (request.method === 'DELETE' && collectionId === 'locks') {
    handleUnlock(state, request, response, { resourceId });
    return;
  }

  response.writeHead(404);
  response.end();
}

function handleExternal (state, request, response) {
  const url = new URL(request.url, 'http://localhost');

  if (request.url.startsWith('/_')) {
    handleSystem(state, request, response, { url });
    return;
  }

  const [, collectionId, resourceId] = url.pathname.split('/');

  if (collectionId && !validateAlphaNumericDashDot(collectionId)) {
    writeResponse(422, {
      errors: ['collectionId can only contain a-z, A-Z, 0-9, dashs or dots']
    }, response);
    return;
  }

  const unhealthyNodes = state.nodes.filter(node => node.status !== 'healthy');
  if (unhealthyNodes.length > 0) {
    writeResponse(503, {
      errors: ['a node in the cluster is unhealthy, therefore the database is down']
    }, response);
    return;
  }

  if (request.method === 'GET' && resourceId) {
    handleGetOne(state, request, response, { collectionId, resourceId, url });
    return;
  }

  if (request.method === 'GET' && url.searchParams.get('count') && !resourceId) {
    handleCount(state, request, response, { collectionId, url });
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

  if (request.method === 'PATCH' && resourceId) {
    handlePatchOne(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'PATCH' && !resourceId) {
    handlePatchAll(state, request, response, { collectionId, url });
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
