import c from '../../constants.js';

async function systemNodesController ({ context, socket, request, response }) {
  response.reply(c.STATUS_OK, {
    [c.DATA]: context.nodes.map(node => {
      return {
        ...node,
        client: undefined
      };
    })
  });
}

export default systemNodesController;
