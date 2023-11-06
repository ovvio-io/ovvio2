import React from 'react';
import { createRoot } from 'react-dom/client';
import AppView from './app/index.tsx';
import TabPlugin, {
  tabPlugins,
} from './app/settings/plugins/tab-plugin-interface.tsx';
import { assert } from '../../base/error.ts';
// import { unregister as unregisterServiceWorker } from './registerServiceWorker.js';

const domNode = document.getElementById('root')!;
const root = createRoot(domNode);

export function registerTabPlugin(plugin: TabPlugin) {
  assert(plugin !== undefined, 'Plugin must be provided.');
  assert(
    typeof plugin.title === 'string' && plugin.title.trim() !== '',
    'Plugin must have a title.'
  );
  assert(
    typeof plugin.render === 'function',
    'Plugin must have a render function.'
  );
  //sanity check - should not reach here.
  const index = tabPlugins.findIndex((p) => p.title === plugin.title);
  assert(
    index === -1,
    `A plugin with the title '${plugin.title}' is already registered.`
  );
  tabPlugins.push(plugin);
}

(window as any).registerTabPlugin = registerTabPlugin;

root.render(<AppView />);

// render(<AppView />, document.getElementById('root'));
// unregisterServiceWorker();
