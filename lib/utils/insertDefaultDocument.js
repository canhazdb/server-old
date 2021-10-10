import logslot from 'logslot';
import canhazdbClient from 'canhazdb-client';
import waitUntil from './waitUntil.js';

const log = logslot('canhazdb.utils.insertDefaultDocument');

async function insertDefaultDocument (context, collectionId, document) {
  let lockId;
  let client;
  try {
    await waitUntil(() => {
      return context.thisNode || context.closed;
    });

    if (!context.thisNode || !context.thisNode.client) {
      throw new Error('no thisNode.connection');
    }

    client = await canhazdbClient({
      ...context.clientConfig,
      connection: context.thisNode.client
    });

    lockId = await client.lock([collectionId]);
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
    if (lockId) {
      client.unlock(lockId).catch(() => {});
    }
    log.warn('could not insert default document [' + collectionId + ']', { message: error.message });
  }
}

export default insertDefaultDocument;
