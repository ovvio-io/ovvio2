import React, { Fragment, lazy, Suspense } from 'react';
import { StyleProvider } from '../../../styles/css-objects/context.tsx';

const LazyLogin = lazy(() => import('./login-async.tsx'));

export default function AppAsync() {
  return (
    <StyleProvider>
      <Fragment>
        <Suspense fallback={<Fragment />}>
          <LazyLogin />
        </Suspense>
      </Fragment>
    </StyleProvider>
  );
}
