import c from '../../constants.js';

// Logic: Only return the document if we are
// the first replica that's available
function isFirstConnectedReplica (connectedNodes, nodeName) {
  return document => {
    const availableReplicatedNodes = document._replicatedNodes.filter(nodeName => {
      return !!connectedNodes.find(cnode => cnode.name === nodeName);
    });

    if (availableReplicatedNodes[0] === nodeName) {
      return true;
    }

    return false;
  };
}

async function internalGetController (context, socketState, request, response) {
  const collectionId = request.data[c.COLLECTION_ID];
  const query = request.data[c.QUERY];
  const fields = request.data[c.FIELDS];
  const order = request.data[c.ORDER];
  const limit = request.data[c.LIMIT];

  const documents = await context.driver.get(collectionId, query, fields, order, limit);

  const connectedNodes = context.nodes.filter(node => node.connected);

  const filteredDocuments = documents.filter(
    isFirstConnectedReplica(connectedNodes, context.thisNode.name)
  );

  response.reply({
    [c.STATUS]: 200,
    [c.DATA]: filteredDocuments
  });
}

export default internalGetController;
