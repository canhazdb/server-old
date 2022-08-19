import c from '../../../../constants.js';

async function lockController ({ context, socket, request, response }) {
  const requestData = request.json();

  const isLeader = context.raft.leader === context.thisNode;

  if (!isLeader) {
    response.reply(c.STATUS_SERVER_ERROR, {
      [c.ERROR]: 'internal lock request sent to none leader'
    });
    return;
  }

  const key = requestData[c.LOCK_KEY];
  const id = requestData[c.LOCK_ID];
  const lockOrigin = requestData[c.LOCK_ORIGIN];
  context.locks.byNode[lockOrigin] = context.locks.byNode[lockOrigin] || [];
  context.locks.byNode[lockOrigin].push(id);

  let calls = 0;
  const finish = () => {
    calls = calls + 1;
    if (calls === 2) {
      response.reply(c.STATUS_OK, {
        [c.LOCK_ID]: id
      });
    }
  }

  context.locks.once('resolved.' + id, () => {
    finish();
  });

  await context.dispatchToRaft(context, {
    [c.RAFT_ACTION_TYPE]: c.LOCK,
    [c.LOCK_KEY]: key,
    [c.LOCK_ID]: id,
    [c.LOCK_ORIGIN]: lockOrigin
  });
  finish();
}

export default lockController;
