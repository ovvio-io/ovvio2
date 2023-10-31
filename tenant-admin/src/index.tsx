import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../styles/components/app.tsx';
import { UsersTable } from './users-table.tsx';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

const domNode = document.getElementById('root')!;
const root = createRoot(domNode);
const router = createBrowserRouter([
  {
    path: '/tenant-admin',
    element: <UsersTable />,
  },
]);

root.render(
  <App>
    <RouterProvider router={router} />
  </App>
);
