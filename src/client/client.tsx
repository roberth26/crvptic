import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  generatePath,
  redirect,
  RouterProvider,
} from 'react-router-dom';
import invariant from 'ts-invariant';
import {
  API_PORT,
  Route,
  LobbyCreateResponse,
  TeamJoinResponse,
  TeamEncoderDemoteResponse,
  TeamEncoderPromoteResponse,
  GameStartResponse,
  LobbyLeaveResponse,
  SecretEncodeResponse,
  SecretDecodeResponse,
  SecretDecodeCancelResponse,
} from '../common';
import { LobbyJoinCreate } from './screens/LobbyJoinCreate';
import { Lobby } from './screens/Lobby';
import { Layout } from './components/Layout';
import { LobbyMenu } from './screens/LobbyMenu';
import {
  readStateFromLocalStorage,
  writeStateToLocalStorage,
} from './localStorage';
import { GameConfigure } from './screens/GameConfigure';

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
        action: async ({ request }) => {
          const formData = await request.formData();
          const playerName = formData.get('playerName');
          invariant(typeof playerName === 'string', 'missing playerName');
          const url = new URL(request.url, location.href);
          url.port = API_PORT;
          const { lobbyCode } = (await fetch(url, {
            method: request.method,
            body: formData,
          }).then(res => res.json())) as LobbyCreateResponse;
          writeStateToLocalStorage({ playerName, lobbyCode });
          return redirect(generatePath(Route.Lobby, { lobbyCode }));
        },
      },
      {
        path: Route.LobbyLeave,
        action: async ({ request }) => {
          const formData = await request.formData();
          const playerName = formData.get('playerName');
          invariant(typeof playerName === 'string', 'missing playerName');
          const url = new URL(request.url, location.href);
          url.port = API_PORT;
          const _res = (await fetch(url, {
            method: request.method,
            body: formData,
          }).then(res => res.json())) as LobbyLeaveResponse;
          return redirect(Route.Index);
        },
      },
      {
        path: Route.TeamEncoderDemote,
        action: async ({ request }) => {
          const formData = await request.formData();
          const url = new URL(request.url, location.href);
          url.port = API_PORT;
          const res = (await fetch(url, {
            method: request.method,
            body: formData,
          }).then(res => res.json())) as TeamEncoderDemoteResponse;
          return res;
        },
      },
      {
        path: Route.TeamEncoderPromote,
        action: async ({ request }) => {
          const formData = await request.formData();
          const url = new URL(request.url, location.href);
          url.port = API_PORT;
          const res = (await fetch(url, {
            method: request.method,
            body: formData,
          }).then(res => res.json())) as TeamEncoderPromoteResponse;
          return res;
        },
      },
      {
        path: Route.TeamJoin,
        action: async ({ request }) => {
          const formData = await request.formData();
          const url = new URL(request.url, location.href);
          url.port = API_PORT;
          const res = (await fetch(url, {
            method: request.method,
            body: formData,
          }).then(res => res.json())) as TeamJoinResponse;
          return res;
        },
      },
      {
        path: Route.Lobby,
        element: <Lobby />,
        action: async ({ request }) => {
          const formData = await request.formData();
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
            element: <LobbyMenu />,
          },
          {
            path: Route.GameConfigure,
            element: <GameConfigure />,
            loader: () => {
              const url = new URL(Route.Categories, location.href);
              url.port = API_PORT;
              return fetch(url).then(res => res.json());
            },
          },
        ],
      },
    ],
  },
  {
    path: Route.SecretEncode,
    action: async ({ request }) => {
      const formData = await request.formData();
      const url = new URL(request.url, location.href);
      url.port = API_PORT;
      const res = (await fetch(url, {
        method: request.method,
        body: formData,
      }).then(res => res.json())) as SecretEncodeResponse;
      return res;
    },
  },
  {
    path: Route.SecretDecode,
    action: async ({ request }) => {
      const formData = await request.formData();
      const url = new URL(request.url, location.href);
      url.port = API_PORT;
      const res = (await fetch(url, {
        method: request.method,
        body: formData,
      }).then(res => res.json())) as SecretDecodeResponse;
      return res;
    },
  },
  {
    path: Route.SecretDecodeCancel,
    action: async ({ request }) => {
      const formData = await request.formData();
      const url = new URL(request.url, location.href);
      url.port = API_PORT;
      const res = (await fetch(url, {
        method: request.method,
        body: formData,
      }).then(res => res.json())) as SecretDecodeCancelResponse;
      return res;
    },
  },
  {
    path: Route.GameStart,
    action: async ({ params: { lobbyCode }, request }) => {
      invariant(lobbyCode, 'lobbyCode empty or nullish');
      const formData = await request.formData();
      const url = new URL(request.url, location.href);
      url.port = API_PORT;
      const _res = (await fetch(url, {
        method: request.method,
        body: formData,
      }).then(res => res.json())) as GameStartResponse;
      return redirect(generatePath(Route.Lobby, { lobbyCode }));
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
