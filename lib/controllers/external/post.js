import { v4 as uuid } from 'uuid';

import c from '../../constants.js';
import selectRandomItemsFromArray from '../../utils/selectRandomItemsFromArray.js';

async function postController ({ context, socket, request, response }) {
  const nodes = selectRandomItemsFromArray(
    context.nodes,
    Math.min(context.settings.replicas, context.nodes.length)
  );

  const requestData = request.json();

  const document = {
    id: uuid(),
    ...requestData[c.DATA]
  };

  const collectionId = requestData[c.COLLECTION_ID];

  const internalRequestData = {
    [c.LOCK_ID]: requestData[c.LOCK_ID],
    [c.LOCK_STRATEGY]: requestData[c.LOCK_STRATEGY],
    [c.COLLECTION_ID]: collectionId,
    [c.REPLICATED_NODES]: nodes.map(node => node.name),
    [c.DATA]: document,
    [c.INTERNAL]: true
  };

  const results = await context.sendToAllClients(context, c.POST, internalRequestData);

  const errors = results.filter(result => {
    return !result || result.command !== c.STATUS_CREATED || result.error;
  });

  errors.forEach(error => {
    context.emit('conflict', {
      id: uuid(),
      nodeName: error.node.name,
      method: 'POST',
      request: internalRequestData,
      collectionId,
      documentId: document.id,
      document,
      timestamp: new Date()
    });
  });

  if (results.length - errors.length === 0) {
    response.reply(c.STATUS_SERVER_ERROR, {
      [c.ERROR]: 'No node in the cluster responded successfully'
    });
    return;
  }

  context.emit('notify', `POST:/${collectionId}/${document.id}`, 'POST', collectionId, document.id, request);

  response.reply(c.STATUS_CREATED, {
    [c.DATA]: document
  });
}

export default postController;
