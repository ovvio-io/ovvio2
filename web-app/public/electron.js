const fs = require('fs');
const log = require('electron-log');
const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const { ipcMain, shell, Menu, MenuItem } = require('electron');
const { autoUpdater } = require('electron-updater');
autoUpdater.allowDowngrade = true;

const { dialog } = require('electron');

const path = require('path');
const url = require('url');

const outlookExport = require('./outlookExport.js');
var exec = require('child_process').exec;

const isMac = process.platform === 'darwin';
const { compressToEncodedURIComponent } = require('lz-string');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let constants;

// To run locally switch the following lines
// run ovv-dev run -p web-app to run the react server
// and run `yarn run electron` in the web-app folder
const START_URL = process.env.ELECTRON_START_URL;
// const START_URL = 'http://localhost:3000/';

const isDebug = !!START_URL;

var processSSOArgs;

//Set File Log Level
if (
  process.env.REACT_APP_ENV_NAME != null &&
  !process.env.REACT_APP_ENV_NAME.toLowerCase().startsWith('dev')
) {
  log.transports.file.level = 'info';
}

ipcMain.on('on-app-loaded', (event, args) => {
  log.debug('on-app-loaded called');

  constants = args.constants;
  if (!isMac) {
    outlookExport.setup(
      app.getAppPath(),
      constants.OUTLOOK_EXPORT_RESULT,
      isDebug
    );
  }

  log.info(`Electron app started. Version: ${app.getVersion()}`);
  versionPeriodicCheck();

  if (!isDebug) {
    app.setAsDefaultProtocolClient(constants.PROTOCOL_NAME);
  }

  processSSOArgs = getSSOArgs(process.argv);
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock || isTestProtocol(process.argv)) {
  app.quit();
  return;
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (isTestProtocol(commandLine)) return;

  log.debug('second-instance');
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();

    const ssoArgs = getSSOArgs(commandLine);
    if (ssoArgs) {
      log.debug('sending "sso-args"');
      mainWindow.webContents.send('sso-args', ssoArgs);
    }
  }
});

