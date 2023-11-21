import React from 'react';
import { createRoot } from 'react-dom/client';
import { PluginManager } from './app/settings/plugins/plugin-manager.tsx';
import { tabPlugins } from './app/settings/plugins/plugins-list.tsx';
// import { unregister as unregisterServiceWorker } from './registerServiceWorker.js';
import { AppView } from './app/index.tsx';

const domNode = document.getElementById('root');
(window as any).registerTabPlugin = PluginManager.registerPlugin;
PluginManager.initialize(tabPlugins);

const root = createRoot(domNode);
root.render(<AppView />);
