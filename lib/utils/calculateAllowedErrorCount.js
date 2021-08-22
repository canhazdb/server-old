function calculateAllowedErrorCount (replicas, nodeCount) {
  if (nodeCount <= replicas) {
    return 0;
  }

  return Math.min(replicas - 1, nodeCount - replicas);
}

export default calculateAllowedErrorCount;
