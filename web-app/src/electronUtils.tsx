import { OnLoginInfoFunc } from 'app/login';
import { isWindowsOS } from './utils';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { History } from 'history';

let devMode: boolean | undefined = undefined;
let ssoOnLoadCalled = false;

export function isElectron() {
  // Renderer process
  if (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    (window.process as any).type === 'renderer'
  ) {
    return true;
  }

  // Main process
  if (
    typeof process !== 'undefined' &&
    typeof process.versions === 'object' &&
    !!(process.versions as any).electron
  ) {
    return true;
  }

  // Detect the user agent when the `nodeIntegration` option is set to true
  if (
    typeof navigator === 'object' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.indexOf('Electron') >= 0
  ) {
    return true;
  }

  return false;
}

export function isElectronWindows() {
  return isWindowsOS() && isElectron();
}

export function electronInDebugMode() {
  if (devMode === undefined) {
    devMode = window.require('electron').ipcRenderer.sendSync('is-debug-mode');
  }
  return devMode;
}

export async function electronSSOSignInOnLoad(onLogin: OnLoginInfoFunc) {
  if (!isElectron() || ssoOnLoadCalled) {
    return;
  }

  ssoOnLoadCalled = true;

  setupOnSSOArgs(onLogin);

  const auth = getAuth();

  const ssoArgs = window
    .require('electron')
    .ipcRenderer.sendSync('get-sso-args');
  const currentUser = auth.currentUser;

  if (ssoArgs) {
    if (
      currentUser &&
      currentUser != null &&
      currentUser.uid === ssoArgs.userId
    ) {
      console.log('get-sso-args. already signed in');
    } else {
      try {
        const { user } = await signInWithCustomToken(auth, ssoArgs.token);
        await onLogin({ user });
      } catch (err) {
        console.error('electronSSOSignInOnLoad. ', err);
      }
    }
  }
}

function setupOnSSOArgs(onLogin: OnLoginInfoFunc) {
  const auth = getAuth();

  window.require('electron').ipcRenderer.on('sso-args', async (event, arg) => {
    console.log('sso-args starting');
    const currentUser = auth.currentUser;

    if (currentUser && currentUser != null && currentUser.uid === arg.userId) {
      console.log('sso-token. already signed in');
    } else {
      try {
        const { user } = await signInWithCustomToken(auth, arg.token);
        await onLogin({ user });
      } catch (err) {
        console.error('setupOnSSOArgs. ', err);
      }
    }
  });
}

const SEARCH_SATE = 'searchState';

export function loadElectronState(history: History) {
  if (!isElectron()) {
    return;
  }

  const search = window.localStorage.getItem(SEARCH_SATE);
  if (!search) {
    return;
  }

  history.replace({
    search,
  });
}

export function saveElectronState(search: string) {
  if (!isElectron()) {
    return;
  }

  window.localStorage.setItem(SEARCH_SATE, search);
}
