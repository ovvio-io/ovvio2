var exec = require('child_process').exec;
const tmp = require('tmp');
const fs = require('fs');
const log = require('electron-log');
const path = require('path');

const execPaths = [
  'executables\\OutlookExport\\OutlookExport.exe',
  'electron\\windows\\executables\\OutlookExport\\bin\\Debug\\OutlookExport.exe',
  'electron\\windows\\executables\\OutlookExport\\bin\\Release\\OutlookExport.exe',
];

let constants;
let execPath;
let isDebugMode;

function setup(pAppPath, pConstants, pIsDedugMode) {
  execPath = getExecPath(pAppPath);
  constants = pConstants;
  isDebugMode = pIsDedugMode;
}

var isRunning = false;

function run(subject, body, callback) {
  if (isRunning) {
    log.debug('Outlook export Already running');
    callback(constants.ALREADY_RUNNING);
    return;
  }

  isRunning = true;

  try {
    internalRun(subject, body, callback);
  } catch (err) {
    log.error('Outlook export run threw an error: ', err);
    runCompleted(callback, constants.ERROR);
  }
}

function internalRun(subject, body, callback) {
  log.info(`Outlook export started: ${subject}`);

  if (execPath == null) {
    log.error('Failed to find exec path');
    runCompleted(callback, constants.ERROR);
    return;
  }

  if (process.platform !== 'win32') {
    log.error('Outlook export only works for windows platform');
    runCompleted(callback, constants.NOT_WINDOWS);
    return;
  }

  log.debug(`Exec path found: ${execPath}`);

  //Create file data
  const data = JSON.stringify({ subject, body });

  //Create temp dir
  tmp.dir({ unsafeCleanup: true }, (err, tempDir, cleanupCallback) => {
    if (err) {
      log.error('Create dir failed. ', err);
      runCompleted(callback, constants.ERROR);
      return;
    }

    log.debug('Outlook Export Temp Dir Created:', tempDir);

    const filePath = path.join(tempDir, 'input.json');
    fs.writeFile(filePath, data, { encoding: 'utf8' }, err => {
      if (err) {
        log.error('Write to temp file failed. ', err);
        cleanupCallback();
        runCompleted(callback, constants.ERROR);
        return;
      }
      const debugArg = isDebugMode ? '1' : '';
      exec(
        `"${execPath}" "${filePath}" ${debugArg}`,
        { timeout: 15 * 1000 },
        (e, stdout, stderr) => {
          cleanupCallback();

          if (stdout) {
            if (stdout.endsWith('\n')) {
              stdout = stdout.slice(0, stdout.length - 1);
            }
            log.debug('Exec stdout: ', stdout);
          }

          if (stderr) {
            if (stderr.endsWith('\n')) {
              stderr = stderr.slice(0, stderr.length - 1);
            }
            log.error('Exec stderr: ', stderr);
          }

          if (e) {
            log.error('Exec returned with error.', e);
            if (e.code) {
              runCompleted(callback, e.code);
              return;
            }

            runCompleted(callback, constants.ERROR);
            return;
          }

          log.info('Outlook export success');
          runCompleted(callback, constants.SUCCESS);
        }
      );
    });
  });
}

function runCompleted(callback, result) {
  callback(result);
  isRunning = false;
}

function getExecPath(appPath) {
  appPath = appPathCleanUp(appPath);

  for (let i = 0; i < execPaths.length; i++) {
    const fullPath = path.join(appPath, execPaths[i]);

    if (fs.existsSync(fullPath)) {
      log.info('Exec path found: ', fullPath);
      return fullPath;
    }

    log.debug(`executable not in: ${fullPath}`);
  }

  log.warn('Exec path not found');
  return null;
}

function appPathCleanUp(appPath) {
  const pathSplit = appPath.split(path.sep);
  let pathLength = pathSplit.length;
  if (pathSplit[pathLength - 1] === 'app.asar') {
    pathLength--;
  }
  if (pathSplit[pathLength - 1] === 'resources') {
    pathLength--;
  }
  appPath = pathSplit.slice(0, pathLength).join(path.sep);

  return appPath;
}

module.exports = { run, setup };
