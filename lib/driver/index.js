import path from 'path';
import fs from 'fs/promises';
import { EJDB2 } from 'node-ejdb-lite';
import mqlToJql from 'mql-to-jql';

const convert = mqlToJql.convert;
const createQuery = mqlToJql.createQuery;

function createEjdbDriver (state) {
  let connections = {};
  let closing;

  fs.mkdir(state.options.dataDirectory, { recursive: true })
    .catch(error => {
      console.log('could not make dataDirectory', state.options.dataDirectory);
      throw error;
    });

  async function getDatabaseConnection (collectionId) {
    if (closing) {
      throw new Error('canhazdb-driver-ejdb: getDatabaseConnection failed as client is closing');
    }

    if (connections[collectionId]) {
      return connections[collectionId];
    }
    const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

    connections[collectionId] = EJDB2.open(dbFile);
    return connections[collectionId];
  }

  async function count (collectionId, query) {
    if (closing) {
      throw new Error('canhazdb-driver-ejdb: getDatabaseConnection failed as client is closing');
    }

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
    if (closing) {
      throw new Error('canhazdb-driver-ejdb: getDatabaseConnection failed as client is closing');
    }

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
    if (closing) {
      throw new Error('canhazdb-driver-ejdb: getDatabaseConnection failed as client is closing');
    }

    const db = await getDatabaseConnection(collectionId);

    const insertableRecord = {
      ...document
    };

    await Promise.all(Object.keys(document).map(field => {
      return db.ensureStringIndex(collectionId, '/' + field, false);
    }));

    await db.put(collectionId, JSON.stringify(insertableRecord));

    return insertableRecord;
  }

  async function put (collectionId, document, query) {
    if (closing) {
      throw new Error('canhazdb-driver-ejdb: getDatabaseConnection failed as client is closing');
    }

    const ejdbQuery = convert({ query });

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, ejdbQuery);
    const records = await q.list();

    await Promise.all(Object.keys(document).map(field => {
      return db.ensureStringIndex(collectionId, '/' + field, false);
    }));

    const promises = records.map(async record => {
      const insertableRecord = {
        ...document,
        id: record.json.id
      };

      return db.put(collectionId, JSON.stringify(insertableRecord), record.id);
    });

    await Promise.all(promises);

    return { changes: promises.length };
  }

  async function patch (collectionId, document, query) {
    if (closing) {
      throw new Error('canhazdb-driver-ejdb: getDatabaseConnection failed as client is closing');
    }

    const ejdbQuery = convert({ query });

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, ejdbQuery);
    const records = await q.list();

    await Promise.all(Object.keys(document).map(field => {
      return db.ensureStringIndex(collectionId, '/' + field, false);
    }));

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
    if (closing) {
      throw new Error('canhazdb-driver-ejdb: getDatabaseConnection failed as client is closing');
    }

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

  function open () {
    closing = false;
  }

  async function close () {
    closing = true;
    for (const connection in connections) {
      if (connections[connection]) {
        await (await connections[connection]).close();
      }
    }
    connections = {};
  }

  return {
    count,
    get,
    put,
    post,
    patch,
    del,

    open,
    close
  };
}

export default createEjdbDriver;
