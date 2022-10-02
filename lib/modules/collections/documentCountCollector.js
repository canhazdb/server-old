import logslot from 'logslot';
import debarrel from 'debarrel';

const log = logslot('canhazdb.documentCountCollector');

function documentCountCollector (handler) {
  const cache = {};
  let processing = false;

  async function processCache () {
    if (processing) {
      setTimeout(() => processCache(), 25);
      return;
    }

    processing = true;

    try {
      await handler(cache);
    } catch (error) {
      log.error('could not update documentCount', error);
    } finally {
      processing = false;
    }
  }

  const watch = debarrel(
    () => processCache(),
    {
      minimumFlushTime: 25,
      maximumFlushTime: 100
    }
  );

  const add = watch((collectionId, count) => {
    const collectionMetadata = cache[collectionId] = cache[collectionId] || {
      documentCountAdd: 0
    };

    collectionMetadata.documentCountAdd = collectionMetadata.documentCountAdd + count;
  });

  return {
    add
  };
}

export default documentCountCollector;
