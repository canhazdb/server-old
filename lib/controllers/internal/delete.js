import c from '../../constants.js';
import isLockedOrWait from '../../utils/isLockedOrWait.js';

async function deleteController (context, socket, request, response) {
  const requestData = request.json();

  const query = requestData[c.QUERY];
  const collectionId = requestData[c.COLLECTION_ID];
  const lockId = requestData[c.LOCK_ID];
  const waitForUnlock = requestData[c.LOCK_STRATEGY] !== c.LOCK_STRATEGY_FAIL;

  await isLockedOrWait(context, socket, [collectionId], lockId, waitForUnlock);

  const foundDocuments = await context.driver.get(collectionId, query);

  await context.driver.del(collectionId, query);

  response.reply(c.STATUS_OK, {
    [c.DATA]: foundDocuments.map(document => document.id)
  });
}

export default deleteController;
