function onlyOnce (fn) {
  let isRunning = false;

  return async (...args) => {
    if (isRunning) {
      return;
    }
    isRunning = true;
    await fn(...args);
    isRunning = false;
  };
}

export default onlyOnce;
