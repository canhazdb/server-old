import c from '../../../../constants.js';

async function unlockController ({ context, socket, request, response }) {
  const requestData = request.json();

  const isLeader = context.raft.leader === context.thisNode;

  if (!isLeader) {
    response.reply(c.STATUS_SERVER_ERROR, {
      [c.ERROR]: 'internal lock request sent to none leader'
    });
    return;
  }

  const id = requestData[c.LOCK_ID];

  const foundLocks = await context.locks.queue.find(lock => lock.id === id);

  if (!foundLocks) {
    response.reply(c.STATUS_NOT_FOUND, {
      [c.LOCK_ID]: id
    });
    return;
  }

  await context.dispatchToRaft(context, {
    [c.RAFT_ACTION_TYPE]: c.UNLOCK,
    [c.LOCK_ID]: id
  });

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: id
  });
}

export default unlockController;
