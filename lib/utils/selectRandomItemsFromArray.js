function selectRandomItemFromArray (array, count) {
  if (!array || array.length === 0) {
    return;
  }

  const randomArray = [...array].sort(() => 0.5 - Math.random());
  return randomArray.slice(0, count);
}

export default selectRandomItemFromArray;
