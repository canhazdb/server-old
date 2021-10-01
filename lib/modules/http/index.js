import chalk from 'chalk';
import http2 from 'http2';
import servatron from 'servatron/http.js';
import logslot from 'logslot';
import c from '../../constants.js';

const log = logslot('canhazdb.http');

const staticHandler = servatron({
  directory: './web',
  spa: true,
  spaIndex: 'index.html'
});

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

async function handleGetCollection (context, request, response, { collectionId }) {
  const getResult = await context.thisNode.client.send(c.GET, {
    [c.COLLECTION_ID]: collectionId
  });

  const data = getResult.json()[c.DATA];

  response.end(JSON.stringify(data, null, 2));
}

function httpModule (context) {
  const server = http2.createSecureServer({
    ...context.options.tls,
    allowHTTP1: true
  }, function (request, response) {
    log.info('request received');
    const path = request.url || request.headers[':path'];

    if (path.startsWith('/api')) {
      const parts = path.split('/');

      if (parts.length === 3) {
        handleGetCollection(context, request, response, {
          collectionId: parts[2]
        });
        return;
      }

      if (parts.length === 4) {
        handleGetDocument(context, request, response, {
          collectionId: parts[2],
          documentId: parts[3]
        });
        return;
      }

      response.end('api - not found');

      return;
    }

    staticHandler(request, response);
  });
  server.on('error', (error) => console.error(error));

  server.on('listening', () => {
    log.info('web server listening on ' + server.address().port);
  });

  server.listen(context.options.httpPort, context.options.httpHost);

  return {
    cleanup: () => {
      log.info('web server closed');
      server.close();
    }
  };
}

export default httpModule;
