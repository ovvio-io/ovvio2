import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../styles/components/app.tsx';

const domNode = document.getElementById('root')!;
const root = createRoot(domNode);

root.render(
  <App>
    <div>Hello World</div>
  </App>
);
