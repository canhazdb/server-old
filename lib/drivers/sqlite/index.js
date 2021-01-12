const path = require('path');
const fs = require('fs').promises;

const uuid = require('uuid').v4;

const { getConnection, flushCache } = require('./cachableSqlite');
const queryStringToSql = require('./queryStringToSql');

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

function createSqliteDriver (state) {
  async function count (collectionId, query) {
    collectionId = collectionId.replace(/\./g, '#');
    const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

    if (!await fileExists(dbFile)) {
      throw Object.assign(new Error('collection not found'), { status: 404 });
    }

    const db = await getConnection(10000, dbFile);

    const statement = queryStringToSql.records(collectionId, query);
    const result = await db.all(`SELECT count(*) FROM (${statement.query});`, statement.values);

    const count = result[0]['count(*)'];

    return count;
  }

  async function get (collectionId, query, fields, order, limit) {
    collectionId = collectionId.replace(/\./g, '#');
    const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

    if (!await fileExists(dbFile)) {
      return [];
    }

    const db = await getConnection(10000, dbFile);

    const statement = queryStringToSql.records(collectionId, query, fields, order, limit);
    console.log(statement);
    const resources = await db.all(statement.query, statement.values);

    return resources.map(resource => ({
      id: resource.id,
      ...(fields ? resource : JSON.parse(resource.data))
    }));
  }

  async function post (collectionId, document) {
    collectionId = collectionId.replace(/\./g, '#');
    const insertableRecord = {
      ...document,
      id: uuid()
    };

    const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');
    const db = await getConnection(10000, dbFile);
    await createTableFromSchema(db, '_' + collectionId);
    await db.run(`INSERT INTO "${'_' + collectionId}" (id, data, date_created) VALUES (?, ?, ?);`, [
      insertableRecord.id,
      JSON.stringify(insertableRecord),
      Date.now()
    ]);

    return insertableRecord;
  }

  async function put (collectionId, document, query) {
    collectionId = collectionId.replace(/\./g, '#');
    const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

    if (!await fileExists(dbFile)) {
      throw Object.assign(new Error('collection not found'), { status: 404 });
    }

    const db = await getConnection(10000, dbFile);

    const updates = {
      data: JSON.stringify(document)
    };

    const statement = queryStringToSql.records(collectionId, query, null, null, null, null, 'update', updates);
    return db.run(statement.query, statement.values);
  }

  async function patch (collectionId, document, query) {
    collectionId = collectionId.replace(/\./g, '#');
    const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

    if (!await fileExists(dbFile)) {
      throw Object.assign(new Error('collection not found'), { status: 404 });
    }

    const db = await getConnection(10000, dbFile);

    const updates = {
      data: JSON.stringify(document)
    };

    const statement = queryStringToSql.records(collectionId, query, null, null, null, null, 'patch', updates);
    return db.run(statement.query, statement.values);
  }

  async function del (collectionId, query) {
    collectionId = collectionId.replace(/\./g, '#');
    const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');
    if (!await fileExists(dbFile)) {
      throw Object.assign(new Error('collection not found'), { status: 404 });
    }

    const db = await getConnection(10000, dbFile);

    const statement = queryStringToSql.records(collectionId, query, null, null, null, null, 'delete');
    return db.run(statement.query, statement.values);
  }

  async function close () {
    flushCache();
  }

  return {
    count,
    get,
    put,
    post,
    patch,
    del,

    close
  };
}

module.exports = createSqliteDriver;
