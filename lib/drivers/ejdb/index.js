const path = require('path');
const fs = require('fs').promises;
const { EJDB2 } = require('node-ejdb-lite');
const convert = require('mql-to-jql/convert');
const createQuery = require('mql-to-jql/createQuery');
const uuid = require('uuid').v4;

function createEjdbDriver (state) {
  const connections = {};

  async function getDatabaseConnection (collectionId) {
    if (connections[collectionId]) {
      return connections[collectionId];
    }
    const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

    connections[collectionId] = new Promise(async resolve => {
      await fs.mkdir(state.options.dataDirectory, { recursive: true });
      const db = EJDB2.open(dbFile);
      resolve(db);
    });

    return connections[collectionId];
  }

  async function count (collectionId, query) {
    const ejdbQuery = convert({ query });

    const queryWithCount = {
      mql: ejdbQuery.mql + ' | count',
      values: ejdbQuery.values
    };

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, queryWithCount);

    const count = await q.scalarInt();

    return count;
  }

  async function get (collectionId, query, fields, order, limit) {
    if (fields && !fields.includes('id')) {
      fields.push('id');
    }

    const ejdbQuery = convert({ query, fields, order, limit });

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, ejdbQuery);
    const list = await q.list();

    return list.map(item => item.json);
  }

  async function post (collectionId, document) {
    const db = await getDatabaseConnection(collectionId);

    const insertableRecord = {
      ...document,
      id: uuid()
    };

    await db.put(collectionId, JSON.stringify(insertableRecord));

    return insertableRecord;
  }

  async function put (collectionId, document, query) {
    const ejdbQuery = convert({ query });

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, ejdbQuery);
    const records = await q.list();

    const promises = records.map(async record => {
      const insertableRecord = {
        ...document,
        id: record.json.id
      };

      return db.patch(collectionId, JSON.stringify(insertableRecord), record.id);
    });

    await Promise.all(promises);

    return { changes: promises.length };
  }

  async function patch (collectionId, document, query) {
    const ejdbQuery = convert({ query });

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, ejdbQuery);
    const records = await q.list();

    const promises = records.map(async record => {
      const parsed = record.json;

      const insertableRecord = {
        ...parsed,
        ...document,
        id: parsed.id
      };

      return db.patch(collectionId, JSON.stringify(insertableRecord), record.id);
    });

    await Promise.all(promises);

    return { changes: promises.length };
  }

  async function del (collectionId, query) {
    const ejdbQuery = convert({ query });

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, ejdbQuery);
    const records = await q.list();
    const promises = records.map(async record => {
      return db.del(collectionId, record.id);
    });

    await Promise.all(promises);

    return { changes: promises.length };
  }

  async function close () {
    for (const connection in connections) {
      (await connections[connection]).close();
    }
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

module.exports = createEjdbDriver;
