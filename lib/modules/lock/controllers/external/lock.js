import { v4 as uuid } from 'uuid';

import c from '../../../../constants.js';
import waitUntil from '../../../../utils/waitUntil.js';

async function lockController ({ context, socket, request, response }) {
  const requestData = request.json();

  if (typeof requestData[c.LOCK_KEY] !== 'string') {
    response.reply(c.STATUS_BAD_REQUEST, {
      [c.ERROR]: {
        message: 'LOCK_KEY must be a string'
      }
    });
    return;
  }

  const id = uuid();

  await waitUntil(() => context.raft.leader?.client);

  const result = await context.raft.leader.client.send(c.LOCK, {
    [c.INTERNAL]: true,
    [c.LOCK_ID]: id,
    [c.LOCK_KEY]: requestData[c.LOCK_KEY],
    [c.LOCK_ORIGIN]: context.thisNode.name
  });

  if (result.command !== c.STATUS_OK) {
    response.reply(c.STATUS_SERVER_ERROR, {
      [c.ERROR]: {
        message: 'lock has not been acquired',
        reason: result[c.ERROR]
      }
    });
    return;
  }

  socket.state.locks.push(id);

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: id
  });
}

export default lockController;
