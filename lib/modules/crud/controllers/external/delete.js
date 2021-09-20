import { v4 as uuid } from 'uuid';

import c from '../../../../constants.js';
import validateRequestData from '../../../../utils/validateRequestData.js';

async function deleteController ({ context, socket, request, response }) {
  const requestData = request.json();

  await validateRequestData(context, requestData);

  const collectionId = requestData[c.COLLECTION_ID];

  const internalRequestData = {
    [c.COLLECTION_ID]: collectionId,
    [c.QUERY]: requestData[c.QUERY],
    [c.DATA]: requestData[c.DATA],
    [c.INTERNAL]: true
  };

  const results = await context.sendToAllNodes(context, c.DELETE, internalRequestData);

  const errors = results.filter(result => {
    return !result || result.command !== c.STATUS_OK || result.error;
  });

  errors.forEach(error => {
    context.emit('conflict', {
      id: uuid(),
      nodeName: error.node.name,
      method: 'DELETE',
      request: internalRequestData,
      collectionId,
      documentId: document.id,
      document,
      timestamp: new Date()
    });
  });

  const effectedDocumentIds = results.reduce((ids, result) => {
    if (result.command === c.STATUS_OK) {
      return ids.concat(result.json()[c.DATA]);
    }

    return ids;
  }, []);

  effectedDocumentIds.forEach(documentId => {
    context.emit('notify', `DELETE:/${collectionId}/${documentId}`, 'DELETE', collectionId, documentId, request);
  });

  response.reply(c.STATUS_OK, {
    [c.DATA]: effectedDocumentIds
  });
}

export default deleteController;
