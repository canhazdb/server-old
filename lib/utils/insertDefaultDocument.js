import logslot from 'logslot';
import waitUntil from './waitUntil.js';
import c from '../constants.js';

const log = logslot('canhazdb.utils.insertDefaultDocument');

async function insertDefaultDocument (context, collectionId, document) {
  await waitUntil(() => {
    return context?.thisNode?.status === 'healthy' || context.closed;
  });

  if (!context?.thisNode?.client) {
    throw new Error('no thisNode.connection');
  }

  if (context.closed) {
    return;
  }

  try {
    const client = context.thisNode.client;

    const lockResponse = await client.send(c.LOCK, {
      [c.LOCK_KEY]: collectionId,
      [c.LOCK_ORIGIN]: context.thisNode.name
    });
    const lock = lockResponse.json();

    const unlock = async () => {
      const unlockResponse = await client.send(c.UNLOCK, {
        [c.LOCK_ID]: lock[c.LOCK_ID]
      });

      return unlockResponse;
    };

    const existingDocument = await client.send(c.GET, {
      [c.COLLECTION_ID]: collectionId,
      [c.QUERY]: {
        id: document.id
      }
    });

    if (existingDocument.json()[c.DATA].length > 0) {
      // document already exists
      await unlock();
      return;
    }

    const insertedDocument = await client.send(c.POST, {
      [c.COLLECTION_ID]: collectionId,
      [c.DATA]: document,
      [c.LOCK_ID]: lock[c.LOCK_ID]
    });

    await unlock();
  } catch (error) {
    if (context.closed) {
      return;
    }
    log.warn(`could not insertDefaultDocument "${document.id}" to "${collectionId}`, { error });
  }
}

export default insertDefaultDocument;
