import c from '../../constants.js';
import isLockedOrWait from '../../utils/isLockedOrWait.js';
import validateRequestData from '../../utils/validateRequestData.js';

async function putController (context, socket, request, response) {
  const requestData = request.json();

  await validateRequestData(context, requestData);

  const data = requestData[c.DATA];
  const query = requestData[c.QUERY];
  const collectionId = requestData[c.COLLECTION_ID];
  const lockId = requestData[c.LOCK_ID];
  const waitForUnlock = requestData[c.LOCK_STRATEGY] !== c.LOCK_STRATEGY_FAIL;

  await isLockedOrWait(context, socket, [collectionId], lockId, waitForUnlock);

  const foundDocuments = await context.driver.get(collectionId, query);

  await context.driver.put(collectionId, data, query);

  response.reply(c.STATUS_OK, {
    [c.DATA]: foundDocuments.map(document => document.id)
  });
}

export default putController;
