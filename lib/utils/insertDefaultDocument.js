import canhazdbClient from 'canhazdb-client';

async function insertDefaultDocument (context, collectionId, document) {
  const client = await canhazdbClient(context.clientConfig);
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
}

export default insertDefaultDocument;
