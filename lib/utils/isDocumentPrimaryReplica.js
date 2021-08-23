function isDocumentPrimaryReplica (context, document) {
  const connectedNodes = context.nodes.filter(node => node.status === 'healthy');

  const availableReplicatedNodes = document._replicatedNodes
    .sort()
    .filter(nodeName => {
      return !!connectedNodes.find(cnode => cnode.name === nodeName);
    });

  if (availableReplicatedNodes[0] === context.thisNode.name) {
    return true;
  }
}

export default isDocumentPrimaryReplica;
