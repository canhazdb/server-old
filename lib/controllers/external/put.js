import { v4 as uuid } from 'uuid';

import c from '../../constants.js';
import validateRequestData from '../../utils/validateRequestData.js';

async function putController ({ context, socket, request, response }) {
  const requestData = request.json();

  await validateRequestData(context, requestData);

  const collectionId = requestData[c.COLLECTION_ID];

  const document = requestData[c.DATA];

  const internalRequestData = {
    [c.COLLECTION_ID]: collectionId,
    [c.QUERY]: requestData[c.QUERY],
    [c.DATA]: document,
    [c.INTERNAL]: true
  };

  const results = await context.sendToAllNodes(context, c.PUT, internalRequestData);

  const errors = results.filter(result => {
    return !result || result.command !== c.STATUS_OK || result.error;
  });

  errors.forEach(error => {
    context.emit('conflict', {
      id: uuid(),
      nodeName: error.node.name,
      method: 'PUT',
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

  const effectedDocumentIds = results.reduce((ids, result) => {
    if (result.command === c.STATUS_OK) {
      return ids.concat(result.json()[c.DATA]);
    }

    return ids;
  }, []);

  effectedDocumentIds.forEach(documentId => {
    context.emit('notify', `PUT:/${collectionId}/${documentId}`, 'PUT', collectionId, documentId, request);
  });

  response.reply(c.STATUS_OK, {
    [c.DATA]: effectedDocumentIds
  });
}

export default putController;
