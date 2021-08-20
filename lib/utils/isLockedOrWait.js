import c from '../constants.js';

async function isLockedOrWait (context, socket, keys, lockId, waitForUnlock) {
  const locked = context.locks.check(keys);

  if (!locked) {
    return false;
  }

  if (locked && locked[0] === lockId) {
    return false;
  }

  if (waitForUnlock) {
    const lock = context.locks.wait(keys);
    socket.locks.push(lock);
    await lock;
    return false;
  }

  throw Object.assign(
    new Error('canhazdb: locked ' + keys.toString()), { status: c.STATUS_LOCKED }
  );
}

export default isLockedOrWait;
