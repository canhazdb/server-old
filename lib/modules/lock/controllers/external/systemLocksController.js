import c from '../../../../constants.js';

async function systemLocksController ({ context, socket, request, response }) {
  response.reply(c.STATUS_OK, {
    [c.DATA]: context.locks.state.locks.map(lock => {
      return {
        id: lock[0],
        keys: lock[1]
      };
    })
  });
}

export default systemLocksController;
