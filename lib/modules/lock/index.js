import logslot from 'logslot';
import lockbase from 'lockbase';
import systemLocksController from './controllers/external/systemLocksController.js';
import externalLockController from './controllers/external/lock.js';
import externalUnlockController from './controllers/external/unlock.js';
import internalLockController from './controllers/internal/lock.js';
import internalUnlockController from './controllers/internal/unlock.js';
import insertDefaultDocument from '../../utils/insertDefaultDocument.js';

import c from '../../constants.js';

const log = logslot('canhazdb.lock');

function lockModule (context) {
  context.locks = lockbase();
  context.locks.byNode = {};

  context.controllers.external.add({
    command: c.LOCK,
    handler: externalLockController
  });
  context.controllers.external.add({
    command: c.UNLOCK,
    handler: externalUnlockController
  });

  context.controllers.internal.add({
    command: c.LOCK,
    handler: internalLockController
  });
  context.controllers.internal.add({
    command: c.UNLOCK,
    handler: internalUnlockController
  });

  context.controllers.external.add({
    command: c.GET,
    priority: 10,
    conditions: [
      (request) => {
        const data = request.json();
        return data[c.COLLECTION_ID] === 'system.locks';
      }
    ],
    handler: systemLocksController
  });

  context.on('client.closed', socket => {
    socket.state.locks.forEach(lockId => {
      context.sendToAllNodes(context, c.UNLOCK, {
        [c.INTERNAL]: context.thisNode.name,
        [c.LOCK_ID]: lockId
      }).catch(error => {
        log.error('could not clean up locks from closed socket', error);
      });
    });
  });

  context.on('node.disconnected', async node => {
    log.info('cleaning up locks originating from node [' + node.name + ']');

    if (context.locks.byNode[node?.name]) {
      await Promise.all(
        context.locks.byNode[node?.name].map(lockId => {
          return context.locks.remove(lockId);
        })
      );
      delete context.locks.byNode[node?.name];
    }
  });

  context.on('client.connected', socket => {
    socket.state.locks = [];
  });

  context.on('ready', () => {
    insertDefaultDocument(context, 'system.collections', {
      id: 'system.locks',
      collectionId: 'system.locks',
      documentCount: 0
    });
  });
}

export default lockModule;
