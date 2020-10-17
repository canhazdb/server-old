require('tape').onFailure(() => process.exit(1));

require('./utils/validateAlphaNumericDashDot');
require('./integration');
