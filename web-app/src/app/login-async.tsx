import React, { Fragment, lazy, Suspense } from 'https://esm.sh/react@18.2.0';
import { ToastProvider } from '../../../styles/components/toast/index.tsx';
import OvvioRouter from '../core/react-utils/history/index.tsx';
// import { electronConstants } from '../shared/constants/electron-constants';
// import TitleBarContainer from '../shared/electron-title-bar';
import LoginScreen from './login/index.tsx';
import { MobileBlocker } from './mobile-blocker.tsx';

// if (isElectron()) {
//   window
//     .require('electron')
//     .ipcRenderer.send('on-app-loaded', { constants: electronConstants });
// }

const LazyApp = lazy(() => import('./index.tsx'));

export default function LoginAsync() {
  return (
    // <FirebaseAppInit>
    // <EventLoggerProvider>
    <OvvioRouter>
      {/* <TitleBarContainer> */}
      <ToastProvider>
        <LoginScreen>
          <MobileBlocker>
            <Suspense fallback={<Fragment />}>
              <LazyApp />
            </Suspense>
          </MobileBlocker>
        </LoginScreen>
      </ToastProvider>
      {/* </TitleBarContainer> */}
    </OvvioRouter>
    //   </EventLoggerProvider>
    // </FirebaseAppInit>
  );
}
