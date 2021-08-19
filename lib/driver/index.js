import path from 'path';
import fs from 'fs/promises';
import { EJDB2 } from 'node-ejdb-lite';
import mqlToJql from 'mql-to-jql';

import waitUntil from '../utils/waitUntil.js';

const convert = mqlToJql.convert;
const createQuery = mqlToJql.createQuery;

async function createEjdbDriver (state) {
  let connections = {};
  let closed = false;
  let activeQueries = 0;

  await fs.mkdir(state.options.dataDirectory, { recursive: true });

  async function getDatabaseConnection (collectionId) {
    if (connections[collectionId]) {
      return connections[collectionId];
    }
    const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

    connections[collectionId] = EJDB2.open(dbFile);
    return connections[collectionId];
  }

  async function count (collectionId, query) {
    activeQueries = activeQueries + 1;

    const ejdbQuery = convert({ query });

    const queryWithCount = {
      mql: ejdbQuery.mql + ' | count',
      values: ejdbQuery.values
    };

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, queryWithCount);

    const count = await q.scalarInt();

    activeQueries = activeQueries - 1;

    return count;
  }

  async function get (collectionId, query, fields, order, limit) {
    activeQueries = activeQueries + 1;

    if (fields && !fields.includes('id')) {
      fields.push('id');
    }

    const ejdbQuery = convert({ query, fields, order, limit });

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, ejdbQuery);
    const list = await q.list();

    activeQueries = activeQueries - 1;

    return list.map(item => item.json);
  }

  async function post (collectionId, document) {
    activeQueries = activeQueries + 1;

    const db = await getDatabaseConnection(collectionId);

    const insertableRecord = {
      ...document
    };

    await Promise.all(Object.keys(document).map(field => {
      return db.ensureStringIndex(collectionId, '/' + field, false);
    }));

    await db.put(collectionId, JSON.stringify(insertableRecord));

    activeQueries = activeQueries - 1;

    return insertableRecord;
  }

  async function put (collectionId, document, query) {
    activeQueries = activeQueries + 1;

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
        id: record.json.id,
        _replicatedNodes: record.json._replicatedNodes
      };

      return db.put(collectionId, JSON.stringify(insertableRecord), record.id);
    });

    await Promise.all(promises);

    activeQueries = activeQueries - 1;

    return { changes: promises.length };
  }

  async function patch (collectionId, document, query) {
    activeQueries = activeQueries + 1;

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

    activeQueries = activeQueries - 1;

    return { changes: promises.length };
  }

  async function del (collectionId, query) {
    activeQueries = activeQueries + 1;

    const ejdbQuery = convert({ query });

    const db = await getDatabaseConnection(collectionId);
    const q = createQuery(db, collectionId, ejdbQuery);
    const records = await q.list();
    const promises = records.map(async record => {
      return db.del(collectionId, record.id);
    });

    await Promise.all(promises);

    activeQueries = activeQueries - 1;

    return { changes: promises.length };
  }

  async function close () {
    await waitUntil(() => activeQueries === 0);

    closed = true;
    for (const connection in connections) {
      if (connections[connection]) {
        await (await connections[connection]).close();
      }
    }
    connections = {};
  }

  function throwIfClosed (fn) {
    return (...args) => {
      if (closed) {
        throw new Error('canhazdb.driver: this instance is closed');
      }

      return fn(...args);
    };
  }

  return {
    count: throwIfClosed(count),
    get: throwIfClosed(get),
    put: throwIfClosed(put),
    post: throwIfClosed(post),
    patch: throwIfClosed(patch),
    del: throwIfClosed(del),

    close
  };
}

export default createEjdbDriver;
