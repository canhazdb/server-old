import logslot from 'logslot';
import tcpocket from 'tcpocket';

import c from './constants.js';
import waitUntil from './utils/waitUntil.js';

const log = logslot('canhazdb.createHandler');

function handleError (request, response, error) {
  log.error(error.message, error);
  if (error.status) {
    response.reply(error.status, {
      [c.ERROR]: error?.error?.message || 'Unknown server error'
    });
    return;
  }

  response.reply(c.STATUS_SERVER_ERROR);
}

function createHandler (context) {
  const { port, tls } = context.options;

  const tcpServer = tcpocket.createServer({ port, ...tls }, async function (request, response) {
    const socket = request.socket;
    socket.activeRequests = socket.activeRequests + 1;
    // const remoteString = request.socket.remoteAddress + ':' + request.socket.remotePort;
    // logslot('canhazdb.comms').debug('received request ' + remoteString, {
    //   data: request.data
    // });

    const requestData = request.data ? request.json() : {};

    const requestType = requestData[c.SYSTEM]
      ? 'system'
      : requestData[c.INTERNAL] ? 'internal' : 'external';

    const controllers = await context.controllers[requestType].find(request);

    if (controllers.length === 0) {
      socket.activeRequests = socket.activeRequests - 1;
      response.reply(c.STATUS_NOT_FOUND);
      return;
    }

    const resultPromise = controllers[0].handler({
      context,
      socket: request.socket,
      request,
      response
    });

    if (!resultPromise.catch) {
      throw new Error('createHandler: controllers must return a promise');
    }

    const result = await resultPromise
      .catch(error => {
        handleError(request, response, error);
      })
      .finally(() => {
        socket.activeRequests = socket.activeRequests - 1;
      });

    return result;
  });

  tcpServer.on('connection', (socket) => {
    socket.activeRequests = 0;
    context.clients.push(socket);
    socket.state = {};

    context.emit('client.connected', socket);

    let waitPromise = waitUntil(() => {
      return (
        context.thisNode && context.thisNode.status === 'healthy'
      );
    });

    waitPromise.then(() => {
      waitPromise = false;
      socket.send(c.READY);
    });

    socket.on('close', () => {
      socket.activeRequests = 0;
      waitPromise && waitPromise.cancel();

      const clientIndex = context.clients.indexOf(socket);
      if (clientIndex === -1) {
        throw new Error('socket not found in client list');
      }

      context.clients.splice(clientIndex, 1);
      context.emit('client.closed', socket);
    });

    socket.on('error', error => {
      log.warn('a client disconnected from the server', { code: error.code });
    });
  });

  return tcpServer;
}

export default createHandler;
