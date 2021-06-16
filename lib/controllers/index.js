import c from '../constants.js';
import internalInfo from './internal/info.js';
import internalPost from './internal/post.js';
import internalGet from './internal/get.js';
import externalInfo from './external/info.js';
import externalPost from './external/post.js';
import externalGet from './external/get.js';

const controllers = {
  internal: {
    [c.INFO]: internalInfo,
    [c.POST]: internalPost,
    [c.GET]: internalGet
  },
  external: {
    [c.INFO]: externalInfo,
    [c.POST]: externalPost,
    [c.GET]: externalGet
  }
};

export default controllers;
