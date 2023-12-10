import React from 'react';
import { createRoot } from 'react-dom/client';
import { StyleProvider } from '../css-objects/context.tsx';
import { lightTheme as theme, ThemeProvider } from '../theme.tsx';
import { SessionProvider } from '../../auth/react.tsx';
import { CfdsClientProvider } from '../../web-app/src/core/cfds/react/graph.tsx';

const domNode = document.getElementById('root')!;

type AppProps = React.PropsWithChildren<Record<string, unknown>>;

export function SkeletonApp({ children }: AppProps) {
  return (
    // <React.StrictMode>
    <StyleProvider dev={false}>
      <ThemeProvider theme={theme} isRoot={true}>
        {children}
      </ThemeProvider>
    </StyleProvider>
    // </React.StrictMode>
  );
}

export function App({ children }: AppProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
