// import logslot from 'logslot';

import c from '../../../../constants.js';

async function internalNotifyOnController ({ context, socket, request, response }) {
  const requestData = request.json();
  const nodeName = requestData[c.INTERNAL];
  const notifyPath = requestData[c.NOTIFY_PATH];

  const notifiers = context.notify.internalNotifiers;

  const existingNotifier = context.notify.internalNotifiers.find(
    notifier => notifier.nodeName === nodeName && notifier.path === notifyPath
  );

  if (!existingNotifier) {
    notifiers.push({
      path: notifyPath,
      regex: new RegExp(notifyPath),
      nodeName: requestData[c.INTERNAL]
    });
  }

  response.reply(c.STATUS_OK);
}

export default internalNotifyOnController;
