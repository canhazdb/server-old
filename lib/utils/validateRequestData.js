import c from '../constants.js';

async function validateRequestData (context, requestData) {
  const collectionId = requestData[c.COLLECTION_ID];
  const query = requestData[c.QUERY];
  const fields = requestData[c.FIELDS];
  const order = requestData[c.ORDER];
  const limit = requestData[c.LIMIT];

  try {
    await context.driver.get(collectionId, query, fields, order, limit);
  } catch (error) {
    throw Object.assign(
      new Error('validation failed'),
      {
        status: c.STATUS_BAD_REQUEST,
        error
      });
  }
}

export default validateRequestData;
