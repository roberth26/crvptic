import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import invariant from 'ts-invariant';
import { GetCategoriesResponse, Routes } from '../common';
import { CreateGame } from './screens/CreateGame';
import { Index } from './screens/Index';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: Routes.Index,
    element: <Index />,
    index: true,
  },
  {
    path: Routes.CreateGame,
    element: <CreateGame />,
    loader: () =>
      queryClient.fetchQuery({
        queryKey: ['getCategories'],
        queryFn: () =>
          fetch('/api/categories')
            .then<GetCategoriesResponse>(res => res.json())
            .then(({ categories }) => categories),
      }),
  },
  {
    path: Routes.Game,
  },
]);

function Root() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

const rootElement = document.getElementById('root');
invariant(rootElement != null, 'rootElement nullish');
createRoot(rootElement).render(<Root />);
