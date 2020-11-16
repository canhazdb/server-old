const EJDB2 = require('ejdb2_node');
const convert = require('mql-to-jql/convert')
const createQuery = require('mql-to-jql/createQuery')
const uuid = require('uuid').v4;

function createEjdbDriver (state) {
  async function get (collectionId, query, fields, order, limit) {
    const ejdbQuery = convert(query);

    const db = await EJDB2.open(`${collectionId}.db`);
    const q = createQuery(db, collectionId, ejdbQuery);
    return q.list();
  }

  async function post (collectionId, document) {
    const insertableRecord = {
      ...document,
      id: uuid()
    };

    await db.put(collectionId, insertableRecord);

    return insertableRecord;
  }

  async function put (collectionId, document, query) {
    const ejdbQuery = convert(query);

    const db = await EJDB2.open(`${collectionId}.db`);
    const q = createQuery(db, collectionId, ejdbQuery);
    const records = await q.list();
    const promises = records.map(async record => {
      const insertableRecord = {
        ...document,
        id: record.id
      };
    
      return db.put(record.id, insertableRecord);
    })

    return Promise.all(promises)
  }

  async function patch (collectionId, document, query) {
    const ejdbQuery = convert(query);

    const db = await EJDB2.open(`${collectionId}.db`);
    const q = createQuery(db, collectionId, ejdbQuery);
    const records = await q.list();
    const promises = records.map(async record => {
      const insertableRecord = {
        ...document,
        id: record.id
      };
    
      return db.patch(record.id, insertableRecord);
    })

    return Promise.all(promises)
  }

  async function del (collectionId, query) {
    const ejdbQuery = convert(query);

    const db = await EJDB2.open(`${collectionId}.db`);
    const q = createQuery(db, collectionId, ejdbQuery);
    const records = await q.list();
    const promises = records.map(async record => {
      return db.del(record.id);
    })

    return Promise.all(promises)
  }

  async function close () {
    // flushCache();
  }

  return {
    get,
    put,
    post,
    patch,
    del,

    close
  };
}

module.exports = createEjdbDriver;
