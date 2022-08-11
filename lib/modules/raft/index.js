import LifeRaft from '@markwylde/liferaft';
import logslot from 'logslot';

import c from '../../constants.js';
import waitUntil from '../../utils/waitUntil.js';

const log = logslot('canhazdb.raft');

async function systemRaftAppendController ({ context, socket, request, response }) {
  const requestData = request.json();

  const isLeader = context.raft.leader === context.thisNode;

  if (!isLeader) {
    return context.appendToRaft(context, requestData[c.COMMAND], requestData[c.DATA]);
  }

  await context.sendToAllNodes(context, c.RAFT_BROADCAST, {
    [c.SYSTEM]: true,
    [c.COMMAND]: requestData[c.COMMAND],
    [c.RESOURCE_ID]: context.raft.log.length,
    [c.DATA]: requestData[c.DATA]
  });

  response.reply(c.STATUS_OK);
}

async function systemRaftBroadcastController ({ context, socket, request, response }) {
  const requestData = request.json();

  const resourceId = requestData[c.RESOURCE_ID];

  const action = requestData[c.DATA];
  context.raft.log[resourceId] = action;

  context.raft.state = context.raft.reducers.reduce((state, fn) => {
    return fn(state, action);
  }, context.raft.state || {});

  context.emit('raft:stateChanged', context.raft.state);

  response.reply(c.STATUS_OK);
}

async function raftModule (context) {
  let controller;
  class CanHazRaft extends LifeRaft {
    initialize () {
      log.debug(`initializing reply socket on port ${this.address}`);

      controller = async ({ request, response }) => {
        const requestData = request.json();
        const data = requestData[c.DATA];

        this.emit('data', data, (responseData) => {
          response.reply(c.RAFT_SYSTEM_PROTO, {
            [c.DATA]: responseData
          });
        });
      };
    }

    async write (packet, callback) {
      if (!this.socket) {
        this.socket = context.nodes.find(node => node.address === this.address);
      }

      try {
        log.debug(`writing packet to socket on port ${this.address}`);
        const request = await this.socket?.client?.send(c.RAFT_SYSTEM_PROTO, {
          [c.SYSTEM]: true,
          [c.DATA]: packet
        });

        if (!request) {
          return;
        }

        const requestData = request.json();
        const data = requestData[c.DATA];

        callback(undefined, data);
      } catch (error) {
        log.warn(`raft failed to write to socket on port ${this.address}`, error);
      }
    }
  }

  context.raft = {
    leader: null,
    log: [],
    reducers: [],
    state: {}
  };

  if (Array.from(new Set(context.options.join)).length === 1) {
    waitUntil(() => {
      return context.thisNode;
    }).then(() => {
      context.raft.leader = context.thisNode;
    });
  }

  context.dispatchToRaft = function (context, data) {
    return context.raft.leader.client.send(c.RAFT_APPEND, {
      [c.SYSTEM]: true,
      [c.DATA]: data
    });
  };

  context.controllers.system.add({
    command: c.RAFT_SYSTEM_PROTO,
    handler: (...args) => controller(...args)
  });

  context.controllers.system.add({
    command: c.RAFT_APPEND,
    handler: (...args) => systemRaftAppendController(...args)
  });

  context.controllers.system.add({
    command: c.RAFT_BROADCAST,
    handler: (...args) => systemRaftBroadcastController(...args)
  });

  const raft = new CanHazRaft(`tls://${context.options.host}:${context.options.port}`, {
    context,
    'election min': 200,
    'election max': 1000,
    heartbeat: 150
  });

  raft.on('heartbeat timeout', function () {
    log.info('heart beat timeout, starting election');
  });

  raft.on('leader change', function (to, from) {
    context.raft.leader = context.nodes.find(node => node.address === to);
    context.emit('raft:leaderChanged', to, from);
    log.info('we have a new leader', { to, from });
  });

  raft.on('leader', function () {
    log.info('this node has been elected as the leader');
  });

  async function join (node) {
    raft.join(node.address);
  }

  context.nodes.forEach(join);
  context.on('node.connected', join);

  return {
    cleanup: () => {
      raft.end();
    }
  };
}

export default raftModule;
