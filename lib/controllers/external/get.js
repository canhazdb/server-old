import logslot from 'logslot';

import c from '../../constants.js';
import orderByFields from '../../utils/orderByFields.js';

const log = logslot('canhazdb.controllers.external.get');

async function getController (context, socketState, request, response) {
  const requestData = request.json();

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.GET, {
          [c.COLLECTION_ID]: requestData[c.COLLECTION_ID],
          [c.ORDER]: requestData[c.ORDER],
          [c.LIMIT]: requestData[c.LIMIT],
          [c.INTERNAL]: true
        }, false).catch(error => {
          log.warn('node send failed', error);
        });
      })
  );

  let documents = results
    .flatMap(result => result && result.json()[c.DATA])
    .filter(item => !!item);

  const orders = requestData[c.ORDER] || [];
  orders.forEach(order => {
    orderByFields(order, documents);
  });

  const limit = requestData[c.LIMIT];
  if (limit) {
    documents = documents.slice(0, limit);
  }

  response.reply(c.STATUS_OK, {
    [c.DATA]: documents
  });
}

export default getController;
