const debarrel = require('debarrel');

async function upsertRecord (driver, collectionId, changes) {
  const collection = (await driver.get('system.collections', { collectionId }))[0];
  if (collection) {
    await driver.patch('system.collections', {
      documentCount: collection.documentCount + changes.documentCountAdd
    }, {
      collectionId
    });
  } else {
    await driver.post('system.collections', {
      collectionId,
      documentCount: changes.documentCountAdd
    });
  }
}

function createCollectionMetadataUpdater (state) {
  const cache = {};
  let processing = false;

  async function processCache (driver, cache) {
    if (state.closed) {
      return;
    }

    if (processing) {
      setTimeout(() => processCache(driver, cache), 25);
      return;
    }

    processing = true;

    const promises = Object.keys(cache).map(async collectionId => {
      const promise = upsertRecord(driver, collectionId, cache[collectionId]).catch((error) => {
        if (!state.closed) {
          throw error;
        }
      });
      delete cache[collectionId];
      return promise;
    });

    await Promise.all(promises);

    processing = false;
  }

  const watch = debarrel(
    () => processCache(state.driver, cache),
    {
      minimumFlushTime: 25,
      maximumFlushTime: 100
    }
  );

  return watch((collectionId, change) => {
    const collectionMetadata = cache[collectionId] = cache[collectionId] || {
      documentCountAdd: 0
    };

    collectionMetadata.documentCountAdd = collectionMetadata.documentCountAdd + change.documentCountAdd;
  });
}

module.exports = createCollectionMetadataUpdater;
