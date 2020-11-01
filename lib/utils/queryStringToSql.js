const builder = require('mongo-sql');
const createMatchFieldNames = collectionName => new RegExp(`"_${collectionName}"\\."(.*?)"`, 'g');

function orderToMongo (collectionName, order) {
  if (!order) {
    return null;
  }

  const matcher = /(desc|asc)\((.*?)\)/g;
  const orders = [...order.matchAll(matcher)]
    .map(field => {
      const fieldName = field[2];
      const fieldDirection = field[1];

      return `"_${collectionName}"."${fieldName}" ${fieldDirection}`;
    });

  return orders;
}

function jsonifySqlQuery (sql, matchFieldNames) {
  const built = builder.sql(sql);

  built.query = built.query
    .replace(matchFieldNames, function (_, fieldName) {
      if (fieldName === 'id') {
        return '"id"';
      }

      return `json_extract(data, "$.${fieldName}")`;
    });

  return built;
}

function queryStringToSqlRecords (collectionName, query, fields, order, limit, offset, type, updates) {
  let columns;
  type = type || 'select';

  if (fields) {
    columns = fields.map(field => `json_extract(data, '$.${field}') as ${field}`);
    columns.unshift('id');
  }

  const usersQuery = {
    type,
    table: `_${collectionName}`,
    columns,
    where: query,
    updates,
    limit,
    offset,
    order: orderToMongo(collectionName, order)
  };

  if (type === 'patch') {
    usersQuery.type = 'update';
    delete usersQuery.updates;
  }

  const matchFieldNames = createMatchFieldNames(collectionName);

  const result = jsonifySqlQuery(usersQuery, matchFieldNames);

  if (type === 'patch') {
    const jsonSet = `set data = json_patch(data, '${updates.data.replace(/'/g, "''")}')`;

    result.query = result.query
      .replace(`update "_${collectionName}"`, `update "_${collectionName}" ${jsonSet}`);
  }

  return result;
}

function queryStringToSqlCount (collectionName, url) {
  const parsedUrl = (new URL(url));
  let query = parsedUrl.searchParams.get('query');
  query = JSON.parse(query);

  const usersQuery = {
    type: 'select',
    columns: ['count(*)'],
    table: `_${collectionName}`,
    where: query
  };

  const matchFieldNames = createMatchFieldNames(collectionName);

  const result = jsonifySqlQuery(usersQuery, matchFieldNames);

  return result;
}

module.exports = {
  orderToMongo,
  count: queryStringToSqlCount,
  records: queryStringToSqlRecords
};
