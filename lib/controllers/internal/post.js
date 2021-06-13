import c from '../../constants.js';

async function postController (context, socketState, request, response) {
  const data = request.data[c.DATA];
  const collectionId = request.data[c.COLLECTION_ID];
  const replicatedNodes = request.data[c.REPLICATED_NODES];
  const lockId = request.data[c.LOCK_ID];
  const waitForUnlock = request.data[c.LOCK_STRATEGY] !== c.LOCK_STRATEGY_FAIL;

  // if (await isLockedOrWait(context.locks, [collectionId], lockId, waitForUnlock)) {
  //   throw Object.assign(new Error('lock prevented change'), { status: 409 });
  // }

  data._replicatedNodes = replicatedNodes.sort();
  const document = await context.driver.post(collectionId, data);

  // context.updateCollectionMetadata(collectionId, { documentCountAdd: 1 });

  // context.notify(`POST:/${collectionId}/${document.id}`, collectionId, document.id, request);

  response.reply({
    [c.STATUS]: 201,
    [c.DATA]: document
  });
}

export default postController;
