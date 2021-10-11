import httpRequest from '../../helpers/httpRequest.js';
import prepareTest from './prepareTest.js';

function validateBodyExists (method) {
  return async t => {
    t.plan(2);

    const { client, servers, domain } = await prepareTest();

    const request = await httpRequest(`https://${domain}/tests`, { method });

    await client.close();
    await servers.close();

    t.deepEqual(request.data, { error: 'empty request body not allowed' });
    t.equal(request.status, 400);
  };
}

export default validateBodyExists;
