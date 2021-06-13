import c from '../constants.js';

const controllers = {
  internal: {
    [c.INFO]: './internal/info.js',
    [c.POST]: './internal/post.js',
    [c.GET]: './internal/get.js'
  },
  external: {
    [c.INFO]: './external/info.js',
    [c.POST]: './external/post.js',
    [c.GET]: './external/get.js'
  }
};

async function getController (origin, command) {
  const controllerFile = controllers[origin][command];
  if (!controllerFile) {
    return;
  }

  const controllerModule = await import(controllerFile);
  return controllerModule.default;
}

export default getController;