app.on('open-url', (event, url) => {
  log.debug('open-filled called');
  const ssoArgs = getSSOArgs([url]);
  if (ssoArgs) {
    log.debug('sending "sso-args"');
    mainWindow.webContents.send('sso-args', ssoArgs);
  }
});

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    titleBarStyle: 'hiddenInset',
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  const startUrl =
    START_URL ||
    url.format({
      pathname: path.join(__dirname, '/../build/index.html'),
      protocol: 'file:',
      slashes: true,
    });

  Menu.setApplicationMenu(createMenu());

  // and load the index.html of the app.
  mainWindow.loadURL(startUrl);

  const session = mainWindow.webContents.session;

  session.setSpellCheckerLanguages(['en-US']);

  mainWindow.webContents.on('context-menu', (event, params) => {
    if (
      params.pageURL.split('/notes/').length > 0 &&
      params.dictionarySuggestions.length > 0
    ) {
      const menu = new Menu();

      // Add each spelling suggestion
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(
          new MenuItem({
            label: suggestion,
            // eslint-disable-next-line no-loop-func
            click: () => mainWindow.webContents.replaceMisspelling(suggestion),
          })
        );
      }

      // Allow users to add the misspelled word to the dictionary
      if (params.misspelledWord) {
        menu.append(
          new MenuItem({
            type: 'separator',
          })
        );
        menu.append(
          new MenuItem({
            label: 'Add to dictionary',
            click: () =>
              mainWindow.webContents.session.addWordToSpellCheckerDictionary(
                params.misspelledWord
              ),
          })
        );
      }

      menu.popup();
    }
  });

  if (isDebug) {
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  }

  // mainWindow.webContents.on('did-finish-load', () => {
  //   log.info(`Electron app started. Version: ${app.getVersion()}`);
  //   versionPeriodicCheck();
  // });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    log.info('Electron app closed');
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  mainWindow.webContents.session.on(
    'will-download',
    (event, item, webContents) => {
      const filename = item.getFilename();
      log.debug('on will-download - ', filename);

      const ext = path.extname(filename).replace('.', '').trim();

      const getFilter = ext => {
        switch (ext) {
          case '':
            return null;
          case 'jpeg':
          case 'jpg':
          case 'png':
            return [{ name: ext.toUpperCase() + ' Image', extensions: [ext] }];
          default:
            return [{ name: ext.toUpperCase() + ' File', extensions: [ext] }];
        }
      };

      item.setSaveDialogOptions({
        title: 'Save As',
        filters: getFilter(ext),
      });

      item.once('done', (event, state) => {
        if (state === 'completed') {
          const command = isMac ? 'open' : 'start ""';
          exec(`${command} "${item.savePath}"`, (e, stdout, stderr) => {
            if (stdout) {
              if (stdout.endsWith('\n')) {
                stdout = stdout.slice(0, stdout.length - 1);
              }
              log.debug('Download stdout: ', stdout);
            }

            if (stderr) {
              if (stderr.endsWith('\n')) {
                stderr = stderr.slice(0, stderr.length - 1);
              }
              log.error('Download stderr: ', stderr);
            }
            if (e) {
              webContents.send('download-error', {
                result: 'failed-to-open',
              });
            }
          });
        } else if (state !== 'cancelled') {
          log.error(`Download failed: ${state}`);
          webContents.send('download-error', { result: 'failed-to-download' });
        }
      });
    }
  );

  mainWindow.webContents.on('new-window', function (e, url) {
    if (e.sender.history) {
      if (e.sender.history.length > 0) {
        const lastUrl = e.sender.history[e.sender.history.length - 1];

        if (lastUrl.includes('/notes/')) {
          e.preventDefault();
          shell.openExternal(url);
        }
      }
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

autoUpdater.on('update-not-available', () => {
  log.info('update-not-available');
});

autoUpdater.on('update-available', () => {
  log.info('update-available');
});

autoUpdater.on('update-downloaded', () => {
  log.info('update-downloaded');

  dialog
    .showMessageBox(mainWindow, {
      title: 'New Version Available!',
      message: 'Please update to get the latest features and best experience.',
    })
    .then(_ => {
      log.info('quitAndInstall starting...');
      autoUpdater.quitAndInstall();
    });
});

autoUpdater.on('error', err => {
  log.error('autoUpdater error. ', err);

  var errStr = err.toString();
  if (!errStr.toLowerCase().includes('net::err')) {
    dialog.showErrorBox('update version error', 'please contact Ovvio support');
  }
});

ipcMain.on('check_update', event => {
  log.debug('check_update event called');
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('outlook_export', (event, args) => {
  outlookExport.run(args.subject, args.body, res => {
    event.sender.send(`outlook_export_done_${args.key}`, { result: res });
  });
});

ipcMain.on('shell_open_ext', (event, args) => {
  shell.openExternal(args.url, args.options);
});

ipcMain.on('closing-with-local-changes', (event, arg) => {
  log.debug('closing-with-local-changes called');

  const clickedBtn = dialog.showMessageBoxSync(mainWindow, {
    title: 'Exiting Ovvio?',
    message: 'Changes you made may not be saved.',
    type: 'warning',
    buttons: ['Stay', 'Exit'],
    cancelId: 0,
  });
  log.debug('Message box button index clicked: ', clickedBtn);

  event.returnValue = clickedBtn === 1;
});

ipcMain.on('is-debug-mode', (event, args) => {
  event.returnValue = isDebug;
});

function versionPeriodicCheck() {
  log.debug('versionPeriodicCheck starting...');

  autoUpdater.checkForUpdatesAndNotify();

  setTimeout(() => {
    versionPeriodicCheck();
  }, 10 * 60 * 1000);
}

process.on('uncaughtException', function (err) {
  log.error('uncaughtException. ', err);
});

function createMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideothers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

ipcMain.on('latest-log-file', (event, args) => {
  try {
    const currentLogFile = log.transports.file.getFile();
    const logBuffer = fs.readFileSync(currentLogFile.path);

    event.returnValue = compressToEncodedURIComponent(
      logBuffer.toString('utf-8')
    );
  } catch (err) {
    log.warn('latest-log-file error. ', err);
    event.returnValue = null;
  }
});

ipcMain.on('get-version', (event, args) => {
  event.returnValue = app.getVersion();
});

ipcMain.on('get-sso-args', (event, args) => {
  event.returnValue = processSSOArgs;
  processSSOArgs = undefined;
});

function isTestProtocol(argv) {
  return argv.filter(a => a.includes('://test')).length > 0;
}

function getSSOArgs(argv) {
  const protocol = argv.filter(a =>
    a.startsWith(constants.PROTOCOL_NAME + '://')
  );
  if (protocol.length === 0) {
    return undefined;
  }

  const ssoArgs = {};

  let protocolArgs = protocol[0].split('://').slice(1)[0].split(';');
  protocolArgs.forEach(x => {
    const spl = x.split('=');
    ssoArgs[spl[0]] = spl[1];
  });

  if (ssoArgs.token && ssoArgs.token.endsWith('/')) {
    ssoArgs.token = ssoArgs.token.slice(0, ssoArgs.token.length - 1);
  }
  return ssoArgs;
}
