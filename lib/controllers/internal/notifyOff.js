// import logslot from 'logslot';

import c from '../../constants.js';

async function internalNotifyOffController (context, socket, request, response) {
  const requestData = request.json();
  const notifyPath = requestData[c.NOTIFY_PATH];

  const notifiers = context.notify.internalNotifiers;

  const existingNotifierIndex = notifiers.findIndex(notifier => notifier.path === notifyPath);

  if (existingNotifierIndex > -1) {
    notifiers.splice(existingNotifierIndex, 1);
  }

  response.reply(c.STATUS_OK);
}

export default internalNotifyOffController;
