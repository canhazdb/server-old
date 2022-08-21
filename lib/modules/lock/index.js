import logslot from 'logslot';
import lockbase from 'lockbase';
import failmenot from 'failmenot/curried.js';
import systemLocksController from './controllers/external/systemLocksController.js';
import externalLockController from './controllers/external/lock.js';
import externalUnlockController from './controllers/external/unlock.js';
import internalLockController from './controllers/internal/lock.js';
import internalUnlockController from './controllers/internal/unlock.js';
import insertDefaultDocument from '../../utils/insertDefaultDocument.js';
import waitUntil from '../../utils/waitUntil.js';

import c from '../../constants.js';

const log = logslot('canhazdb.lock');

const dispatchToRaftWithRetry = failmenot({
  maximumTime: 5000
})((context, ...args) => {
  if (context.closed) {
    return;
  }

  return context.dispatchToRaft(context, ...args);
});

function lockReducer (state, action) {
  if (!state.locks) {
    state.locks = {
      incremental: 0,
      queue: []
    };
  }
  if (action[c.RAFT_ACTION_TYPE] === c.LOCK) {
    state.locks.queue.push({
      id: action[c.LOCK_ID],
      path: action[c.LOCK_KEY],
      origin: action[c.LOCK_ORIGIN]
    });
    state.locks.incremental = state.locks.incremental + 1;
    return state;
  }

  if (action[c.RAFT_ACTION_TYPE] === c.UNLOCK) {
    state.locks.queue = state.locks.queue.filter(item => item.id !== action[c.LOCK_ID]);

    return state;
  }

  return state;
}

async function cleanupDisconnectedNodes (context) {
  const disconnectedNodes = context.nodes.filter(node => !node.connected)

  const orphanedLocks = context.locks.queue
    .filter(item => {
      return disconnectedNodes.find(node => node.name === item.origin);
    });

  if (orphanedLocks.length > 0) {
    log.info(`cleaning up ${orphanedLocks.length} orphaned locks`);
  }

  for (let lock of orphanedLocks) {
    log.info('unlocking orphaned lock [' + lock.id + ']');
    await dispatchToRaftWithRetry(context, {
      [c.RAFT_ACTION_TYPE]: c.UNLOCK,
      [c.LOCK_ID]: lock.id
    });
  }
}

async function lockModule (context) {
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
    const isLeader = context.raft.leader === context.thisNode;

    if (!isLeader) {
      return;
    }

    socket.state.locks.forEach(lockId => {
      dispatchToRaftWithRetry(context, {
        [c.RAFT_ACTION_TYPE]: c.UNLOCK,
        [c.LOCK_ID]: lockId
      });
    });
  });

  context.on('raft:thisNodeIsLeader', () => {
    cleanupDisconnectedNodes(context);
  });

  context.on('node.disconnected', async node => {
    const isLeader = context.raft.leader === context.thisNode;
    if (!isLeader || context.closed) {
      return;
    }

    cleanupDisconnectedNodes(context);
  });

  context.on('client.connected', socket => {
    socket.state.locks = [];
  });

  context.on('raft:stateChanged', () => {
    context.locks.importState(context.raft.state.locks);
    context.locks.byNode = {};

    context.raft.state.queue?.forEach(lock => {
      const lockId = lock.id;
      const nodeName = lock.nodeName;

      context.locks.byNode[nodeName] = context.locks.byNode[nodeName] || [];
      context.locks.byNode[nodeName].push(lockId);
    });
  });

  insertDefaultDocument(context, 'system.collections', {
    id: 'system.locks',
    collectionId: 'system.locks',
    documentCount: 0
  });

  await waitUntil(() => context.raft?.reducers && context.raft?.state);

  context.raft.reducers.push(lockReducer);
}

export default lockModule;
