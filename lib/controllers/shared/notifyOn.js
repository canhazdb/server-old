// import logslot from 'logslot';

import c from '../../constants.js';

function askOnAllNodes (context, command, data) {
  return Promise.all(
    context.nodes.map(node => node.client.send(command, data))
  );
}

const notifyFactory = domain => {
  // const log = logslot('canhazdb.controllers.' + domain + '.notifyOn');

  return async function notifyOnController (context, socketState, request, response) {
    const requestData = request.json();
    const notifyPath = requestData[c.NOTIFY_PATH];

    const notifiers = context.notifiers[domain];

    notifiers[notifyPath] = notifiers[notifyPath] || [];

    if (!notifiers[notifyPath].regex) {
      notifiers[notifyPath].regex = new RegExp(notifyPath);
    }

    if (domain === 'external' && notifiers[notifyPath].length === 0) {
      await askOnAllNodes(context, c.NOTIFY_ON, {
        [c.INTERNAL]: true,
        [c.NOTIFY_PATH]: notifyPath
      });
    }

    const listenerIndex = notifiers[notifyPath].indexOf(response);
    if (listenerIndex === -1) {
      notifiers[notifyPath].push(
        (path) => response.send(c.STATUS_OK, { [c.DATA]: path })
      );
    }

    response.reply(c.STATUS_OK);
  };
};

export default notifyFactory;
