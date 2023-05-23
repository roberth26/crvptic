import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  type ActionFunctionArgs,
  createBrowserRouter,
  generatePath,
  redirect,
  RouterProvider,
} from 'react-router-dom';
import invariant from 'ts-invariant';
import { API_PORT, Route, type LobbyCreateResponse } from '../common';
import { LobbyJoinCreate } from './screens/LobbyJoinCreate';
import { LobbyProvider } from './components/LobbyLayout';
import { Layout } from './components/Layout';
import {
  readStateFromLocalStorage,
  writeStateToLocalStorage,
} from './localStorage';
import { GameConfigure } from './screens/GameConfigure';
import { Lobby } from './screens/Lobby';

const basicAction = async ({ request }: ActionFunctionArgs) => {
  return fetch(
    Object.assign(new URL(request.url, location.href), { port: API_PORT }),
    {
      method: request.method,
      body: await request.formData(),
    },
  );
};

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
          const formData = await request.clone().formData();
          const playerName = formData.get('playerName');
          invariant(typeof playerName === 'string', 'missing playerName');
          const { lobbyCode } = (await basicAction(args).then(res =>
            res.json(),
          )) as LobbyCreateResponse;
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
        loader: async ({ params: { lobbyCode }, request }) => {
          invariant(lobbyCode, 'lobbyCode empty or nullish');
          const playerName = readStateFromLocalStorage()?.playerName;
          if (playerName == null) {
            writeStateToLocalStorage({ lobbyCode });
            return redirect(Route.Index);
          }
          const url = new URL(
            generatePath(Route.Lobby, { lobbyCode }),
            location.href,
          );
          url.port = API_PORT;
          url.search = String(new URLSearchParams({ playerName }));
          const eventSource = new EventSource(url);
          request.signal?.addEventListener('abort', () => eventSource.close(), {
            once: true,
          });
          return new Promise<EventSource>((resolve, reject) => {
            eventSource.addEventListener('open', () => resolve(eventSource), {
              once: true,
            });
            eventSource.addEventListener('error', reject, { once: true });
          });
        },
        children: [
          {
            index: true,
            element: <Lobby />,
          },
          {
            path: Route.LobbyLeave,
            action: async args => {
              basicAction(args);
              return redirect(Route.Index);
            },
          },
          {
            path: Route.LobbyDisband,
            action: async args => {
              basicAction(args);
              return redirect(Route.Index);
            },
          },
          {
            path: Route.LobbyTeamEncoderDemote,
            action: basicAction,
          },
          {
            path: Route.LobbyTeamEncoderPromote,
            action: basicAction,
          },
          {
            path: Route.LobbyTeamJoin,
            action: basicAction,
          },
          {
            path: Route.GameConfigure,
            element: <GameConfigure />,
            loader: () => {
              return fetch(
                Object.assign(new URL(Route.Categories, location.href), {
                  port: API_PORT,
                }),
              );
            },
          },
          {
            path: Route.GameStart,
            action: async args => {
              const {
                params: { lobbyCode },
              } = args;
              invariant(lobbyCode, 'lobbyCode empty or nullish');
              await basicAction(args);
              return redirect(generatePath(Route.Lobby, { lobbyCode }));
            },
          },
          {
            path: Route.GameSecretEncode,
            action: basicAction,
          },
          {
            path: Route.GameSecretDecode,
            action: basicAction,
          },
          {
            path: Route.GameSecretDecodeCancel,
            action: basicAction,
          },
          {
            path: Route.GameSecretDecodeSkip,
            action: basicAction,
          },
        ],
      },
    ],
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
