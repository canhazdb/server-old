let commandIndex = 0;

const constants = {
  COMMAND: commandIndex++,
  STATUS: commandIndex++,
  DOCUMENT: commandIndex++,
  DOCUMENTS: commandIndex++,
  DATA: commandIndex++,
  INFO: commandIndex++,
  NOTIFY_ON: commandIndex++,
  NOTIFY_OFF: commandIndex++,
  LOCK: commandIndex++,
  UNLOCK: commandIndex++,
  COUNT: commandIndex++,
  GET: commandIndex++,
  POST: commandIndex++,
  PUT: commandIndex++,
  PATCH: commandIndex++,
  DELETE: commandIndex++,
  LOCK_ID: commandIndex++,
  LOCK_STRATEGY: commandIndex++,
  LOCK_STRATEGY_FAIL: commandIndex++,
  LOCK_STRATEGY_WAIT: commandIndex++,
  COLLECTION_ID: commandIndex++,
  RESOURCE_ID: commandIndex++,
  QUERY: commandIndex++,
  FIELDS: commandIndex++,
  LIMIT: commandIndex++,
  ORDER: commandIndex++
};

if (process.env.NODE_ENV === 'development') {
  Object.keys(constants).forEach(key => {
    constants[key] = key;
  });
}

module.exports = constants;
