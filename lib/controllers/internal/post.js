import logslot from 'logslot';
import c from '../../constants.js';
import isLockedOrWait from '../../utils/isLockedOrWait.js';
import isDocumentPrimaryReplica from '../../utils/isDocumentPrimaryReplica.js';

const log = logslot('canhazdb.controllers.internal.post');

async function postController (context, socket, request, response) {
  const requestData = request.json();

  const data = requestData[c.DATA];
  const collectionId = requestData[c.COLLECTION_ID];
  const replicatedNodes = requestData[c.REPLICATED_NODES];
  const lockId = requestData[c.LOCK_ID];
  const waitForUnlock = requestData[c.LOCK_STRATEGY] !== c.LOCK_STRATEGY_FAIL;

  await isLockedOrWait(context, socket, [collectionId], lockId, waitForUnlock);

  data._replicatedNodes = replicatedNodes.sort();
  const document = await context.driver.post(collectionId, data);

  if (isDocumentPrimaryReplica(context, document)) {
    context.emit('notify', `POST:/${collectionId}/${document.id}`, 'POST', collectionId, document.id, request);
  }

  response.reply(c.STATUS_CREATED, {
    [c.DATA]: document
  });
}

export default postController;
