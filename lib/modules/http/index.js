import fs from 'fs';
import http2 from 'http2';
import logslot from 'logslot';
import writeResponse from 'write-response';
import validateAlphaNumericDashDot from '../../utils/validateAlphaNumericDashDot.js';
import c from '../../constants.js';
import finalStream from 'final-stream';

async function parseRequestBody (request) {
  const data = await finalStream(request);

  try {
    if (!data || data.toString() === '') {
      return [null, 'none'];
    }

    return [JSON.parse(data), 'json'];
  } catch (error) {
    return [null, 'invalid'];
  }
}

const packageJson = JSON.parse(
  fs.readFileSync('./package.json', 'utf8')
);

const log = logslot('canhazdb.http');

async function handleGetDocument (context, request, response, { collectionId, documentId }) {
  const getResult = await context.thisNode.client.send(c.GET, {
    [c.COLLECTION_ID]: collectionId,
    [c.QUERY]: {
      id: documentId
    }
  });

  const data = getResult.json()[c.DATA];

  response.end(JSON.stringify(data[0], null, 2));
}

async function handleGetCollection (context, request, response, { collectionId, query, limit }) {
  const getResult = await context.thisNode.client.send(c.GET, {
    [c.COLLECTION_ID]: collectionId,
    [c.QUERY]: query,
    [c.LIMIT]: limit ? parseInt(limit) : undefined
  });

  const data = getResult.json()[c.DATA];

  writeResponse(200, data, response);
}

function httpModule (context) {
  if (!context.options.httpPort || !context.options.httpHost) {
    return;
  }

  const server = http2.createSecureServer({
    ...context.options.tls,
    allowHTTP1: true
  }, async function (request, response) {
    const [body, bodyType] = await parseRequestBody(request);
    if (bodyType === 'invalid') {
      writeResponse(400, { error: 'request body not valid json' }, response);
      return;
    }

    if (body instanceof Error) {
      console.log(body);
      process.exit(1);
    }

    const path = request.url || request.headers[':path'];
    const url = new URL(path, 'https://127.0.0.1/');
    const parts = url.pathname.split('/');

    const [, collectionId, resourceId] = url.pathname.split('/');

    log.info('request received', { pathname: url.pathname, method: request.method });

    if (collectionId && !validateAlphaNumericDashDot(collectionId)) {
      writeResponse(422, {
        errors: ['collectionId can only contain a-z, A-Z, 0-9, dashs or dots']
      }, response);
      return;
    }

    const unhealthyNodes = context.nodes.filter(node => node.status !== 'healthy');
    if (unhealthyNodes.length > context.settings.replicas - 1) {
      writeResponse(503, {
        errors: ['too many nodes in the cluster are unhealthy, therefore the database is down']
      }, response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/') {
      writeResponse(200, {
        status: 200,
        name: packageJson.name,
        version: packageJson.version,
        info: 'https://canhazdb.com'
      }, response);
      return;
    } else if (url.pathname === '/') {
      writeResponse(405, { error: 'method not allowed' }, response);
      return;
    }

    if (!body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      writeResponse(400, { error: 'empty request body not allowed' }, response);
      return;
    }

    if (parts.length === 2) {
      handleGetCollection(context, request, response, {
        collectionId: parts[1],
        limit: url.searchParams.get('limit')
      });
      return;
    }

    if (parts.length === 3) {
      handleGetDocument(context, request, response, {
        collectionId: parts[1],
        documentId: parts[2]
      });
      return;
    }

    response.end('api - not found');
  });
  server.on('error', (error) => console.error(error));

  server.on('listening', () => {
    log.info('http server listening on ' + server.address().port);
  });

  server.listen(context.options.httpPort, context.options.httpHost);

  return {
    cleanup: () => {
      log.info('http server closed');
      server.close();
    }
  };
}

export default httpModule;
