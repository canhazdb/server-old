import documentCountCollector from './documentCountCollector.js';

import c from '../../constants.js';

async function updateCollectionByAmount (context, collectionId, cachedItem) {
  const collectionsQuery = await context.thisNode.client.send(c.GET, {
    [c.COLLECTION_ID]: 'system.collections',
    [c.QUERY]: { collectionId: collectionId }
  });

  const collection = collectionsQuery.json()[c.DATA][0];

  if (collection) {
    await context.thisNode.client.send(c.PATCH, {
      [c.COLLECTION_ID]: 'system.collections',
      [c.QUERY]: { collectionId: collectionId },
      [c.DATA]: {
        documentCount: collection.documentCount + cachedItem.documentCountAdd
      }
    });
  } else {
    await context.thisNode.client.send(c.POST, {
      [c.COLLECTION_ID]: 'system.collections',
      [c.DATA]: {
        collectionId,
        documentCount: cachedItem.documentCountAdd
      }
    });
  }
}

function collectionsModule (context) {
  const collector = documentCountCollector(async function (cache) {
    if (context.closed) {
      return;
    }

    const promises = Object.keys(cache).map(async collectionId => {
      const promise = updateCollectionByAmount(context, collectionId, cache[collectionId])
        .catch((error) => {
          if (!context.closed) {
            throw error;
          }
        });
      delete cache[collectionId];
      return promise;
    });

    await Promise.all(promises);
  });

  context.on('notify', (notifyPath, method, collectionId) => {
    if (method === 'POST') {
      collector.add(collectionId, 1);
    }

    if (method === 'DELETE') {
      collector.add(collectionId, -1);
    }
  });
}

export default collectionsModule;
