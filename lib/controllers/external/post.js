import logslot from 'logslot';
import { v4 as uuid } from 'uuid';

import c from '../../constants.js';
import selectRandomItemsFromArray from '../../utils/selectRandomItemsFromArray.js';

const log = logslot('canhazdb.controllers.external.post');

async function postController (context, socket, request, response) {
  const nodes = selectRandomItemsFromArray(
    context.nodes,
    Math.min(context.settings.replicas, context.nodes.length)
  );

  const requestData = request.json();

  const document = {
    ...requestData[c.DATA],
    id: uuid()
  };

  const collectionId = requestData[c.COLLECTION_ID];

  const results = await Promise.all(
    nodes.map(node => {
      return node.client.send(c.POST, {
        [c.LOCK_ID]: requestData[c.LOCK_ID],
        [c.LOCK_STRATEGY]: requestData[c.LOCK_STRATEGY],
        [c.COLLECTION_ID]: collectionId,
        [c.REPLICATED_NODES]: nodes.map(node => node.name),
        [c.DATA]: document,
        [c.INTERNAL]: true
      }).catch(error => {
        log.warn('node send failed', error);
      });
    })
  );

  const errors = results.filter(result => {
    return !result || result.command !== c.STATUS_CREATED;
  });

  if (errors.length > 0) {
    response.reply((errors[0] && errors[0].command) || c.STATUS_SERVER_ERROR, errors.data);
    return;
  }

  response.reply(c.STATUS_CREATED, {
    [c.DATA]: document
  });
}

export default postController;
