function validateQueryOptions (options) {
  Object.keys(options).forEach(key => {
    if (options[key] === undefined) {
      throw new Error('canhazdb:client can not serialise an object with undefined');
    }
  });
}

module.exports = validateQueryOptions;
