import { v4 as uuid } from 'uuid';

import c from '../../../../constants.js';

async function lockController ({ context, socket, request, response }) {
  const requestData = request.json();

  const id = uuid();

  const results = await context.sendToAllNodes(context, c.LOCK, {
    [c.INTERNAL]: context.thisNode.name,
    [c.LOCK_ID]: id,
    [c.LOCK_KEYS]: requestData[c.LOCK_KEYS],
    [c.LOCK_ORIGIN]: context.thisNode.name
  });

  const errors = results.filter(result => {
    return result && result.command !== c.STATUS_OK;
  });

  if (errors.length > 0) {
    response.reply(errors[0].command, errors[0].data);
    return;
  }

  socket.state.locks.push(id);

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: id
  });
}

export default lockController;
