import logslot from 'logslot';

import c from '../../constants.js';
import validateRequestData from '../../utils/validateRequestData.js';

const log = logslot('canhazdb.controllers.external.delete');

async function deleteController ({ context, socket, request, response }) {
  const requestData = request.json();

  await validateRequestData(context, requestData);

  const collectionId = requestData[c.COLLECTION_ID];

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.DELETE, {
          [c.COLLECTION_ID]: collectionId,
          [c.QUERY]: requestData[c.QUERY],
          [c.DATA]: requestData[c.DATA],
          [c.INTERNAL]: true
        }).catch(error => {
          log.warn('node send failed', error);
        });
      })
  );

  const errors = results.filter(result => {
    return result && result.command !== c.STATUS_OK;
  });

  if (errors.length > 0) {
    response.reply(errors[0].command, errors[0].data);
    return;
  }

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
