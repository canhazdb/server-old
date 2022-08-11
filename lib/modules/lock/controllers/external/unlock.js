import c from '../../../../constants.js';

async function unlockController ({ context, socket, request, response }) {
  const requestData = request.json();

  const matchingLock = socket.state.locks
    .find(id => id === requestData[c.LOCK_ID]);

  if (!matchingLock) {
    response.reply(c.STATUS_NOT_FOUND);
    return;
  }

  const result = await context.raft.leader.client.send(c.UNLOCK, {
    [c.INTERNAL]: true,
    [c.LOCK_ID]: requestData[c.LOCK_ID]
  });

  if (result.command !== c.STATUS_OK) {
    response.reply(c.STATUS_SERVER_ERROR, {
      [c.ERROR]: {
        message: 'lock has not been released',
        reason: result[c.ERROR]
      }
    });
    return;
  }

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: requestData[c.LOCK_ID]
  });
}

export default unlockController;
