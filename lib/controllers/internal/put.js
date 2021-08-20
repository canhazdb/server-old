import logslot from 'logslot';

import c from '../../constants.js';
import isLockedOrWait from '../../utils/isLockedOrWait.js';
import isDocumentPrimaryReplica from '../../utils/isDocumentPrimaryReplica.js';

const log = logslot('canhazdb.controllers.internal.put');

async function putController (context, socket, request, response) {
  const requestData = request.json();

  const data = requestData[c.DATA];
  const query = requestData[c.QUERY];
  const collectionId = requestData[c.COLLECTION_ID];
  const lockId = requestData[c.LOCK_ID];
  const waitForUnlock = requestData[c.LOCK_STRATEGY] !== c.LOCK_STRATEGY_FAIL;

  await isLockedOrWait(context, socket, [collectionId], lockId, waitForUnlock);

  const foundDocuments = await context.driver.get(collectionId, query);
  const primaryReplicaDocuments = foundDocuments.filter(
    isDocumentPrimaryReplica.bind(null, context)
  );

  await context.driver.put(collectionId, data, query);

  primaryReplicaDocuments.forEach(document => {
    context.emit('notify', `PUT:/${collectionId}/${document.id}`, 'PUT', collectionId, document.id, request);
  });

  response.reply(c.STATUS_OK, {
    [c.DATA]: primaryReplicaDocuments.length
  });
}

export default putController;
