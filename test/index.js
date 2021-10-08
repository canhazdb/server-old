// import wtfnode from 'wtfnode';

import('./lib/driver/index.js');
import('./lib/utils/calculateAllowedErrorCount.js');
import('./lib/prepareOptions.js');

import('./features/basic.js');
import('./features/http.js');
import('./features/cluster.js');
import('./features/conflicts.js');
import('./features/health.js');
import('./features/notify.js');
import('./features/lock.js');
import('./features/systemCollections.js');

import('./modules/controllers/createControllerStore.js');

// process.on('beforeExit', () => {
//   setTimeout(() => {
//     wtfnode.dump();
//   }, 5000);
// });
