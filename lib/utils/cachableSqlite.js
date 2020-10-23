const path = require('path');
const fs = require('fs').promises;

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

const cachedConnections = new Map();
const clearTimers = new Map();

async function connectWithCreate (filename) {
  const directoryName = path.dirname(filename);
  await fs.mkdir(directoryName, { recursive: true });

  return sqlite.open({
    filename,
    driver: sqlite3.Database
  });
}

function upClearTimer (databaseKeepAlive, databaseFile) {
  const existingTimer = clearTimers.get(databaseFile);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    const db = cachedConnections.get(databaseFile);
    db.close();

    cachedConnections.delete(databaseFile);
  }, databaseKeepAlive);
  clearTimers.set(databaseFile, timer);
}

async function getConnection (databaseKeepAlive, databaseFile) {
  if (cachedConnections.get(databaseFile)) {
    upClearTimer(databaseKeepAlive, databaseFile);
    return cachedConnections.get(databaseFile);
  }

  const connection = await connectWithCreate(databaseFile);

  connection.timeOpened = Date.now();
  upClearTimer(databaseKeepAlive, databaseFile);

  cachedConnections.set(databaseFile, connection);

  return connection;
}

function flushCache () {
  clearTimers.forEach(clearTimeout);
  clearTimers.clear();
  cachedConnections.clear();
}

module.exports = {
  getConnection,
  flushCache
};
