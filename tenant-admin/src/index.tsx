import React from 'react';
import { createRoot } from 'react-dom/client';
import { StyleProvider } from '../../styles/css-objects/context.tsx';
import { lightTheme as theme, ThemeProvider } from '../../styles/theme.tsx';

const domNode = document.getElementById('root')!;
const root = createRoot(domNode);

type AppProps = React.PropsWithChildren<{}>;

function App({ children }: AppProps) {
  return (
    <StyleProvider dev={false}>
      <ThemeProvider theme={theme} isRoot={true}>
        {({ style }) => <React.StrictMode>{children}</React.StrictMode>}
      </ThemeProvider>
    </StyleProvider>
  );
}

root.render(
  <App>
    <div>Hello World</div>
  </App>
);
