import logslot from 'logslot';

import c from '../../constants.js';
import systemNotifysController from './systemNotifysController.js';
import insertDefaultDocument from '../../utils/insertDefaultDocument.js';

const log = logslot('canhazdb.notify');

function askOnAllNodes (context, command, data) {
  return Promise.all(
    context.nodes.map(node => {
      return node.client && node.client.send(command, data).catch(error => {
        if (error.message.includes('client disconnected')) {
          log.warn(`could not send ${c[command]} to node('${node.name}') because it was not connected`);
        } else {
          throw error;
        }
      });
    })
  );
}

async function notifyModule (context) {
  context.notify = {
    internalNotifiers: [],
    watching: {},

    watch: notifyPath => {
      log.info('sending NOTIFY_ON to all nodes', { notifyPath });
      context.notify.watching[notifyPath] = (context.notify.watching[notifyPath] || 0) + 1;
      return askOnAllNodes(context, c.NOTIFY_ON, {
        [c.INTERNAL]: context.thisNode.name,
        [c.NOTIFY_PATH]: notifyPath
      });
    },

    unwatch: notifyPath => {
      log.info('sending NOTIFY_OFF to all nodes', { notifyPath });
      context.notify.watching[notifyPath] = (context.notify.watching[notifyPath] || 0) - 1;
      if (context.notify.watching[notifyPath] < 0) {
        context.notify.watching[notifyPath] = 0;
      }

      return askOnAllNodes(context, c.NOTIFY_OFF, {
        [c.INTERNAL]: context.thisNode.name,
        [c.NOTIFY_PATH]: notifyPath
      });
    }
  };

  context.controllers.external.add({
    command: c.GET,
    priority: 10,
    conditions: [
      (request) => {
        const data = request.json();
        return data[c.COLLECTION_ID] === 'system.notifys';
      }
    ],
    handler: systemNotifysController
  });

  context.controllers.external.add({
    command: c.NOTIFY_OFF,
    handler: context.controllers.rejectWhenUnhealthy(
      (await import('./controllers/external/notifyOff.js')).default
    )
  });

  context.controllers.external.add({
    command: c.NOTIFY_ON,
    handler: context.controllers.rejectWhenUnhealthy(
      (await import('./controllers/external/notifyOn.js')).default
    )
  });

  context.controllers.internal.add({
    command: c.NOTIFY_OFF,
    handler: (await import('./controllers/internal/notifyOff.js')).default
  });

  context.controllers.internal.add({
    command: c.NOTIFY_ON,
    handler: (await import('./controllers/internal/notifyOn.js')).default
  });

  context.controllers.internal.add({
    command: c.NOTIFY,
    handler: (await import('./controllers/internal/notify.js')).default
  });

  context.info.generators.push(() => {
    return {
      internalNotifiers: context.notify.internalNotifiers
    };
  });

  context.on('node.infoReceived', node => {
    node.info.internalNotifiers.forEach(newNotifier => {
      const existingNotifier = context.notify.internalNotifiers.find(
        notifier => notifier.nodeName === newNotifier.nodeName && notifier.path === newNotifier.path
      );

      if (!existingNotifier) {
        context.notify.internalNotifiers.push(newNotifier);
      }
    });
  });

  context.on('client.closed', socket => {
    socket.state.notifiers.forEach(notifier => {
      context.notify.unwatch(notifier.path);
    });
  });

  context.on('client.connected', socket => {
    socket.state.notifiers = [];

    context.on('notify.received', notifyPath => {
      const notifiers = socket.state.notifiers.filter(
        notifier => notifyPath.match(notifier.regex)
      );

      notifiers.forEach(notifier => {
        notifier.handler(notifyPath);
      });
    });
  });

  context.on('notify', notifyPath => {
    const notifiers = context.notify.internalNotifiers.filter(
      notifier => notifyPath.match(notifier.regex)
    );

    notifiers.forEach(notifier => {
      const node = context.nodes.find(node => node.name === notifier.nodeName);
      node.client.send(c.NOTIFY, {
        [c.INTERNAL]: context.thisNode.name,
        [c.DATA]: notifyPath
      }).catch(error => {
        if (error.message.includes('client disconnected')) {
          log.warn('could not send notify because client was not connected');
        } else {
          throw error;
        }
      });
    });
  });

  context.on('ready', () => {
    insertDefaultDocument(context, 'system.collections', {
      id: 'system.notifys',
      collectionId: 'system.notifys',
      documentCount: 0
    });
  });
}

export default notifyModule;
