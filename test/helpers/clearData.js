const fs = require('fs');

async function clearData () {
  try {
    await fs.promises.rmdir('./canhazdata', { recursive: true });
  } catch (error) {
    console.log(error);
  }
}

module.exports = clearData;
