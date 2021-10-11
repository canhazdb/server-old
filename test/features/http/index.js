import fs from 'fs';
import test from 'basictap';
import httpRequest from '../../helpers/httpRequest.js';
import c from '../../../lib/constants.js';

import prepareTest from './prepareTest.js';
import rootMethodNotAllowed from './rootMethodNotAllowed.js';
import validateBodyExists from './validateBodyExists.js';
import validateBodyJson from './validateBodyJson.js';

const packageJson = JSON.parse(
  fs.readFileSync('./package.json', 'utf8')
);

test('get: root pathname', async t => {
  t.plan(2);

  const { client, servers, domain } = await prepareTest();

  const request = await httpRequest(`https://${domain}/`);

  await client.close();
  await servers.close();

  t.equal(request.headers['content-type'], 'application/json');

  t.deepEqual(request.data, {
    info: 'https://canhazdb.com',
    name: packageJson.name,
    status: 200,
    version: packageJson.version
  });
});

test('post: root pathname', rootMethodNotAllowed('post'));
test('put: root pathname', rootMethodNotAllowed('put'));
test('patch: root pathname', rootMethodNotAllowed('patch'));
test('delete: root pathname', rootMethodNotAllowed('delete'));

test('post: body exists', validateBodyExists('post'));
test('put: body exists', validateBodyExists('put'));
test('patch: body exists', validateBodyExists('patch'));

test('post: body is json', validateBodyJson('post'));
test('put: body is json', validateBodyJson('put'));
test('patch: body is json', validateBodyJson('patch'));

test('http - get collection', async t => {
  t.plan(3);

  const { client, servers, domain } = await prepareTest();

  const request = await httpRequest(`https://${domain}/tests`);
  const documents = request.data.sort((a, b) => {
    return a.foo > b.foo ? 1 : -1;
  });

  t.equal(request.status, 200);
  t.equal(documents.length, 3);
  t.equal(documents[0].foo, 'bar1');

  await client.close();
  await servers.close();
});

test('http - get document', async t => {
  t.plan(3);

  const { client, servers, domain, exampleDocuments } = await prepareTest();
  const document = exampleDocuments[0].json()[c.DATA];

  const request = await httpRequest(`https://${domain}/tests/${document.id}`);

  t.equal(request.status, 200);
  t.ok(request.data.id, 'has an id');
  t.equal(request.data.foo, 'bar1');

  await client.close();
  await servers.close();
});
