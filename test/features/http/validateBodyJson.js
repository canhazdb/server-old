import httpRequest from '../../helpers/httpRequest.js';
import prepareTest from './prepareTest.js';

function validateBodyJson (method) {
  return async t => {
    t.plan(2);

    const { client, servers, domain } = await prepareTest();

    const request = await httpRequest(`https://${domain}/tests`, {
      method,
      data: 'this is not json'
    });

    await client.close();
    await servers.close();

    t.deepEqual(request.data, { error: 'request body not valid json' });
    t.equal(request.status, 400);
  };
}

export default validateBodyJson;
