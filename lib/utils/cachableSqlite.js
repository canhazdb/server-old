const { promisify } = require('util');

const path = require('path');
const fs = require('fs');

const sqlite = require('sqlite-fp');
const sqlitePromises = require('sqlite-fp/promises');

const cachedConnections = new Map();
const clearTimers = new Map();

function connectWithCreate (filePath, callback) {
  const fileDirectory = path.dirname(filePath);

  fs.mkdir(fileDirectory, { recursive: true }, function (error, result) {
    if (error) {
      throw error;
    }

    sqlite.connect(filePath, callback);
  });
}

function upClearTimer (databaseKeepAlive, databaseFile) {
  const existingTimer = clearTimers.get(databaseFile);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    sqlite.close(cachedConnections.get(databaseFile));
    cachedConnections.delete(databaseFile);
  }, databaseKeepAlive);
  clearTimers.set(databaseFile, timer);
}

function getConnection (databaseKeepAlive, databaseFile, callback) {
  if (cachedConnections.get(databaseFile)) {
    upClearTimer(databaseKeepAlive, databaseFile);
    return callback(null, cachedConnections.get(databaseFile));
  }

  connectWithCreate(databaseFile, function (error, connection) {
    const methods = {
      connection,
      getOne: sqlitePromises.getOne.bind(null, connection),
      getAll: sqlitePromises.getAll.bind(null, connection),
      run: sqlitePromises.run.bind(null, connection),
      close: sqlitePromises.close.bind(null, connection)
    };

    methods.timeOpened = Date.now();
    upClearTimer(databaseKeepAlive, databaseFile);
    if (methods) {
      cachedConnections.set(databaseFile, methods);
    }
    callback(error, methods);
  });
}

function flushCache () {
  clearTimers.forEach(clearTimeout);
  clearTimers.clear();
  cachedConnections.clear();
}

module.exports = {
  getConnection: promisify(getConnection),
  flushCache: promisify(flushCache)
};
