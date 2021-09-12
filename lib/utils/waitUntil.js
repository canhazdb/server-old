function waitUntil (fn) {
  let timer;
  function attempt (resolve) {
    const value = fn();

    if (value) {
      resolve(value);
      return;
    }

    timer = setTimeout(() => attempt(resolve), 1);
  }

  const promise = new Promise((resolve, reject) => {
    attempt(resolve);
  });

  promise.cancel = () => {
    clearTimeout(timer);
  };

  return promise;
}

export default waitUntil;
