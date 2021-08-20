import logslot from 'logslot';
import tcpocket from 'tcpocket';

import controllers from './controllers/index.js';
import c from './constants.js';

const log = logslot('canhazdb.createHandler');

function handleError (request, response, error) {
  if (error.status) {
    response.reply(error.status);
    return;
  }

  log.error(error);
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

    const origin = requestData[c.SYSTEM]
      ? 'system'
      : requestData[c.INTERNAL] ? 'internal' : 'external';

    const controller = await controllers[origin][request.command];

    if (!controller) {
      socket.activeRequests = socket.activeRequests - 1;
      response.reply(c.STATUS_NOT_FOUND);
      return;
    }

    const result = await controller(context, request.socket, request, response)
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
    socket.locks = [];
    context.clients.push(socket);
    socket.state = {};

    context.emit('client.connected', socket);

    socket.on('close', () => {
      const clientIndex = context.clients.indexOf(socket);
      if (clientIndex === -1) {
        throw new Error('socket not found in client list');
      }

      socket.locks.forEach(lock => {
        lock.cancel();
      });

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
