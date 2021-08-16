import logslot from 'logslot';
import c from '../../constants.js';
import isLockedOrWait from '../../utils/isLockedOrWait.js';
import isDocumentPrimaryReplica from '../../utils/isDocumentPrimaryReplica.js';

const log = logslot('canhazdb.controllers.internal.patch');

async function patchController (context, socket, request, response) {
  const requestData = request.json();

  const data = requestData[c.DATA];
  const query = requestData[c.QUERY];
  const collectionId = requestData[c.COLLECTION_ID];
  const lockId = requestData[c.LOCK_ID];
  const waitForUnlock = requestData[c.LOCK_STRATEGY] !== c.LOCK_STRATEGY_FAIL;

  try {
    if (await isLockedOrWait(context.locks, [collectionId], lockId, waitForUnlock)) {
      throw Object.assign(new Error('lock prevented change'), { status: 409 });
    }

    const foundDocuments = await context.driver.get(collectionId, query);
    const primaryReplicaDocuments = foundDocuments.filter(
      isDocumentPrimaryReplica.bind(null, context)
    );

    await context.driver.patch(collectionId, data, query);

    primaryReplicaDocuments.forEach(document => {
      context.emit('notify', `PATCH:/${collectionId}/${document.id}`, collectionId, document.id, request);
    });

    response.reply(c.STATUS_OK, {
      [c.DATA]: primaryReplicaDocuments.length
    });
  } catch (error) {
    response.reply(c.STATUS_BAD_REQUEST, {
      [c.ERROR]: error.message
    });
    log.warn('bad request from server', { error });
  }
}

export default patchController;
