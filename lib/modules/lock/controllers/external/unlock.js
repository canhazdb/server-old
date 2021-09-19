import c from '../../../../constants.js';

async function unlockController ({ context, socket, request, response }) {
  const requestData = request.json();

  const results = await context.sendToAllNodes(context, c.UNLOCK, {
    [c.INTERNAL]: context.thisNode.name,
    [c.LOCK_ID]: requestData[c.LOCK_ID]
  });

  const errors = results.filter(result => {
    return result && result.command !== c.STATUS_OK;
  });

  if (errors.length > 0) {
    response.reply(errors[0].command, errors[0].data);
    return;
  }

  socket.state.locks = socket.state.locks
    .filter(id => id !== requestData[c.LOCK_ID]);

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: requestData[c.LOCK_ID]
  });
}

export default unlockController;
