const fs = require('fs');

const test = require('basictap');
const httpRequest = require('./helpers/httpRequest');
const createTestCluster = require('./helpers/createTestCluster');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

test.only('batch: post two records', async t => {
  t.plan(7);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const postRequest = await httpRequest(`${node.url}/tests`, {
    method: 'POST',
    data: [{
      a: 1
    }, {
      a: 2
    }]
  });

  const getRequest1 = await httpRequest(`${node.url}/tests/${postRequest.data[0].document.id}`);
  const getRequest2 = await httpRequest(`${node.url}/tests/${postRequest.data[1].document.id}`);
  cluster.closeAll();

  t.equal(postRequest.data[0].status, 201);
  t.equal(postRequest.data[0].document.a, 1);
  t.equal(getRequest1.data.a, 1);

  t.equal(postRequest.data[1].status, 201);
  t.equal(postRequest.data[1].document.a, 2);
  t.equal(getRequest2.data.a, 2);

  t.equal(postRequest.status, 201);
});
