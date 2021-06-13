import c from '../../constants.js';

async function infoController (context, socketState, request, response) {
  response.reply({
    [c.STATUS]: 200,
    [c.DATA]: {
      nodeName: context.options.nodeName,
      nodes: context.nodes.map(node => ({
        host: node.host,
        port: node.port
      }))
    }
  });

  if (request.data[c.DATA] && request.data[c.DATA].nodes) {
    request.data[c.DATA].nodes.forEach(node => {
      context.join(context, node.host, node.port);
    });
  }
}

export default infoController;
