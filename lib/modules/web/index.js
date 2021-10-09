import path from 'path';
import http2 from 'http2';
import axios from 'axios';
import https from 'https';
import servatron from 'servatron/http.js';
import logslot from 'logslot';
import build from './build.js';
import finalStream from 'final-stream';
import cryptoRandomString from 'crypto-random-string';

const log = logslot('canhazdb.web');

const staticHandler = servatron({
  directory: './web/public',
  spa: true,
  spaIndex: 'index.html'
});

function webModule (context) {
  if (!context.options.webPort || !context.options.webHost) {
    return;
  }

  const authentications = {};

  build();

  const server = http2.createSecureServer({
    ...context.options.tls,
    allowHTTP1: true,
    requestCert: false
  }, async function (request, response) {
    const body = await finalStream(request).then(JSON.parse).catch(() => null);
    const urlPath = request.url || request.headers[':path'];

    if (urlPath.startsWith('/api/')) {
      log.info('request received to ' + urlPath);
      if (urlPath === '/api/settings') {
        response.end(
          JSON.stringify({
            ca: {
              name: path.basename(context.options.tlsCa),
              data: context.options.tls.ca.toString()
            }
          })
        );
        return;
      }

      if (urlPath === '/api/authenticate') {
        const httpsAgent = new https.Agent({
          key: body.privateKey.data,
          cert: body.cert.data,
          ca: [body.ca.data]
        });

        try {
          await axios(`https://localhost:${context.options.httpPort}/api/system.collections`, {
            httpsAgent
          });

          const token = cryptoRandomString({ length: 36 });
          authentications[token] = {
            body,
            httpsAgent
          };
          response.end(
            JSON.stringify({
              token
            })
          );
        } catch (error) {
          log.warn('failed to authenticate', { error: error.message });
          response.end(
            JSON.stringify({
              error: error.message
            })
          );
        }
        return;
      }

      if (urlPath.startsWith('/api/authenticate/')) {
        const token = urlPath.substr('/api/authenticate/'.length);

        try {
          await axios(`https://localhost:${context.options.httpPort}/api/system.collections`, {
            httpsAgent: authentications[token]?.httpsAgent
          });

          response.end(
            JSON.stringify(authentications[request.headers.authorisation].body)
          );
        } catch (error) {
          log.warn('failed to authenticate', { error });
          response.writeHead(401);
          response.end(
            JSON.stringify({
              error: error.message
            })
          );
        }
        return;
      }

      if (request.headers.authorisation) {
        try {
          const proxiedResponse = await axios(`https://localhost:${context.options.httpPort}${urlPath}`, {
            method: request.method,
            httpsAgent: authentications[request.headers.authorisation]?.httpsAgent
          });
          response.end(
            JSON.stringify(proxiedResponse.data)
          );
          return;
        } catch (error) {
          log.warn('failed to authenticate', { error });
          response.writeHead(401);
          response.end(
            JSON.stringify({
              error: error.message
            })
          );
        }
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

  server.listen(context.options.webPort, context.options.webHost);

  return {
    cleanup: () => {
      log.info('web server closed');
      server.close();
    }
  };
}

export default webModule;
