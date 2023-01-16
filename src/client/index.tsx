import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import invariant from 'ts-invariant';
import { Routes } from '../common';
import { CreateGame } from './screens/CreateGame';
import { Index } from './screens/Index';

const router = createBrowserRouter([
  {
    path: Routes.Index,
    element: <Index />,
    index: true,
  },
  {
    path: Routes.CreateGame,
    element: <CreateGame />,
  },
  {
    path: Routes.Game,
  },
]);

function Root() {
  return (
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}

const rootElement = document.getElementById('root');
invariant(rootElement != null, 'rootElement nullish');
createRoot(rootElement).render(<Root />);
