import c from '../../constants.js';

async function getController (context, socketState, request, response) {
  const results = await Promise.all(
    context.nodes.map(node => {
      return node.client.send({
        [c.COMMAND]: c.GET,
        [c.COLLECTION_ID]: request.data[c.COLLECTION_ID],
        [c.INTERNAL]: true
      });
    })
  );

  const documents = results.flatMap(result => result[c.DATA]);

  response.reply({
    [c.STATUS]: 200,
    [c.DATA]: documents
  });
}

export default getController;
