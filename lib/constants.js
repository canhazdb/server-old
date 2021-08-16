const constants = {
  INTERNAL: 2,

  COLLECTION_ID: 3,
  RESOURCE_ID: 4,

  DATA: 5,
  REPLICATED_NODES: 6,

  INFO: 7,
  COUNT: 8,
  GET: 9,
  POST: 10,
  PUT: 11,
  PATCH: 12,
  DELETE: 13,

  QUERY: 14,
  FIELDS: 15,
  LIMIT: 16,
  ORDER: 17,

  NOTIFY: 18,
  NOTIFY_ON: 19,
  NOTIFY_OFF: 20,
  NOTIFY_PATH: 21,

  LOCK: 22,
  UNLOCK: 23,
  LOCK_ID: 24,
  LOCK_STRATEGY: 25,
  LOCK_STRATEGY_FAIL: 26,
  LOCK_STRATEGY_WAIT: 27,
  LOCK_KEYS: 28,

  COMMAND: 40,
  STATUS: 41,

  ERROR: 100,

  STATUS_OK: 120,
  STATUS_BAD_REQUEST: 121,
  STATUS_NOT_FOUND: 122,
  STATUS_CREATED: 123,
  STATUS_SERVER_ERROR: 124
};

Object.keys(constants).forEach(key => {
  constants[constants[key]] = key;
});

export default constants;
