function selectRandomItemFromArray (array) {
  if (!array || array.length === 0) {
    return;
  }
  return array[Math.floor(Math.random() * array.length)];
}

module.exports = selectRandomItemFromArray;
