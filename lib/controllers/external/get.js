import logslot from 'logslot';

import c from '../../constants.js';
import orderByFields from '../../utils/orderByFields.js';
import calculateAllowedErrorCount from '../../utils/calculateAllowedErrorCount.js';
import validateRequestData from '../../utils/validateRequestData.js';

const log = logslot('canhazdb.controllers.external.get');

async function getController (context, socket, request, response) {
  const requestData = request.json();

  await validateRequestData(context, requestData);

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.GET, {
          [c.COLLECTION_ID]: requestData[c.COLLECTION_ID],
          [c.QUERY]: requestData[c.QUERY],
          [c.FIELDS]: requestData[c.FIELDS],
          [c.ORDER]: requestData[c.ORDER],
          [c.LIMIT]: requestData[c.LIMIT],
          [c.INTERNAL]: true
        }).catch(error => {
          log.warn(error);
          return {
            command: c.STATUS_SERVER_ERROR
          };
        });
      })
  );

  const errors = results.filter(result => {
    return result && result.command !== c.STATUS_OK;
  });

  const maximumErrorCount = calculateAllowedErrorCount(context.settings.replicas, context.nodes.length);

  if (errors.length > maximumErrorCount) {
    response.reply(c.STATUS_SERVER_ERROR, {
      [c.ERROR]: 'Not enough nodes responded successfully'
    });
    return;
  }

  let documents = results
    .filter(result => result.command === c.STATUS_OK)
    .flatMap(result => result && result.json()[c.DATA])
    .map(item => {
      delete item._replicatedNodes;
      return item;
    });

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
