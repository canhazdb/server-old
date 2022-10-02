function calculateAllowedErrorCount (replicas, nodeCount) {
  if (nodeCount < 1) {
    throw new Error('calculateAllowedErrorCount: nodeCount can not be less than 1');
  }
  if (nodeCount <= replicas) {
    return Math.max(0, nodeCount - 1);
  }

  return Math.min(replicas - 1, nodeCount - replicas);
}

export default calculateAllowedErrorCount;
