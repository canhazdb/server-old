import httpRequest from '../../helpers/httpRequest.js';
import prepareTest from './prepareTest.js';

function rootMethodNotAllowed (method) {
  return async t => {
    t.plan(2);

    const { client, servers, domain } = await prepareTest();

    const request = await httpRequest(`https://${domain}/`, { method });

    await client.close();
    await servers.close();

    t.deepEqual(request.data, { error: 'method not allowed' });
    t.equal(request.status, 405);
  };
}

export default rootMethodNotAllowed;
