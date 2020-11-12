const WebSocket = require('ws');

const {
  COMMAND,
  DATA,
  NOTIFY_ON,
  NOTIFY_OFF
} = require('./constants');

function askOnAllNodes (state, data) {
  return Promise.all(
    state.nodes.map(node => node.connection.send(data))
  );
}

function wsHandler (server, state, options) {
  const wss = new WebSocket.Server({
    server,
    verifyClient: options.tls && options.tls.verifyClient
  });

  const listeners = {};

  state.handleMessage = function (message) {
    const triggeredPath = message[2];
    listeners[triggeredPath].forEach(socket => socket.send(JSON.stringify(message)));
  };

  async function addListener (socket, path) {
    listeners[path] = listeners[path] || [];

    if (listeners[path].length === 0) {
      askOnAllNodes(state, {
        [COMMAND]: NOTIFY_ON,
        [DATA]: path
      });
    }

    const listenerIndex = listeners[path].indexOf(socket);
    if (listenerIndex > -1) {
      return;
    }

    listeners[path].push(socket);
  }

  async function removeListener (socket, path) {
    if (!listeners[path]) {
      return;
    }

    const listenerIndex = listeners[path].indexOf(socket);
    if (listenerIndex > -1) {
      listeners[path].splice(listenerIndex, 1);
    }

    if (listeners[path].length === 0) {
      await askOnAllNodes(state, {
        [COMMAND]: NOTIFY_OFF,
        [DATA]: path
      });

      delete listeners[path];
    }
  }

  wss.on('connection', function connection (socket) {
    socket.on('message', function incoming (message) {
      const data = JSON.parse(message);
      Object.keys(data).forEach(key => {
        if (data[key]) {
          addListener(socket, key);
        } else {
          removeListener(socket, key);
        }
      });

      socket.on('close', function incoming () {
        Object.keys(listeners).forEach(key => {
          listeners[key].forEach(listener => {
            if (listener[0] === socket) {
              removeListener(socket, key);
            }
          });
        });
      });
    });
  });

  return wss;
}

module.exports = wsHandler;
