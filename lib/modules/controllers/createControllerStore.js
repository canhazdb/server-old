function createControllerStore () {
  const data = {};

  function add ({ command, priority = 0, conditions, handler }) {
    if (!data[command]) {
      data[command] = [];
    }

    data[command].push({ priority, conditions, handler });

    data[command] = data[command].sort((a, b) => {
      return a.priority < b.priority ? 1 : -1;
    });
  }

  function find (request) {
    if (!data[request.command]) {
      return [];
    }

    const results = data[request.command].filter(controller => {
      if (!controller.conditions) {
        return true;
      }

      const conditionResults = controller.conditions
        .map(condition => condition(request));

      return conditionResults.every(result => result === true);
    });

    return results;
  }

  return {
    data,
    find,
    add
  };
}

export default createControllerStore;
