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

  try {
    if (await isLockedOrWait(context.locks, [collectionId], lockId, waitForUnlock)) {
      throw Object.assign(new Error('lock prevented change'), { status: 409 });
    }

    data._replicatedNodes = replicatedNodes.sort();
    const document = await context.driver.post(collectionId, data);

    // context.updateCollectionMetadata(collectionId, { documentCountAdd: 1 });

    if (isDocumentPrimaryReplica(context, document)) {
      context.emit('notify', `POST:/${collectionId}/${document.id}`, 'POST', collectionId, document.id, request);
    }

    response.reply(c.STATUS_CREATED, {
      [c.DATA]: document
    });
  } catch (error) {
    response.reply(c.STATUS_BAD_REQUEST, {
      [c.ERROR]: error.message
    });
    log.warn('bad request from server', { error });
  }
}

export default postController;
