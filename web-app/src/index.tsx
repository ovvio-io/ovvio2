import React from 'react';
import { createRoot } from 'react-dom/client';
import AppView from './app/index.tsx';
import TabPlugin, {
  sectionTabGroups,
} from './app/settings/plugins/tab-plugin.tsx';
import { assert } from '../../base/error.ts';
// import { unregister as unregisterServiceWorker } from './registerServiceWorker.js';

const domNode = document.getElementById('root')!;
const root = createRoot(domNode);

export function registerTabPlugin(sectionTitle: string, plugin: TabPlugin) {
  assert(sectionTitle in sectionTabGroups, 'Section title must be valid.');
  assert(plugin !== undefined, 'Plugin must be provided.');
  assert(
    typeof plugin.title === 'string' && plugin.title.trim() !== '',
    'Plugin must have a title.'
  );
  assert(
    typeof plugin.render === 'function',
    'Plugin must have a render function.'
  );
  const isAlreadyRegistered = sectionTabGroups[sectionTitle].some(
    (p) => p.title === plugin.title
  );
  assert(
    !isAlreadyRegistered,
    `A plugin with the title '${plugin.title}' is already registered in the '${sectionTitle}' section.`
  );
  sectionTabGroups[sectionTitle].push(plugin);
}

(window as any).registerTabPlugin = (sectionTitle: string, plugin: TabPlugin) =>
  registerTabPlugin(sectionTitle, plugin);

root.render(<AppView />);

// render(<AppView />, document.getElementById('root'));
// unregisterServiceWorker();
