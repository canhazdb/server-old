function partiallyMatchObject (object, query) {
  return Object.keys(query).every(key => {
    if (!query[key]) {
      return;
    }

    if (object[key] && typeof query[key] === 'object') {
      return partiallyMatchObject(object[key], query[key]);
    }

    return query[key] === object[key];
  });
}

module.exports = partiallyMatchObject;
