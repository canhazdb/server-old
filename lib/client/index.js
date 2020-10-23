const { promisify } = require('util');

const https = require('https');
const querystring = require('querystring');
const finalStream = require('final-stream');

const validateQueryOptions = require('../utils/validateQueryOptions');

function client (rootUrl, clientOptions) {
  const httpsAgent = clientOptions && clientOptions.tls && new https.Agent(clientOptions.tls);

  function getAll (collectionId, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
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

  return {
    getAll: promisify(getAll),
    getOne: promisify(getOne),
    put: promisify(put),
    patch: promisify(patch),
    post: promisify(post),
    delete: promisify(del)
  };
}

module.exports = client;
