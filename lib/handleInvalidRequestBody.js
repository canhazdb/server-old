function handleInvalidRequestBody (error) {
  if (error.message.includes('Unexpected token')) {
    throw Object.assign(new Error('request body not valid json'), { statusCode: 400 });
  } else {
    throw Object.assign(new Error('empty request body not allowed'), { statusCode: 400 });
  }
}

module.exports = handleInvalidRequestBody;
