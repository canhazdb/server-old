const { promisify } = require('util');

const https = require('https');
const querystring = require('querystring');
const finalStream = require('final-stream');

function client (rootUrl, clientOptions) {
  const httpsAgent = new https.Agent(clientOptions.tls);

  function getAll (collectionId, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const query = querystring.encode(options);

    const url = `${rootUrl}/${collectionId}?${query}`;
    https.request(url, { agent: httpsAgent }, async function (response) {
      const data = await finalStream(response);

      callback(null, JSON.parse(data));
    }).end();
  }

  function getOne (collectionId, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const query = querystring.encode(options);

    const url = `${rootUrl}/${collectionId}?${query}`;
    https.request(url, { agent: httpsAgent }, async function (response) {
      const data = await finalStream(response);

      callback(null, JSON.parse(data)[0]);
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
      const data = await finalStream(response);

      callback(null, JSON.parse(data));
    }).end(JSON.stringify(document));
  }

  function put (collectionId, newDocument, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const query = querystring.encode(options);

    const url = `${rootUrl}/${collectionId}?${query}`;
    https.request(url, {
      agent: httpsAgent,
      method: 'PUT'
    }, async function (response) {
      const data = await finalStream(response);

      callback(null, JSON.parse(data));
    }).end(JSON.stringify(newDocument));
  }

  function del (collectionId, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const query = querystring.encode(options);

    const url = `${rootUrl}/${collectionId}?${query}`;
    https.request(url, {
      agent: httpsAgent,
      method: 'DELETE'
    }, async function (response) {
      const data = await finalStream(response);

      callback(null, JSON.parse(data));
    }).end();
  }

  return {
    getAll: promisify(getAll),
    getOne: promisify(getOne),
    put: promisify(put),
    post: promisify(post),
    delete: promisify(del)
  };
}

module.exports = client;
