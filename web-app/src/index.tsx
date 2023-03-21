import React from 'https://esm.sh/react@18.2.0';
import { render } from 'https://esm.sh/react-dom@18.2.0';
import AppAsync from './app/app-async.tsx';
// import { unregister as unregisterServiceWorker } from './registerServiceWorker.js';

render(<AppAsync />, document.getElementById('root'));
// unregisterServiceWorker();
