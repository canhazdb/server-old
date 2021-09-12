import logslot from 'logslot';

import c from '../../constants.js';

const log = logslot('canhazdb.controllers.external.unlock');

async function unlockController ({ context, socket, request, response }) {
  const requestData = request.json();

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.UNLOCK, {
          [c.INTERNAL]: context.thisNode.name,
          [c.LOCK_ID]: requestData[c.LOCK_ID]
        })
          .catch(error => {
            log.warn(error);
          });
      })
  );

  const errors = results.filter(result => {
    return result && result.command !== c.STATUS_OK;
  });

  if (errors.length > 0) {
    response.reply(errors[0].command, errors[0].data);
    return;
  }

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: requestData[c.LOCK_ID]
  });
}

export default unlockController;
