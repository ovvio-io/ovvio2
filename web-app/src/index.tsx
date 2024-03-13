import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppView } from './app/index.tsx';

const domNode = document.getElementById('root')!;

const root = createRoot(domNode);
root.render(<AppView />);
