import React from 'react';
import { createRoot } from 'react-dom/client';
import AppView from './app/index.tsx';
// import { unregister as unregisterServiceWorker } from './registerServiceWorker.js';

const domNode = document.getElementById('root')!;
const root = createRoot(domNode);

root.render(<AppView />);

// render(<AppView />, document.getElementById('root'));
// unregisterServiceWorker();
