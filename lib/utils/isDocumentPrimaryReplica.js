function isDocumentPrimaryReplica (context, document) {
  return document._replicatedNodes[0] === context.thisNode.name;
}

export default isDocumentPrimaryReplica;
