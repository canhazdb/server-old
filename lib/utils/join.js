import tcpocket from 'tcpocket';
import logslot from 'logslot';

const log = logslot('canhazdb.server');

function join (context, host, port) {
  port = parseInt(port);

  const servername = context.options.joinFromDns;

  const existingNode = context.nodes.find(node => node.host === host && node.port === port);
  if (existingNode) {
    return;
  }

  log.info('joining node', { host, port });

  const client = tcpocket.createClient({
    host,
    port,
    servername,
    ...context.options.tls
  });

  const node = {
    connected: false,
    online: false,
    address: `tls://${host}:${port}`,
    host,
    port,
    client
  };

  node.client.on('message', (message) => {
    context.emit('node.message', message);
  });

  function handleError (error) {
    node.connected = false;
    node.online = false;

    if (node.closing || context.closed) {
      return;
    }

    log.warn('node closed without cause, will reconnect');
    log.debug('node closed', error);
    join(context, host, port);
  }

  // node.client.on('message', data => {
  //   logslot('canhazdb.comms').debug('node message received', { data });
  // });

  node.client.on('connect', () => {
    node.connected = true;
    context.emit('node.connected', node);
  });

  node.client.on('close', () => {
    node.connected = false;
    node.online = false;
    context.emit('node.disconnected', node);
    handleError(Object.assign(new Error('client closed'), { code: 'CLOSED' }));
    delete node.client;
  });

  node.client.on('error', handleError);

  context.nodes = context.nodes.filter(i => {
    return !(i.host === host && i.port === port);
  });

  node.status = 'unhealthy';

  node.close = () => {
    node.online = false;
    node.closing = true;
    return node.client && node.client.close();
  };

  context.nodes.push(node);
  context.nodes.sort();
}

export default join;
