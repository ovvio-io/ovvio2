import React, { Fragment, lazy, Suspense } from 'react';
import { StyleProvider } from '../../../styles/css-objects/context.tsx';
import Login from './login-async.tsx';

// const LazyLogin = lazy(() => import('./login-async.tsx'));

export default function AppAsync() {
  return (
    <StyleProvider dev={false}>
      <Fragment>
        <Suspense fallback={<Fragment />}>
          <Login />
        </Suspense>
      </Fragment>
    </StyleProvider>
  );
}
