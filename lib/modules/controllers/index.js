import c from '../../constants.js';

import createControllerStore from './createControllerStore.js';

import internalInfo from './infoController.js';

function rejectWhenUnhealthy (fn) {
  return async (options) => {
    const { context, response } = options;
    if (context.thisNode.status === 'unhealthy') {
      response.reply(c.STATUS_SERVER_UNHEALTHY);
      return;
    }

    return fn(options);
  };
}

function controllersModule (context) {
  context.controllers = {
    system: createControllerStore(),
    internal: createControllerStore(),
    external: createControllerStore(),

    rejectWhenUnhealthy
  };

  context.controllers.system.add({
    command: c.INFO,
    handler: internalInfo
  });
}

export default controllersModule;
