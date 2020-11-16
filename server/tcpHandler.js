const tcpocket = require('tcpocket');
const lockbase = require('lockbase');

const {
  COMMAND,
  STATUS,
  DATA,
  DOCUMENT,
  DOCUMENTS,
  INFO,
  NOTIFY_ON,
  NOTIFY_OFF,
  LOCK,
  LOCK_STRATEGY,
  LOCK_STRATEGY_FAIL,
  UNLOCK,
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
  ORDER
} = require('./constants');

function getKeyByValue (object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function handleError (type, request, response, error) {
  const data = (request.data && request.data[DATA]) || {};
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  const query = data[QUERY];
  const fields = data[FIELDS];
  const order = data[ORDER];
  const limit = data[LIMIT];

  response.reply({
    [STATUS]: error.status || 500,
    [DATA]: {
      error: error.message,
      type: getKeyByValue(require('./constants'), type),
      collectionId,
      resourceId,
      query,
      fields,
      order,
      limit
    }
  });
}

async function isLockedOrWait (locks, keys, lockId, waitForUnlock) {
  const locked = locks.check(keys);

  if (!locked) {
    return false;
  }

  if (locked && locked[0] === lockId) {
    return false;
  }

  if (waitForUnlock) {
    try {
      await locks.wait(keys);
    } catch (error) {
      throw Object.assign(new Error('canhazdb cancelled all locks'), { status: 409 });
    }
    return false;
  }

  return true;
}

async function get (state, request, response) {
  const data = request.data[DATA];
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  let query = data[QUERY];
  const fields = data[FIELDS];
  const order = data[ORDER];
  const limit = data[LIMIT];

  if (resourceId) {
    query = { id: resourceId };
  }

  const documents = await state.driver.get(collectionId, query, fields, order, limit);

  response.reply({ [STATUS]: 200, [DOCUMENTS]: documents });
}

function notify (notifyPath, resource, request) {
  request.state.notifiers
    .filter(notifier => {
      return notifier[1].test(notifyPath);
    })
    .forEach(notifier => {
      request.state.send([notifyPath, resource, notifier[0]]);
    });
}

async function post (state, request, response) {
  const data = request.data[DATA];
  const collectionId = data[COLLECTION_ID];
  const lockId = data[LOCK_ID];
  const waitForUnlock = data[LOCK_STRATEGY] !== LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(state.locks, [collectionId], lockId, waitForUnlock)) {
    throw Object.assign(new Error('lock prevented change'), { status: 409 });
  }

  const document = await state.driver.post(collectionId, data[DOCUMENT]);

  notify(`POST:/${collectionId}/${document.id}`, `/${collectionId}/${document.id}`, request);

  response.reply({
    [STATUS]: 201,
    [DOCUMENT]: document
  });
}

async function put (state, request, response) {
  const data = request.data[DATA];
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  let query = data[QUERY];

  if (resourceId) {
    query = { id: resourceId };
  }

  const lockId = data[LOCK_ID];
  const waitForUnlock = data[LOCK_STRATEGY] !== LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(state.locks, [collectionId], lockId, waitForUnlock)) {
    throw Object.assign(new Error('lock prevented change'), { status: 409 });
  }

  const result = await state.driver.put(collectionId, data[DOCUMENT], query);

  response.reply({ [STATUS]: 200, [DATA]: { changes: result.changes } });
}

async function patch (state, request, response) {
  const data = request.data[DATA];
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  let query = data[QUERY];

  if (resourceId) {
    query = { id: resourceId };
  }

  const lockId = data[LOCK_ID];
  const waitForUnlock = data[LOCK_STRATEGY] !== LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(state.locks, [collectionId], lockId, waitForUnlock)) {
    throw Object.assign(new Error('lock prevented change'), { status: 409 });
  }

  const result = await state.driver.patch(collectionId, data[DOCUMENT], query);

  response.reply({ [STATUS]: 200, [DATA]: { changes: result.changes } });
}

async function del (state, request, response) {
  const data = request.data[DATA];
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  let query = data[QUERY];

  if (resourceId) {
    query = { id: resourceId };
  }

  const lockId = data[LOCK_ID];
  const waitForUnlock = data[LOCK_STRATEGY] !== LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(state.locks, [collectionId], lockId, waitForUnlock)) {
    throw Object.assign(new Error('lock prevented change'), { status: 409 });
  }

  const result = await state.driver.del(collectionId, query);

  response.reply({ [STATUS]: 200, [DATA]: { changes: result.changes } });
}

async function info (state, request, response) {
  const data = request.data[DATA];

  await Promise.all(data.nodes.map(node => state.join(node, true)));

  response.reply({
    [STATUS]: 200,
    [DATA]: {
      nodes: state.nodes.map(node => ({ host: node.host, port: node.port }))
    }
  });
}

async function lock (state, request, response) {
  const { id, keys } = request.data[DATA];

  await state.locks.add(keys, id);

  response.reply({
    [STATUS]: 200,
    [DATA]: {
      id
    }
  });
}

async function unlock (state, request, response) {
  const { id } = request.data[DATA];

  if (state.locks.remove(id)) {
    response.reply({
      [STATUS]: 200
    });

    return;
  }

  response.reply({
    [STATUS]: 404
  });
}

async function notifyOn (state, request, response) {
  const path = request.data[DATA];

  request.state.notifiers.push([path, new RegExp(path)]);
  response.reply({
    [STATUS]: 200
  });
}
async function notifyOff (state, request, response) {
  const path = request.data[DATA];

  const existingIndex = request.state.notifiers.findIndex(notifer => notifer[0] === path);
  request.state.notifiers.splice(existingIndex, 1);

  response.reply({
    [STATUS]: 200
  });
}

const mappings = {
  [INFO]: info,
  [LOCK]: lock,
  [UNLOCK]: unlock,
  [GET]: get,
  [POST]: post,
  [PUT]: put,
  [PATCH]: patch,
  [DELETE]: del,
  [NOTIFY_ON]: notifyOn,
  [NOTIFY_OFF]: notifyOff
};

function createInternalServer (state, port, tls) {
  state.locks = lockbase();

  return tcpocket.createServer({ port, tls }, function (request, response) {
    request.socket.state = request.socket.state || {
      send: response.send,
      notifiers: []
    };

    request.state = request.socket.state;

    const mapping = mappings[request.data[COMMAND]];

    if (!mapping) {
      response.reply({
        [STATUS]: 404
      });
      return;
    }

    return mapping(state, request, response)
      .catch(error => {
        if (error[STATUS] && error[STATUS] >= 500) {
          console.log(error);
        }
        handleError(request.data[COMMAND], request, response, error);
      });
  });
}

module.exports = createInternalServer;
