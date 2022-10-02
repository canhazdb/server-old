import c from '../constants.js';

async function isLockedOrWait (context, socket, key, lockId, waitForUnlock) {
  const locked = await context.locks.find(key);

  if (locked.length === 0) {
    return false;
  }

  if (locked[0].id === lockId) {
    return false;
  }

  if (waitForUnlock && !lockId) {
    await context.locks.wait(key);
    return false;
  }

  if (waitForUnlock) {
    return new Promise(resolve => {
      context.locks.on('resolved.' + lockId, () => {
        resolve(false);
      });
    });
  }

  throw Object.assign(
    new Error('canhazdb: locked ' + key.toString()), { status: c.STATUS_LOCKED }
  );
}

export default isLockedOrWait;
