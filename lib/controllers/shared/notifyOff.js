// import logslot from 'logslot';

import c from '../../constants.js';

function askOnAllNodes (context, command, data) {
  return Promise.all(
    context.nodes.map(node => node.client.send(command, data))
  );
}

const notifyFactory = domain => {
  // const log = logslot('canhazdb.controllers.' + domain + '.notifyOff');

  return async function notifyOffController (context, socketState, request, response) {
    const requestData = request.json();
    const notifyPath = requestData[c.NOTIFY_PATH];

    const notifiers = context.notifiers[domain];

    if (domain === 'external' && notifiers[notifyPath].length === 0) {
      await askOnAllNodes(context, c.NOTIFY_OFF, {
        [c.INTERNAL]: true,
        [c.NOTIFY_PATH]: notifyPath
      });
    }

    notifiers[notifyPath] = [];

    response.reply(c.STATUS_OK);
  };
};

export default notifyFactory;
