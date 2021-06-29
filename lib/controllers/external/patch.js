import logslot from 'logslot';

import c from '../../constants.js';

const log = logslot('canhazdb.controllers.external.patch');

async function patchController (context, socketState, request, response) {
  const requestData = request.json();

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.PATCH, {
          [c.COLLECTION_ID]: requestData[c.COLLECTION_ID],
          [c.QUERY]: requestData[c.QUERY],
          [c.DATA]: requestData[c.DATA],
          [c.INTERNAL]: true
        }, false)
          .then(result => {
            return result.json()[c.DATA];
          })
          .catch(error => {
            log.warn('node send failed', error);
            console.log('yeah, this really needs to be handled');
            process.exit(1);
          });
      })
  );

  response.reply(c.STATUS_OK, {
    [c.DATA]: results.reduce((a, b) => a + b)
  });
}

export default patchController;
