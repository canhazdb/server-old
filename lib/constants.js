const constants = {
  STATUS: 1,
  DOCUMENT: 2,
  DOCUMENTS: 3,
  DATA: 4,
  INFO: 5,
  GET: 6,
  POST: 7,
  PUT: 8,
  DELET: 9,
  COLLECTION_ID: 10,
  RESOURCE_ID: 11,
  QUERY: 12,
  LIMIT: 13,
  ORDER: 14
};

if (process.env.NODE_ENV === 'development') {
  Object.keys(constants).forEach(key => {
    constants[key] = key;
  });
}

module.exports = constants;
