const { promisify } = require('util');

const https = require('https');
const querystring = require('querystring');
const finalStream = require('final-stream');
const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');

const validateQueryOptions = require('../utils/validateQueryOptions');

function createWebSocketClass (options) {
  return class extends WebSocket {
    constructor (url, protocols) {
      super(url, protocols, options);
    }
  };
}

function checkKeys (allowedKeys, object) {
  return Object
    .keys(object)
    .filter(key => !allowedKeys.includes(key));
}

function client (rootUrl, clientOptions) {
  const httpsAgent = clientOptions && clientOptions.tls && new https.Agent(clientOptions.tls);

  function getAll (collectionId, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const unknownKeys = checkKeys(['query', 'fields', 'limit', 'order'], options);
    if (unknownKeys.length > 0) {
      callback(Object.assign(new Error('canhazdb error: unknown keys ' + unknownKeys.join(','))));
      return;
    }

    if (options.query) {
      validateQueryOptions(options.query);
    }

    const query = querystring.encode({
      ...options,
      query: options.query && JSON.stringify(options.query),
      fields: options.fields && JSON.stringify(options.fields)
    });

    const url = `${rootUrl}/${collectionId}?${query}`;
    https.request(url, { agent: httpsAgent }, async function (response) {
      const data = await finalStream(response).then(JSON.parse);

      if (response.statusCode >= 500) {
        callback(Object.assign(new Error('canhazdb error'), { data }));
        return;
      }

      callback(null, data);
    }).end();
  }

  function getOne (collectionId, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const unknownKeys = checkKeys(['query', 'fields', 'limit', 'order'], options);
    if (unknownKeys.length > 0) {
      callback(Object.assign(new Error('canhazdb error: unknown keys ' + unknownKeys.join(','))));
      return;
    }

    if (options.query) {
      validateQueryOptions(options.query);
    }

    const query = querystring.encode({
      ...options,
      query: options.query && JSON.stringify(options.query),
      fields: options.fields && JSON.stringify(options.fields)
    });

    const url = `${rootUrl}/${collectionId}?${query}`;
    https.request(url, { agent: httpsAgent }, async function (response) {
      const data = await finalStream(response).then(JSON.parse);

      if (response.statusCode >= 500) {
        callback(Object.assign(new Error('canhazdb error'), { data }));
        return;
      }

      callback(null, data[0]);
    }).end();
  }

  function post (collectionId, document, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const unknownKeys = checkKeys(['lockId', 'lockStrategy'], options);
    if (unknownKeys.length > 0) {
      callback(Object.assign(new Error('canhazdb error: unknown keys ' + unknownKeys.join(','))));
      return;
    }

    const url = `${rootUrl}/${collectionId}`;
    https.request(url, {
      agent: httpsAgent,
      method: 'POST'
    }, async function (response) {
      const data = await finalStream(response).then(JSON.parse);

      if (response.statusCode >= 500) {
        callback(Object.assign(new Error('canhazdb error'), { data }));
        return;
      }

      callback(null, data);
    }).end(JSON.stringify(document));
  }

  function put (collectionId, newDocument, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const unknownKeys = checkKeys(['query', 'lockId', 'lockStrategy'], options);
    if (unknownKeys.length > 0) {
      callback(Object.assign(new Error('canhazdb error: unknown keys ' + unknownKeys.join(','))));
      return;
    }

    if (options.query) {
      validateQueryOptions(options.query);
    }

    const query = querystring.encode({
      ...options,
      query: options.query && JSON.stringify(options.query)
    });

    const url = `${rootUrl}/${collectionId}?${query}`;

    https.request(url, {
      agent: httpsAgent,
      method: 'PUT'
    }, async function (response) {
      const data = await finalStream(response).then(JSON.parse);

      if (response.statusCode >= 500) {
        callback(Object.assign(new Error('canhazdb error'), { data }));
        return;
      }

      callback(null, data);
    }).end(JSON.stringify(newDocument));
  }

  function patch (collectionId, newDocument, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const unknownKeys = checkKeys(['query', 'lockId', 'lockStrategy'], options);
    if (unknownKeys.length > 0) {
      callback(Object.assign(new Error('canhazdb error: unknown keys ' + unknownKeys.join(','))));
      return;
    }

    if (options.query) {
      validateQueryOptions(options.query);
    }

    const query = querystring.encode({
      ...options,
      query: options.query && JSON.stringify(options.query)
    });

    const url = `${rootUrl}/${collectionId}?${query}`;

    https.request(url, {
      agent: httpsAgent,
      method: 'PATCH'
    }, async function (response) {
      const data = await finalStream(response).then(JSON.parse);

      if (response.statusCode >= 500) {
        callback(Object.assign(new Error('canhazdb error'), { data }));
        return;
      }

      callback(null, data);
    }).end(JSON.stringify(newDocument));
  }

  function del (collectionId, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const unknownKeys = checkKeys(['query', 'lockId', 'lockStrategy'], options);
    if (unknownKeys.length > 0) {
      callback(Object.assign(new Error('canhazdb error: unknown keys ' + unknownKeys.join(','))));
      return;
    }

    if (options.query) {
      validateQueryOptions(options.query);
    }

    const query = querystring.encode({
      ...options,
      query: options.query && JSON.stringify(options.query)
    });

    const url = `${rootUrl}/${collectionId}?${query}`;
    https.request(url, {
      agent: httpsAgent,
      method: 'DELETE'
    }, async function (response) {
      const data = await finalStream(response).then(JSON.parse);

      if (response.statusCode >= 500) {
        callback(Object.assign(new Error('canhazdb error'), { data }));
        return;
      }

      callback(null, data);
    }).end();
  }

  function lock (keys, callback) {
    if (!Array.isArray(keys)) {
      callback(Object.assign(new Error('canhazdb error: keys must be array but got ' + keys.toString())));
      return;
    }

    const url = `${rootUrl}/_/locks`;
    https.request(url, {
      agent: httpsAgent,
      method: 'POST'
    }, async function (response) {
      const data = await finalStream(response).then(JSON.parse);

      if (response.statusCode >= 500) {
        callback(Object.assign(new Error('canhazdb error'), { data }));
        return;
      }

      callback(null, data.id);
    }).end(JSON.stringify(keys));
  }

  function unlock (lockId, callback) {
    const url = `${rootUrl}/_/locks/${lockId}`;
    https.request(url, {
      agent: httpsAgent,
      method: 'DELETE'
    }, async function (response) {
      const data = await finalStream(response).then(JSON.parse);

      if (response.statusCode >= 500) {
        callback(Object.assign(new Error('canhazdb error'), { data }));
        return;
      }

      callback(null, true);
    }).end();
  }

  const handlers = [];
  let wsUrl;
  if (rootUrl.startsWith('https://')) {
    wsUrl = rootUrl.replace('https://', 'wss://');
  } else {
    wsUrl = rootUrl.replace('http://', 'ws://');
  }

  const wsOptions = {
    WebSocket: createWebSocketClass({
      ...(clientOptions && clientOptions.tls)
    }),
    connectionTimeout: 1000,
    maxRetries: 10
  };

  const rws = clientOptions.disableNotify ? null : new ReconnectingWebSocket(wsUrl, [], wsOptions);

  function on (path, handler) {
    if (!rws) {
      throw new Error('notify was disable for this client instance');
    }
    rws.send(JSON.stringify({ [path]: true }));
    handlers.push([path, handler]);
  }

  function off (path, handler) {
    if (!rws) {
      throw new Error('notify was disable for this client instance');
    }
    rws.send(JSON.stringify({ [path]: false }));
    const index = handlers.findIndex(item => item[0] === path && item[1] === handler);
    if (index === -1) {
      return;
    }
    handlers.slice(index, 1);
  }

  rws && rws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    const handler = handlers.find(item => item[0] === data[2]);
    handler[1](...data);
  });

  function close () {
    rws && rws.close();
  }

  return {
    getAll: promisify(getAll),
    getOne: promisify(getOne),
    put: promisify(put),
    patch: promisify(patch),
    post: promisify(post),
    delete: promisify(del),
    lock: promisify(lock),
    unlock: promisify(unlock),

    on,
    off,

    close
  };
}

module.exports = client;
