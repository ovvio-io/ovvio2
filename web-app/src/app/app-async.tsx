import { StyleProvider } from '@ovvio/styles/lib/css-objects/context';
import config from 'core/config';
import { Fragment, lazy, Suspense } from 'react';

const LazyLogin = lazy(() => import('./login-async'));

export default function AppAsync() {
  return (
    <StyleProvider dev={config.isDev}>
      <Fragment>
        <Suspense fallback={<Fragment />}>
          <LazyLogin />
        </Suspense>
      </Fragment>
    </StyleProvider>
  );
}
