import logslot from 'logslot';
import canhazdbClient from 'canhazdb-client';
const log = logslot('canhazdb.utils.insertDefaultDocument');

async function insertDefaultDocument (context, collectionId, document) {
  let lockId;
  let client;
  try {
    client = await canhazdbClient(context.clientConfig);

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
