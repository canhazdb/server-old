import logslot from 'logslot';
import c from '../constants.js';
import waitUntil from '../utils/waitUntil.js';
const log = logslot('canhazdb.utils.insertDefaultDocument');

async function miniClient (context) {
  await waitUntil(() => context?.thisNode?.client);

  async function lock (lockKeys) {
    const results = await context.thisNode.client.send(c.LOCK, {
      [c.LOCK_KEYS]: lockKeys
    });

    const lockId = results.json()[c.LOCK_ID];
    return lockId;
  }

  async function unlock (lockId) {
    return context.thisNode.client.send(c.UNLOCK, {
      [c.LOCK_ID]: lockId
    });
  }

  function getOne () {

  }

  function post () {

  }

  return {
    lock,
    unlock,
    getOne,
    post
  };
}

async function insertDefaultDocument (context, collectionId, document) {
  try {
    const client = await miniClient(context);
    const lockId = await client.lock([collectionId]);
    const existingDocument = await client.getOne(collectionId, {
      query: {
        id: document.id
      }
    });

    if (!existingDocument) {
      await client.post(collectionId, document, {
        lockId
      });
    }

    await client.unlock(lockId);
  } catch (error) {
    log.warn('could not insert default document [' + collectionId + ']', { message: error.message });
  }
}

export default insertDefaultDocument;
