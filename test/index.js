import wtfnode from 'wtfnode';
import basictap from 'basictap';

import('./lib/driver/index.js');
import('./lib/utils/calculateAllowedErrorCount.js');
import('./lib/prepareOptions.js');
import('./modules/controllers/createControllerStore.js');

import('./features/basic.js');
import('./features/http/index.js');
import('./features/raft.js');
import('./features/lock.js');
// import('./features/cluster.js');
// import('./features/conflicts.js');
// import('./features/health.js');
// import('./features/notify.js');
// import('./features/systemCollections.js');

// let timer;
// let testsFinished;

// basictap.on('finish', () => {
//   testsFinished = true;
//   console.log('Finding hanging tasks...');
// });

// process.on('beforeExit', () => {
//   if (testsFinished) {
//     clearInterval(timer);
//     return;
//   }
//   timer = setInterval(() => {
//     if (testsFinished) {
//       clearInterval(timer);
//     }
//     wtfnode.dump();
//   }, 5000);
// });
