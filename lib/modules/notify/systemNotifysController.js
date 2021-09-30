import c from '../../constants.js';

async function systemCollectionController ({ context, socket, request, response }) {
  response.reply(c.STATUS_OK, {
    [c.DATA]: Object.keys(context.notify.watching).reduce((result, notifyPath) => {
      result.push({
        notifyPath: notifyPath
      });
      return result;
    }, [])
  });
}

export default systemCollectionController;
