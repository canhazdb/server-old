// import logslot from 'logslot';

import c from '../../../../constants.js';

async function internalNotifyController ({ context, socket, request, response }) {
  const requestData = request.json();
  const notifyPath = requestData[c.DATA];

  context.emit('notify.received', notifyPath);

  response.reply(c.STATUS_OK);
}

export default internalNotifyController;
