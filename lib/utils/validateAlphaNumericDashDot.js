const validateAlphaNumericDashDot = (value) => {
  const matches = value.match(/[^a-z0-9-.]/gi, '');
  if (matches) {
    return false;
  }

  return true;
};

export default validateAlphaNumericDashDot;
