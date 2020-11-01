const path = require('path');
const fs = require('fs').promises;

const tcpocket = require('tcpocket');
const lockbase = require('lockbase');
const uuid = require('uuid').v4;

const { getConnection } = require('./utils/cachableSqlite');
const queryStringToSql = require('./utils/queryStringToSql');

const {
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

function handleError (type, data, sender, error) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  const query = data[QUERY];
  const fields = data[FIELDS];
  const order = data[ORDER];
  const limit = data[LIMIT];

  console.log(error);

  sender.reply({
    [STATUS]: 500,
    [DATA]: {
      error: error.message,
      type,
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

async function get (state, data, sender) {
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
    sender.reply({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const statement = queryStringToSql.records(collectionId, query, fields, order, limit);
  const resources = await db.all(statement.query, statement.values);

  const documents = resources.map(resource => ({
    id: resource.id,
    ...(fields ? resource : JSON.parse(resource.data))
  }));

  sender.reply({ [STATUS]: 200, [DOCUMENTS]: documents });
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

async function post (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const lockId = data[LOCK_ID];
  const waitForUnlock = data[LOCK_STRATEGY] !== LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(state.locks, [collectionId], lockId, waitForUnlock)) {
    sender.reply({
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

  sender.reply({
    [STATUS]: 201,
    [DOCUMENT]: {
      id: resourceId,
      ...data[DOCUMENT]
    }
  });
}

async function put (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  let query = data[QUERY];

  if (resourceId) {
    query = { id: resourceId };
  }

  const lockId = data[LOCK_ID];
  const waitForUnlock = data[LOCK_STRATEGY] !== LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(state.locks, [collectionId], lockId, waitForUnlock)) {
    sender.reply({
      [STATUS]: 409
    });

    return;
  }

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

  if (!await fileExists(dbFile)) {
    sender.reply({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const updates = {
    data: JSON.stringify(data[DOCUMENT])
  };

  const statement = queryStringToSql.records(collectionId, query, null, null, null, null, 'update', updates);
  const result = await db.run(statement.query, statement.values);

  sender.reply({ [STATUS]: 200, [DATA]: { changes: result.changes } });
}

async function patch (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  let query = data[QUERY];

  if (resourceId) {
    query = { id: resourceId };
  }

  const lockId = data[LOCK_ID];
  const waitForUnlock = data[LOCK_STRATEGY] !== LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(state.locks, [collectionId], lockId, waitForUnlock)) {
    sender.reply({
      [STATUS]: 409
    });

    return;
  }

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

  if (!await fileExists(dbFile)) {
    sender.reply({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const updates = {
    data: JSON.stringify(data[DOCUMENT])
  };

  const statement = queryStringToSql.records(collectionId, query, null, null, null, null, 'patch', updates);
  const result = await db.run(statement.query, statement.values);

  sender.reply({ [STATUS]: 200, [DATA]: { changes: result.changes } });
}

async function del (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  let query = data[QUERY];

  if (resourceId) {
    query = { id: resourceId };
  }

  const lockId = data[LOCK_ID];
  const waitForUnlock = data[LOCK_STRATEGY] !== LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(state.locks, [collectionId], lockId, waitForUnlock)) {
    sender.reply({
      [STATUS]: 409
    });

    return;
  }

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');
  if (!await fileExists(dbFile)) {
    sender.reply({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const statement = queryStringToSql.records(collectionId, query, null, null, null, null, 'delete');
  const result = await db.run(statement.query, statement.values);

  sender.reply({ [STATUS]: 200, [DATA]: { changes: result.changes } });
}

async function info (state, data, sender) {
  await Promise.all(data.nodes.map(node => state.join(node, true)));

  sender.reply({
    [STATUS]: 200,
    [DATA]: {
      nodes: state.nodes.map(node => ({ host: node.host, port: node.port }))
    }
  });
}

async function lock (state, data, sender) {
  const { id, keys } = data[DATA];

  await state.locks.add(keys, id);

  sender.reply({
    [STATUS]: 200,
    [DATA]: {
      id
    }
  });
}

async function unlock (state, data, sender) {
  const { id } = data[DATA];

  if (state.locks.remove(id)) {
    sender.reply({
      [STATUS]: 200
    });

    return;
  }

  sender.reply({
    [STATUS]: 404
  });
}

async function createInternalServer (state, port, tls) {
  state.locks = lockbase();

  const internalServer = await tcpocket.createServer({ port, tls });

  internalServer.on(INFO, (data, sender) => {
    info(state, data, sender).catch(error => { handleError('info', data, sender, error); });
  });
  internalServer.on(LOCK, (data, sender) => {
    lock(state, data, sender).catch(error => { handleError('lock', data, sender, error); });
  });
  internalServer.on(UNLOCK, (data, sender) => {
    unlock(state, data, sender).catch(error => { handleError('unlock', data, sender, error); });
  });
  internalServer.on(GET, (data, sender) => {
    get(state, data, sender).catch(error => { handleError('get', data, sender, error); });
  });
  internalServer.on(POST, (data, sender) => {
    post(state, data, sender).catch(error => { handleError('post', data, sender, error); });
  });
  internalServer.on(PUT, (data, sender) => {
    put(state, data, sender).catch(error => { handleError('put', data, sender, error); });
  });
  internalServer.on(PATCH, (data, sender) => {
    patch(state, data, sender).catch(error => { handleError('patch', data, sender, error); });
  });
  internalServer.on(DELETE, (data, sender) => {
    del(state, data, sender).catch(error => { handleError('delete', data, sender, error); });
  });

  return internalServer;
}

module.exports = createInternalServer;
