import c from '../../constants.js';

async function unlockController (context, socket, request, response) {
  const requestData = request.json();

  const id = requestData[c.LOCK_ID];

  const removedAtLeastOne = await context.locks.remove(id);

  if (!removedAtLeastOne) {
    response.reply(c.STATUS_NOT_FOUND, {
      [c.LOCK_ID]: id
    });
    return;
  }

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: id
  });
}

export default unlockController;
