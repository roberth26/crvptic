import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  generatePath,
  redirect,
  RouterProvider,
} from 'react-router-dom';
import invariant from 'ts-invariant';
import { Route, type LobbyCreateResponse, APIRoute } from '../common';
import { LobbyJoinCreate } from './screens/LobbyJoinCreate';
import { LobbyProvider } from './components/LobbyLayout';
import { Layout } from './components/Layout';
import {
  readStateFromLocalStorage,
  writeStateToLocalStorage,
} from './localStorage';
import { GameConfigure } from './screens/GameConfigure';
import { Lobby } from './screens/Lobby';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: Route.Index,
        element: <LobbyJoinCreate />,
        index: true,
      },
      {
        path: Route.LobbyCreate,
        action: async args => {
          const { request } = args;
          const formData = await request.formData();
          const playerName = formData.get('playerName');
          invariant(typeof playerName === 'string', 'missing playerName');
          const { lobbyCode } = (await fetch(
            APIURL(request.url, location.href),
            {
              method: request.method,
              body: formData,
            },
          ).then(res => res.json())) as LobbyCreateResponse;
          writeStateToLocalStorage({ playerName, lobbyCode });
          return redirect(generatePath(Route.Lobby, { lobbyCode }));
        },
      },
      {
        path: Route.Lobby,
        element: <LobbyProvider />,
        action: async ({ request }) => {
          const formData = await request.clone().formData();
          const playerName = formData.get('playerName');
          invariant(typeof playerName === 'string', 'missing playerName');
          const lobbyCode = formData.get('lobbyCode');
          invariant(
            typeof lobbyCode === 'string',
            'lobbyCode empty or nullish',
          );
          writeStateToLocalStorage({ playerName, lobbyCode });
          return redirect(generatePath(Route.Lobby, { lobbyCode }));
        },
        shouldRevalidate: () => false,
        loader: async ({ params: { lobbyCode }, request: { signal } }) => {
          invariant(lobbyCode, 'lobbyCode empty or nullish');
          const playerName = readStateFromLocalStorage()?.playerName;
          if (playerName == null) {
            writeStateToLocalStorage({ lobbyCode });
            return redirect(Route.Index);
          }
          return new Promise<EventSource>((resolve, reject) => {
            const eventSource = new EventSource(
              Object.assign(
                APIURL(generatePath(Route.Lobby, { lobbyCode }), location.href),
                {
                  search: String(new URLSearchParams({ playerName })),
                },
              ),
            );
            eventSource.addEventListener('open', () => resolve(eventSource), {
              once: true,
              signal,
            });
            eventSource.addEventListener('error', reject, {
              once: true,
              signal,
            });
            signal?.addEventListener('abort', reject, { once: true });
          });
        },
        children: [
          {
            index: true,
            element: <Lobby />,
          },
          {
            path: Route.GameConfigure,
            element: <GameConfigure />,
            shouldRevalidate: () => false,
            loader: () => {
              return fetch(APIRoute(Route.Categories));
            },
          },
        ],
      },
    ],
  },
  {
    path: Route.LobbyEvent,
    action: async ({ request }) => {
      const formData = await request.formData();
      const res = fetch(APIURL(request.url, location.href), {
        method: request.method,
        body: formData,
      });
      switch (formData.get('type')) {
        case 'LEAVE_LOBBY':
          return redirect(Route.Index);
        case 'DISBAND_LOBBY':
          return redirect(Route.Index);
        case 'START_GAME':
          return redirect(
            generatePath(Route.Lobby, {
              lobbyCode: String(formData.get('lobbyCode')),
            }),
          );
        default:
          return res;
      }
    },
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

function APIURL(...params: ConstructorParameters<typeof window.URL>) {
  const url = new URL(...params);
  return new URL(APIRoute(url.pathname as `/${string}`), url.href);
}
