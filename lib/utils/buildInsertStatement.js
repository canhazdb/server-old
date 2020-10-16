function buildInsertStatement (tableName, object) {
  const fields = Object.keys(object).map(field => `"${field}"`).join(', ');
  const parameters = Object.values(object);
  return {
    sql: `INSERT INTO "${tableName}" (${fields}) VALUES (${parameters.map((_, index) => '$' + (index + 1))})`,
    parameters
  };
}

module.exports = buildInsertStatement;
