// import logslot from 'logslot';

import c from '../../constants.js';

async function internalNotifyOnController (context, socket, request, response) {
  const requestData = request.json();
  const notifyPath = requestData[c.NOTIFY_PATH];

  const notifiers = context.notify.internalNotifiers;

  notifiers.push({
    path: notifyPath,
    regex: new RegExp(notifyPath),
    nodeName: requestData[c.INTERNAL]
  });

  response.reply(c.STATUS_OK);
}

export default internalNotifyOnController;
