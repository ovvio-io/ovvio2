import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../styles/components/app.tsx';
import { UsersTable } from './users-table.tsx';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { NewUserForm } from './new-user.tsx';

const domNode = document.getElementById('root')!;
const root = createRoot(domNode);
const router = createBrowserRouter([
  {
    path: '/tenant-admin',
    element: <UsersTable />,
  },
  {
    path: '/tenant-admin/new-user',
    element: <NewUserForm />,
  },
]);

root.render(
  <App>
    <RouterProvider router={router} />
  </App>
);
