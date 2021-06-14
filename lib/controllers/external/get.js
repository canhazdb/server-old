import c from '../../constants.js';
import orderByFields from '../../utils/orderByFields.js';

async function getController (context, socketState, request, response) {
  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send({
          [c.COMMAND]: c.GET,
          [c.COLLECTION_ID]: request.data[c.COLLECTION_ID],
          [c.ORDER]: request.data[c.ORDER],
          [c.LIMIT]: request.data[c.LIMIT],
          [c.INTERNAL]: true
        }, false).catch(error => {
          if (error.message === 'client disconnected') {
            return null;
          }
          throw error;
        });
      })
  );

  let documents = results
    .flatMap(result => result && result[c.DATA])
    .filter(item => !!item);

  const orders = request.data[c.ORDER] || [];
  orders.forEach(order => {
    orderByFields(order, documents);
  });

  const limit = request.data[c.LIMIT];
  if (limit) {
    documents = documents.slice(0, limit);
  }

  response.reply({
    [c.STATUS]: 200,
    [c.DATA]: documents
  });
}

export default getController;
