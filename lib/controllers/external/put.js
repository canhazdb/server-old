import logslot from 'logslot';

import c from '../../constants.js';

const log = logslot('canhazdb.controllers.external.put');

async function putController (context, socketState, request, response) {
  const requestData = request.json();

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.PUT, {
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
          });
      })
  );

  response.reply(c.STATUS_OK, {
    [c.DATA]: results.reduce((a, b) => a + b)
  });
}

export default putController;
