import c from '../../constants.js';

import createControllerStore from './createControllerStore.js';

import internalInfo from '../../controllers/internal/info.js';
import internalPost from '../../controllers/internal/post.js';
import internalCount from '../../controllers/internal/count.js';
import internalGet from '../../controllers/internal/get.js';
import internalPut from '../../controllers/internal/put.js';
import internalPatch from '../../controllers/internal/patch.js';
import internalDelete from '../../controllers/internal/delete.js';

import externalPost from '../../controllers/external/post.js';
import externalCount from '../../controllers/external/count.js';
import externalGet from '../../controllers/external/get.js';
import externalPut from '../../controllers/external/put.js';
import externalPatch from '../../controllers/external/patch.js';
import externalDelete from '../../controllers/external/delete.js';

import externalNotifyOn from '../../controllers/external/notifyOn.js';
import externalNotifyOff from '../../controllers/external/notifyOff.js';
import internalNotifyOn from '../../controllers/internal/notifyOn.js';
import internalNotifyOff from '../../controllers/internal/notifyOff.js';
import internalNotify from '../../controllers/internal/notify.js';

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
    external: createControllerStore()
  };

  // System
  context.controllers.system.add({
    command: c.INFO,
    handler: internalInfo
  });

  // Internal
  context.controllers.internal.add({
    command: c.POST,
    conditions: [],
    handler: internalPost
  });
  context.controllers.internal.add({
    command: c.COUNT,
    conditions: [],
    handler: internalCount
  });
  context.controllers.internal.add({
    command: c.GET,
    conditions: [],
    handler: internalGet
  });
  context.controllers.internal.add({
    command: c.PUT,
    conditions: [],
    handler: internalPut
  });
  context.controllers.internal.add({
    command: c.PATCH,
    conditions: [],
    handler: internalPatch
  });
  context.controllers.internal.add({
    command: c.DELETE,
    conditions: [],
    handler: internalDelete
  });

  context.controllers.internal.add({
    command: c.NOTIFY,
    conditions: [],
    handler: internalNotify
  });
  context.controllers.internal.add({
    command: c.NOTIFY_ON,
    conditions: [],
    handler: internalNotifyOn
  });
  context.controllers.internal.add({
    command: c.NOTIFY_OFF,
    conditions: [],
    handler: internalNotifyOff
  });

  // External
  context.controllers.external.add({
    command: c.POST,
    conditions: [],
    handler: rejectWhenUnhealthy(externalPost)
  });
  context.controllers.external.add({
    command: c.COUNT,
    conditions: [],
    handler: rejectWhenUnhealthy(externalCount)
  });
  context.controllers.external.add({
    command: c.GET,
    conditions: [],
    handler: rejectWhenUnhealthy(externalGet)
  });
  context.controllers.external.add({
    command: c.PUT,
    conditions: [],
    handler: rejectWhenUnhealthy(externalPut)
  });
  context.controllers.external.add({
    command: c.PATCH,
    conditions: [],
    handler: rejectWhenUnhealthy(externalPatch)
  });
  context.controllers.external.add({
    command: c.DELETE,
    conditions: [],
    handler: rejectWhenUnhealthy(externalDelete)
  });

  context.controllers.external.add({
    command: c.NOTIFY_ON,
    conditions: [],
    handler: rejectWhenUnhealthy(externalNotifyOn)
  });
  context.controllers.external.add({
    command: c.NOTIFY_OFF,
    conditions: [],
    handler: rejectWhenUnhealthy(externalNotifyOff)
  });
}

export default controllersModule;
