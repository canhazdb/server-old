function syncServerHealth (context) {
  const thisNodeHasConflicts = context.conflicts.items
    .some(conflict => conflict.nodeName === context.thisNode.name);

  if (thisNodeHasConflicts) {
    context.thisNode.status = 'unhealthy';
    console.log(`
      THERE ARE CONFLICTS, BUT WE HAVE NOT IMPLEMENTED
      RESOLVING THEM YET. OOPS!
    `);
    return;
  }

  const totalNodes = context.nodes.length;
  const onlineNodes = context.nodes.filter(node => node.online).length;
  const percentageOnline = onlineNodes / totalNodes;

  if (percentageOnline > 0.5) {
    context.thisNode.status = 'healthy';
  } else {
    context.thisNode.status = 'unhealthy';
  }
}

function upsertConflict (context, conflictCandidate) {
  const existing = context.conflicts.find(conflict => conflict.id === conflictCandidate.id);

  if (existing) {
    return;
  }

  context.conflicts.items.push(conflictCandidate);
}

function conflictsModule (context) {
  context.conflicts = {
    items: []
  };

  context.on('node.infoReceived', function () {
    if (!context.thisNode) {
      return;
    }

    context.nodes
      .filter(node => {
        return node.online;
      })
      .forEach(node => {
        node.info.conflicts.forEach(upsertConflict.bind(null, context));
      });

    syncServerHealth(context);
  });

  context.info.generators.push(() => {
    return {
      conflicts: context.conflicts.items
    };
  });
}

export default conflictsModule;
