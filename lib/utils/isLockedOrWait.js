import c from '../constants.js';

async function isLockedOrWait (context, socket, key, lockId, waitForUnlock) {
  const locked = await context.locks.find(key);

  if (locked.length === 0) {
    return false;
  }

  if (locked[0].id === lockId) {
    return false;
  }

  if (waitForUnlock) {
    await context.locks.wait(key);
    return false;
  }

  throw Object.assign(
    new Error('canhazdb: locked ' + key.toString()), { status: c.STATUS_LOCKED }
  );
}

export default isLockedOrWait;
