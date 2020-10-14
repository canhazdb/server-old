const tcpocket = require('tcpocket');
const uuid = require('uuid').v4;

const {
  STATUS,
  DOCUMENT,
  INFO,
  GET_ONE,
  GET_ALL,
  POST,
  PUT,
  DELETE,
  COLLECTION_ID,
  RESOURCE_ID,
  QUERY,
  IDS
} = require('./constants');

const partiallyMatchObject = require('./utils/partiallyMatchObject');

function getOne (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];

  const resource = state.data[collectionId] && state.data[collectionId][resourceId];

  if (!resource) {
    sender.reply({ [STATUS]: 404 });
    return;
  }

  sender.reply({ [STATUS]: 200, [DOCUMENT]: resource });
}

function getAll (state, data, sender) {
  const collectionId = data[COLLECTION_ID];

  const collection = state.data[collectionId] || {};

  const query = data[QUERY];
  const ids = data[IDS];

  const filtered = Object
    .keys(collection)
    .filter(key => {
      if (ids) {
        return ids.includes(key);
      }

      return query ? partiallyMatchObject(collection[key], query) : true;
    })
    .map(key => {
      return {
        id: key,
        ...collection[key]
      };
    });

  sender.reply({ [STATUS]: 200, [DOCUMENT]: filtered });
}

async function post (state, data, sender) {
  const collectionId = data[COLLECTION_ID];

  const resourceId = uuid();

  state.data[collectionId] = state.data[collectionId] || {};

  state.data[collectionId][resourceId] = data[DOCUMENT];

  sender.reply({
    [STATUS]: 201,
    [DOCUMENT]: {
      id: resourceId,
      ...state.data[collectionId][resourceId]
    }
  });
}

async function put (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];

  state.data[collectionId] = state.data[collectionId] || {};

  if (!state.data[collectionId][resourceId]) {
    sender.reply({ [STATUS]: 404 });
    return;
  }

  state.data[collectionId][resourceId] = data[DOCUMENT];

  sender.reply({
    [STATUS]: 200,
    [DOCUMENT]: {
      id: resourceId,
      ...state.data[collectionId][resourceId]
    }
  });
}

async function del (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];

  state.data[collectionId] = state.data[collectionId] || {};

  if (!state.data[collectionId][resourceId]) {
    sender.reply({ [STATUS]: 404 });
    return;
  }

  delete state.data[collectionId][resourceId];

  sender.reply({
    [STATUS]: 200
  });
}

async function info (state, data, sender) {
  sender.reply({
    [STATUS]: 200
  });
}

async function createInternalServer (state, port) {
  const internalServer = await tcpocket.createServer({ port });

  internalServer.on(INFO, info.bind(null, state));
  internalServer.on(GET_ONE, getOne.bind(null, state));
  internalServer.on(GET_ALL, getAll.bind(null, state));
  internalServer.on(POST, post.bind(null, state));
  internalServer.on(PUT, put.bind(null, state));
  internalServer.on(DELETE, del.bind(null, state));

  return internalServer;
}

module.exports = createInternalServer;
