import React, { Fragment, lazy, Suspense } from 'https://esm.sh/react@18.2.0';
import {
  createBrowserRouter,
  Route,
  RouterProvider,
} from 'https://esm.sh/react-router-dom@6.7.0';
import { ToastProvider } from '../../../styles/components/toast/index.tsx';
// import OvvioRouter from '../core/react-utils/history/index.tsx';
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

const router = createBrowserRouter([]);

export default function LoginAsync() {
  return (
    // <FirebaseAppInit>
    // <EventLoggerProvider>
    <React.StrictMode>
      <RouterProvider router={router} />
      {/* <TitleBarContainer> */}
      <ToastProvider>
        <Route path="/">
          <LoginScreen>
            <MobileBlocker>
              <Suspense fallback={<Fragment />}>
                <LazyApp />
              </Suspense>
            </MobileBlocker>
          </LoginScreen>
        </Route>
      </ToastProvider>
      {/* </TitleBarContainer> */}
    </React.StrictMode>
    //   </EventLoggerProvider>
    // </FirebaseAppInit>
  );
}
