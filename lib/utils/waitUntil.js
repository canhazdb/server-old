function waitUntil (fn) {
  let timer;
  let storedResolve;
  function attempt (resolve) {
    const value = fn();

    if (value) {
      resolve(value);
      return;
    }

    timer = setTimeout(() => attempt(resolve), 1);
  }

  const promise = new Promise((resolve, reject) => {
    storedResolve = resolve;
    attempt(resolve);
  });

  promise.cancel = () => {
    storedResolve();
    clearTimeout(timer);
  };

  return promise;
}

export default waitUntil;
