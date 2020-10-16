const test = require('tape');

const validateAlphaNumericDashDot = require('../../lib/utils/validateAlphaNumericDashDot');

test('correct', t => {
  t.plan(1);

  const result = validateAlphaNumericDashDot('correct');

  t.ok(result);
});

test('wrong', t => {
  t.plan(1);

  const result = validateAlphaNumericDashDot('cor$rect');

  t.notOk(result);
});
