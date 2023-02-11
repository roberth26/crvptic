import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  generatePath,
  redirect,
  RouterProvider,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import invariant from 'ts-invariant';
import {
  APIRoute,
  type DecodeMethod,
  type GamePostRequest,
  type GamePostResponse,
  type LobbyCode,
  type LobbyPostRequest,
  type LobbyPostResponse,
  type LobbyPutRequest,
  type LobbyPutResponse,
  UIRoute,
} from '../common';
import { ConfigureGame } from './screens/ConfigureGame';
import { JoinCreateLobby } from './screens/JoinCreateLobby';
import { Lobby } from './screens/Lobby';
import { Layout } from './components/Layout';
import { LobbyMenu } from './screens/LobbyMenu';
import {
  readStateFromLocalStorage,
  writeStateToLocalStorage,
} from './localStorage';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: UIRoute.JoinCreateLobby,
        element: <JoinCreateLobby />,
        index: true,
        action: async ({ request }) => {
          const formData: { playerName: string } & (
            | { op: 'JOIN'; lobbyCode: LobbyCode }
            | { op: 'CREATE' }
          ) = Object.fromEntries(await request.formData());
          try {
            const response =
              formData.op === 'JOIN'
                ? putLobby(formData.lobbyCode, {
                    request: { op: 'JOIN', playerName: formData.playerName },
                    signal: request.signal,
                  })
                : postLobby({
                    request: { playerName: formData.playerName },
                    signal: request.signal,
                  });
            const { lobbyCode } = await response;
            writeStateToLocalStorage({
              lobbyCode,
              playerName: formData.playerName,
            });
            return redirect(generatePath(UIRoute.Lobby, { lobbyCode }));
          } catch (error) {
            // TODO: handle error
            return null;
          }
        },
      },
      {
        path: UIRoute.Lobby,
        element: <Lobby />,
        loader: async ({ params: { lobbyCode }, request: { signal } }) => {
          invariant(lobbyCode, 'lobbyCode empty or nullish');
          const playerName = readStateFromLocalStorage()?.playerName;
          if (playerName == null) {
            return redirect(UIRoute.JoinCreateLobby);
          }
          return connectLobby(lobbyCode, playerName, { signal });
        },
        children: [
          {
            index: true,
            element: <LobbyMenu />,
            action: async ({ request }) => {
              const formData = await request.formData();
              const lobbyCode = String(formData.get('lobbyCode'));
              await postGame({
                request: {
                  lobbyCode: lobbyCode,
                  playerName: String(formData.get('playerName')),
                },
                signal: request.signal,
              });
              return redirect(generatePath(UIRoute.Lobby, { lobbyCode }));
            },
          },
          {
            path: UIRoute.ConfigureGame,
            element: <ConfigureGame />,
            loader: () => {
              return fetch(APIRoute.Category);
            },
            action: async ({ request }) => {
              const formData = await request.formData();
              const lobbyCode = String(formData.get('lobbyCode'));
              await postGame({
                request: {
                  lobbyCode,
                  playerName: String(formData.get('playerName')),
                  gameConfig: {
                    encodeTimeLimit: Number(formData.get('encodeTimeLimit')),
                    decodeTimeLimit: Number(formData.get('decodeTimeLimit')),
                    secretCount: Number(formData.get('secretCount')),
                    virusCount: Number(formData.get('virusCount')),
                    decodeMethod: String(
                      formData.get('decodeMethod'),
                    ) as DecodeMethod,
                    allowExtraDecode: formData.get('allowExtraDecode') === 'on',
                    categories: formData.getAll('categories') as Array<string>,
                  },
                },
                signal: request.signal,
              });
              return redirect(generatePath(UIRoute.Lobby, { lobbyCode }));
            },
          },
        ],
      },
    ],
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

async function putLobby(
  lobbyCode: LobbyCode,
  {
    request,
    signal,
  }: {
    request: LobbyPutRequest;
    signal?: AbortSignal;
  },
): Promise<LobbyPutResponse> {
  return fetch(generatePath(APIRoute.Lobby, { lobbyCode }), {
    method: 'PUT',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  }).then<LobbyPutResponse>(res => res.json());
}

async function postLobby({
  request,
  signal,
}: {
  request: LobbyPostRequest;
  signal?: AbortSignal;
}): Promise<LobbyPostResponse> {
  return fetch(generatePath(APIRoute.Lobby, { lobbyCode: null }), {
    method: 'POST',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  }).then<LobbyPostResponse>(res => res.json());
}

async function connectLobby(
  lobbyCode: LobbyCode,
  playerName: string,
  { signal }: { signal?: AbortSignal },
): Promise<EventSource> {
  const url = new URL(
    // TODO: wtf
    generatePath(APIRoute.Lobby, { lobbyCode }),
    location.href,
  );
  url.port = '3000'; // TODO: env var?
  url.search = String(new URLSearchParams({ playerName }));
  const eventSource = new EventSource(url);
  signal?.addEventListener('abort', () => eventSource.close(), {
    once: true,
  });
  return new Promise<EventSource>((resolve, reject) => {
    eventSource.addEventListener('open', () => resolve(eventSource), {
      once: true,
    });
    eventSource.addEventListener('error', reject, { once: true });
  });
}

async function postGame({
  request,
  signal,
}: {
  request: GamePostRequest;
  signal?: AbortSignal;
}): Promise<GamePostResponse> {
  return fetch(APIRoute.Game, {
    method: 'POST',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  }).then<GamePostResponse>(res => res.json());
}
