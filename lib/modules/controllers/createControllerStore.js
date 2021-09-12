function createControllerStore () {
  const data = {};

  function add ({ command, index, conditions, handler }) {
    if (!data[command]) {
      data[command] = [];
    }

    data[command].splice(index || 0, 0, { conditions, handler });
  }

  function find (request) {
    if (!data[request.command]) {
      return [];
    }

    return data[request.command].filter(controller => {
      if (!controller.conditions) {
        return true;
      }

      const conditionResults = controller.conditions
        .map(condition => condition({ request }));

      return conditionResults.every(result => result === true);
    });
  }

  return {
    data,
    find,
    add
  };
}

export default createControllerStore;
