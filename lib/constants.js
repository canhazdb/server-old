const constants = {
  STATUS: 1,
  DOCUMENT: 2,
  DOCUMENTS: 3,
  DATA: 4,
  INFO: 5,
  GET: 6,
  POST: 7,
  PUT: 8,
  PATCH: 9,
  DELET: 10,
  COLLECTION_ID: 11,
  RESOURCE_ID: 12,
  QUERY: 13,
  LIMIT: 14,
  ORDER: 15
};

if (process.env.NODE_ENV === 'development') {
  Object.keys(constants).forEach(key => {
    constants[key] = key;
  });
}

module.exports = constants;
