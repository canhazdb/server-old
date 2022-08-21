import log from 'why-is-node-running';
import basictap from 'basictap';

let timer;
let testsFinished;

basictap.on('finish', () => {
  testsFinished = true;
  console.log('Finding hanging tasks...');
  setTimeout(() => {
    log();
  }, 5000);
});

process.on('beforeExit', () => {
  if (testsFinished) {
    clearInterval(timer);
    return;
  }
  timer = setInterval(() => {
    if (testsFinished) {
      clearInterval(timer);
    }
    log();
  }, 5000);
});
