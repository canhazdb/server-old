const writeResponse = require('write-response');
const finalStream = require('final-stream');

const selectRandomItemFromArray = require('../../../utils/selectRandomItemFromArray');
const handleInvalidRequestBody = require('../../handleInvalidRequestBody');

const {
  COMMAND,
  STATUS,
  DATA,
  DOCUMENT,
  POST,
  LOCK_ID,
  COLLECTION_ID,
  LOCK_STRATEGY,
  LOCK_STRATEGY_FAIL,
  LOCK_STRATEGY_WAIT
} = require('../../constants');

async function handlePost (state, request, response, { collectionId }) {
  const body = await finalStream(request).then(JSON.parse)
    .catch(handleInvalidRequestBody);

  const documents = Array.isArray(body) ? body : [body];

  const promises = documents.map(document => {
    const node = selectRandomItemFromArray(state.nodes);

    return node.connection.send({
      [COMMAND]: POST,
      [DATA]: {
        [COLLECTION_ID]: collectionId,
        [LOCK_ID]: request.headers['x-lock-id'],
        [LOCK_STRATEGY]: request.headers['x-lock-strategy'] === 'fail' ? LOCK_STRATEGY_FAIL : LOCK_STRATEGY_WAIT,
        [DOCUMENT]: document
      }
    });
  });

  const results = await Promise.all(promises);
  if (results.length === 1) {
    writeResponse(results[0][STATUS], results[0][DOCUMENT] || results[0][DATA], response);
    return;
  }

  writeResponse(201, results.map(result => ({
    status: result[STATUS],
    document: result[DOCUMENT]
  })), response);
}

module.exports = handlePost;
