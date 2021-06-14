import logslot from 'logslot';

import tcpocket from 'tcpocket';

import getController from './controllers/index.js';
import c from './constants.js';

const log = logslot('canhazdb.handler');

function createHandler (context) {
  const { port, tls } = context.options;

  return tcpocket.createServer({ port, ...tls }, async function (request, response) {
    // const remoteString = request.socket.remoteAddress + ':' + request.socket.remotePort;
    // logslot('canhazdb.comms').debug('received request ' + remoteString, {
    //   data: request.data
    // });

    const socketState = {
      send: response.send,
      notifiers: []
    };

    if (!request.data) {
      response.reply({
        [c.STATUS]: 400
      });
      return;
    }

    const origin = request.data[c.INTERNAL] ? 'internal' : 'external';
    const controller = await getController(origin, request.data[c.COMMAND]);

    if (!controller) {
      response.reply({
        [c.STATUS]: 404
      });
      return;
    }

    return controller(context, socketState, request, response);
  });
}

export default createHandler;
