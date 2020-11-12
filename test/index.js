require('tape').onFailure(() => process.exit(1));
require('tape').onFinish(() => process.exit(0));

require('../utils/validateAlphaNumericDashDot');
require('./client');
require('./notify');
require('./locking');
require('./integration');
