import c from '../../constants.js';

import internalPost from './controllers/internal/post.js';
import internalCount from './controllers/internal/count.js';
import internalGet from './controllers/internal/get.js';
import internalPut from './controllers/internal/put.js';
import internalPatch from './controllers/internal/patch.js';
import internalDelete from './controllers/internal/delete.js';

import externalPost from './controllers/external/post.js';
import externalCount from './controllers/external/count.js';
import externalGet from './controllers/external/get.js';
import externalPut from './controllers/external/put.js';
import externalPatch from './controllers/external/patch.js';
import externalDelete from './controllers/external/delete.js';

function crudModule (context) {
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

  // External
  context.controllers.external.add({
    command: c.POST,
    conditions: [],
    handler: context.controllers.rejectWhenUnhealthy(externalPost)
  });
  context.controllers.external.add({
    command: c.COUNT,
    conditions: [],
    handler: context.controllers.rejectWhenUnhealthy(externalCount)
  });
  context.controllers.external.add({
    command: c.GET,
    conditions: [],
    handler: context.controllers.rejectWhenUnhealthy(externalGet)
  });
  context.controllers.external.add({
    command: c.PUT,
    conditions: [],
    handler: context.controllers.rejectWhenUnhealthy(externalPut)
  });
  context.controllers.external.add({
    command: c.PATCH,
    conditions: [],
    handler: context.controllers.rejectWhenUnhealthy(externalPatch)
  });
  context.controllers.external.add({
    command: c.DELETE,
    conditions: [],
    handler: context.controllers.rejectWhenUnhealthy(externalDelete)
  });
}

export default crudModule;
