import c from '../../../../constants.js';

async function systemLocksController ({ context, socket, request, response }) {
  response.reply(c.STATUS_OK, {
    [c.DATA]: context.locks.queue
  });
}

export default systemLocksController;
