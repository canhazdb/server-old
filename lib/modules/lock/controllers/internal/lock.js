import c from '../../../../constants.js';

async function lockController ({ context, socket, request, response }) {
  const requestData = request.json();

  const keys = requestData[c.LOCK_KEYS];
  const id = requestData[c.LOCK_ID];
  const lockOrigin = requestData[c.LOCK_ORIGIN];

  context.locks.byNode[lockOrigin] = context.locks.byNode[lockOrigin] || [];
  context.locks.byNode[lockOrigin].push(id);
  await context.locks.add(keys, id);

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: id
  });
}

export default lockController;
