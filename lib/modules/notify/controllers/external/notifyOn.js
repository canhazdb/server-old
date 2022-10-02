// import logslot from 'logslot';

import c from '../../../../constants.js';

async function externalNotifyOnController ({ context, socket, request, response }) {
  const requestData = request.json();
  const notifyPath = requestData[c.NOTIFY_PATH];

  socket.state.notifiers.push({
    path: notifyPath,
    regex: new RegExp(notifyPath),
    handler: path => {
      response.send(c.NOTIFY, { [c.DATA]: path });
    }
  });

  await context.notify.watch(notifyPath);

  response.reply(c.STATUS_OK);
}

export default externalNotifyOnController;
