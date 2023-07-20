import { ToastProvider } from '@ovvio/styles/lib/components/toast';
import { Fragment, lazy, Suspense } from 'react';
import { EventLoggerProvider } from '../core/analytics';
import OvvioRouter from '../core/react-utils/history';
import { isElectron } from '../electronUtils';
import { electronConstants } from '../shared/constants/electron-constants';
import TitleBarContainer from '../shared/electron-title-bar';
import FirebaseAppInit from './firebase-app-init';
import LoginScreen from './login';
import { MobileBlocker } from './mobile-blocker';

if (isElectron()) {
  window
    .require('electron')
    .ipcRenderer.send('on-app-loaded', { constants: electronConstants });
}

const LazyApp = lazy(() => import('./index'));

export default function LoginAsync() {
  return (
    <FirebaseAppInit>
      <EventLoggerProvider>
        <OvvioRouter>
          <TitleBarContainer>
            <ToastProvider>
              <LoginScreen>
                <MobileBlocker>
                  <Suspense fallback={<Fragment />}>
                    <LazyApp />
                  </Suspense>
                </MobileBlocker>
              </LoginScreen>
            </ToastProvider>
          </TitleBarContainer>
        </OvvioRouter>
      </EventLoggerProvider>
    </FirebaseAppInit>
  );
}
