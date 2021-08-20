import c from '../constants.js';
import internalInfo from './internal/info.js';
import internalPost from './internal/post.js';
import internalCount from './internal/count.js';
import internalGet from './internal/get.js';
import internalPut from './internal/put.js';
import internalPatch from './internal/patch.js';
import internalDelete from './internal/delete.js';
import internalLock from './internal/lock.js';
import internalUnlock from './internal/unlock.js';

import externalPost from './external/post.js';
import externalCount from './external/count.js';
import externalGet from './external/get.js';
import externalPut from './external/put.js';
import externalPatch from './external/patch.js';
import externalDelete from './external/delete.js';
import externalLock from './external/lock.js';
import externalUnlock from './external/unlock.js';

import externalNotifyOn from './external/notifyOn.js';
import externalNotifyOff from './external/notifyOff.js';
import internalNotifyOn from './internal/notifyOn.js';
import internalNotifyOff from './internal/notifyOff.js';
import internalNotify from './internal/notify.js';

function rejectWhenUnhealthy (fn) {
  return async (context, socket, request, response) => {
    if (context.thisNode.status === 'unhealthy') {
      response.reply(c.STATUS_SERVER_UNHEALTHY);
      return;
    }

    return fn(context, socket, request, response);
  };
}

const controllers = {
  system: {
    [c.INFO]: internalInfo
  },

  internal: {
    [c.POST]: rejectWhenUnhealthy(internalPost),
    [c.COUNT]: rejectWhenUnhealthy(internalCount),
    [c.GET]: rejectWhenUnhealthy(internalGet),
    [c.PUT]: rejectWhenUnhealthy(internalPut),
    [c.PATCH]: rejectWhenUnhealthy(internalPatch),
    [c.DELETE]: rejectWhenUnhealthy(internalDelete),

    [c.LOCK]: rejectWhenUnhealthy(internalLock),
    [c.UNLOCK]: rejectWhenUnhealthy(internalUnlock),

    [c.NOTIFY]: rejectWhenUnhealthy(internalNotify),
    [c.NOTIFY_ON]: rejectWhenUnhealthy(internalNotifyOn),
    [c.NOTIFY_OFF]: rejectWhenUnhealthy(internalNotifyOff)
  },

  external: {
    [c.POST]: rejectWhenUnhealthy(externalPost),
    [c.COUNT]: rejectWhenUnhealthy(externalCount),
    [c.GET]: rejectWhenUnhealthy(externalGet),
    [c.PUT]: rejectWhenUnhealthy(externalPut),
    [c.PATCH]: rejectWhenUnhealthy(externalPatch),
    [c.DELETE]: rejectWhenUnhealthy(externalDelete),

    [c.LOCK]: rejectWhenUnhealthy(externalLock),
    [c.UNLOCK]: rejectWhenUnhealthy(externalUnlock),

    [c.NOTIFY_ON]: rejectWhenUnhealthy(externalNotifyOn),
    [c.NOTIFY_OFF]: rejectWhenUnhealthy(externalNotifyOff)
  }
};

export default controllers;
