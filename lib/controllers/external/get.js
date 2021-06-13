import c from '../../constants.js';

async function getController (context, socketState, request, response) {
  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send({
          [c.COMMAND]: c.GET,
          [c.COLLECTION_ID]: request.data[c.COLLECTION_ID],
          [c.INTERNAL]: true
        }, false).catch(error => {
          if (error.message === 'client disconnected') {
            return null;
          }
          throw error;
        });
      })
  );

  const documents = results
    .flatMap(result => result && result[c.DATA])
    .filter(item => !!item);

  response.reply({
    [c.STATUS]: 200,
    [c.DATA]: documents
  });
}

export default getController;
