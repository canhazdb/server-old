import c from '../../constants.js';

async function internalGetController (context, socketState, request, response) {
  const data = request.data[c.DATA];
  const collectionId = request.data[c.COLLECTION_ID];
  const query = request.data[c.QUERY];
  const fields = request.data[c.FIELDS];
  const order = request.data[c.ORDER];
  const limit = request.data[c.LIMIT];

  const documents = await context.driver.get(collectionId, query, fields, order, limit);

  // Logic: Only return the document if we are
  // the first replica that's available
  const connectedNodes = context.nodes.filter(node => node.connected);
  const documentsWhereFirstReplica = documents.filter(document => {
    const availableReplicatedNodes = document._replicatedNodes.filter(nodeName => {
      return !!connectedNodes.find(cnode => cnode.name === nodeName);
    });

    if (availableReplicatedNodes[0] === context.thisNode.name) {
      return true;
    }
  });

  response.reply({
    [c.STATUS]: 200,
    [c.DATA]: documentsWhereFirstReplica
  });
}

export default internalGetController;
