// import logslot from 'logslot';

import c from '../../constants.js';

async function externalNotifyOffController ({ context, socket, request, response }) {
  const requestData = request.json();
  const notifyPath = requestData[c.NOTIFY_PATH];

  const existingNotifierIndex = socket.state.notifiers
    .findIndex(notifier => notifier.path === notifyPath);

  if (existingNotifierIndex > -1) {
    socket.state.notifiers.splice(existingNotifierIndex, 1);
  }

  await context.notify.unwatch(notifyPath);

  response.reply(c.STATUS_OK);
}

export default externalNotifyOffController;
