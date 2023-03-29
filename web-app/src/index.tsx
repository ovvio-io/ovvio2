import React from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import AppView from './app/index.tsx';
// import { unregister as unregisterServiceWorker } from './registerServiceWorker.js';

const domNode = document.getElementById('root')!;
const root = createRoot(domNode);

root.render(<AppView />);

// render(<AppView />, document.getElementById('root'));
// unregisterServiceWorker();
