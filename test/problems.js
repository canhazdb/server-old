const httpRequest = require('./helpers/httpRequest');
const createTestCluster = require('./helpers/createTestCluster');

const mapTimes = (times, fn) => Array(times).fill().map((_, index) => fn(index));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// setInterval(console.log, 250);

async function problems2 () {
  const serverCount = 2;
  const interationsPer = 300;
  const cluster = await createTestCluster(serverCount);

  await sleep(2000);

  while (true) {
    console.log('Starting');
    console.time('  posting');
    await Promise.all(mapTimes(interationsPer, index => {
      return httpRequest(`${cluster.nodes[index % serverCount].url}/tests`, {
        method: 'POST',
        data: { a: index }
      });
    }));
    console.timeEnd('  posting');

    console.time('  getting');
    await Promise.all(mapTimes(serverCount, index => {
      return httpRequest(`${cluster.nodes[index].url}/tests`).then(response => response.data);
    }));
    console.timeEnd('  getting');
  }
}

problems2();
