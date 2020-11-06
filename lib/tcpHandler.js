const path = require('path');
const fs = require('fs').promises;

const tcpocket = require('tcpocket');
const lockbase = require('lockbase');
const uuid = require('uuid').v4;

const { getConnection } = require('./utils/cachableSqlite');
const queryStringToSql = require('./utils/queryStringToSql');

const {
  COMMAND,
  STATUS,
  DATA,
  DOCUMENT,
  DOCUMENTS,
  INFO,
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

  console.log(error);

  response.send({
    [STATUS]: 500,
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

async function fileExists (filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function createTableFromSchema (db, collectionName) {
  return db.run(
    `CREATE TABLE IF NOT EXISTS "${collectionName}" (
      id VARCHAR (36) PRIMARY KEY NOT NULL UNIQUE,
      data TEXT,
      date_created NUMBER,
      date_updated NUMBER
      )`
  );
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

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

  if (!await fileExists(dbFile)) {
    response.send({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const statement = queryStringToSql.records(collectionId, query, fields, order, limit);
  const resources = await db.all(statement.query, statement.values);

  const documents = resources.map(resource => ({
    id: resource.id,
    ...(fields ? resource : JSON.parse(resource.data))
  }));

  response.send({ [STATUS]: 200, [DOCUMENTS]: documents });
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
    await locks.wait(keys);
    return false;
  }

  return true;
}

async function post (state, request, response) {
  const data = request.data[DATA];
  const collectionId = data[COLLECTION_ID];
  const lockId = data[LOCK_ID];
  const waitForUnlock = data[LOCK_STRATEGY] !== LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(state.locks, [collectionId], lockId, waitForUnlock)) {
    response.send({
      [STATUS]: 409
    });

    return;
  }

  const resourceId = uuid();

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');
  const db = await getConnection(10000, dbFile);
  await createTableFromSchema(db, '_' + collectionId);
  await db.run(`INSERT INTO "${'_' + collectionId}" (id, data, date_created) VALUES (?, ?, ?);`, [
    resourceId,
    JSON.stringify(data[DOCUMENT]),
    Date.now()
  ]);

  response.send({
    [STATUS]: 201,
    [DOCUMENT]: {
      id: resourceId,
      ...data[DOCUMENT]
    }
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
    response.send({
      [STATUS]: 409
    });

    return;
  }

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

  if (!await fileExists(dbFile)) {
    response.send({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const updates = {
    data: JSON.stringify(data[DOCUMENT])
  };

  const statement = queryStringToSql.records(collectionId, query, null, null, null, null, 'update', updates);
  const result = await db.run(statement.query, statement.values);

  response.send({ [STATUS]: 200, [DATA]: { changes: result.changes } });
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
    response.send({
      [STATUS]: 409
    });

    return;
  }

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

  if (!await fileExists(dbFile)) {
    response.send({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const updates = {
    data: JSON.stringify(data[DOCUMENT])
  };

  const statement = queryStringToSql.records(collectionId, query, null, null, null, null, 'patch', updates);
  const result = await db.run(statement.query, statement.values);

  response.send({ [STATUS]: 200, [DATA]: { changes: result.changes } });
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
    response.send({
      [STATUS]: 409
    });

    return;
  }

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');
  if (!await fileExists(dbFile)) {
    response.send({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const statement = queryStringToSql.records(collectionId, query, null, null, null, null, 'delete');
  const result = await db.run(statement.query, statement.values);

  response.send({ [STATUS]: 200, [DATA]: { changes: result.changes } });
}

async function info (state, request, response) {
  const data = request.data[DATA];
  await Promise.all(data.nodes.map(node => state.join(node, true)));

  response.send({
    [STATUS]: 200,
    [DATA]: {
      nodes: state.nodes.map(node => ({ host: node.host, port: node.port }))
    }
  });
}

async function lock (state, request, response) {
  const { id, keys } = request.data[DATA];

  await state.locks.add(keys, id);

  response.send({
    [STATUS]: 200,
    [DATA]: {
      id
    }
  });
}

async function unlock (state, request, response) {
  const { id } = request.data[DATA];

  if (state.locks.remove(id)) {
    response.send({
      [STATUS]: 200
    });

    return;
  }

  response.send({
    [STATUS]: 404
  });
}

function createInternalServer (state, port, tls) {
  state.locks = lockbase();

  return tcpocket.createServer({ port, tls }, function (request, response) {
    const mappings = {
      [INFO]: info,
      [LOCK]: lock,
      [UNLOCK]: unlock,
      [GET]: get,
      [POST]: post,
      [PUT]: put,
      [PATCH]: patch,
      [DELETE]: del
    };

    const mapping = mappings[request.data[COMMAND]];

    if (!mapping) {
      response.send({
        [STATUS]: 404
      });
      return;
    }

    return mapping(state, request, response)
      .catch(error => {
        handleError(request.data[COMMAND], request, response, error);
      });
  });
}

module.exports = createInternalServer;
