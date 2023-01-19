import React, { Fragment, lazy, Suspense } from 'https://esm.sh/react@18.2.0';
import { StyleProvider } from '../../../styles/css-objects/context.tsx';

const LazyLogin = lazy(() => import('./login-async.tsx'));

export default function AppAsync() {
  return (
    <StyleProvider dev={false}>
      <Fragment>
        <Suspense fallback={<Fragment />}>
          <LazyLogin />
        </Suspense>
      </Fragment>
    </StyleProvider>
  );
}
