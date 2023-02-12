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
  type DecodeMethod,
  type GamePostRequest,
  type GamePostResponse,
  type LobbyCode,
  type LobbyPostResponse,
  type LobbyPutResponse,
  type GamePutResponse,
  APIRoute,
  UIRoute,
  API_PORT,
  type Maybe,
  LobbyPutOp,
  GamePutRequest,
  LobbyPostRequest,
  LobbyPutRequest,
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
          const formData = await request.formData();
          const playerName = formData.get('playerName');
          invariant(playerName, 'TODO: explode');
          const op = formData.get('op');
          try {
            const { lobbyCode } = await (op === String(LobbyPutOp.Join)
              ? putLobby(
                  formData.get('lobbyCode') &&
                    String(formData.get('lobbyCode')),
                  {
                    body: formData,
                    signal: request.signal,
                  },
                )
              : postLobby({
                  body: formData,
                  signal: request.signal,
                }));
            writeStateToLocalStorage({
              lobbyCode,
              playerName: String(playerName),
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
        action: async ({ request }) => {
          const formData = await request.formData();
          return putGame({
            request: {},
            signal: request.signal,
          });
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
            loader: ({ request }) => {
              return getCategories({ signal: request.signal });
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
                    decodeMethod: Number(
                      formData.get('decodeMethod'),
                    ) as DecodeMethod,
                    allowExtraDecode:
                      formData.get('allowExtraDecode') === 'on' ? 1 : 0,
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

async function getCategories({ signal }: { signal?: AbortSignal }) {
  const url = new URL(APIRoute.Category, location.href);
  url.port = API_PORT;
  return fetch(url, {
    signal,
  });
}

async function putLobby(
  lobbyCode: Maybe<LobbyCode>,
  {
    request,
    signal,
  }: {
    request: LobbyPutRequest;
    signal?: AbortSignal;
  },
): Promise<LobbyPutResponse> {
  invariant(lobbyCode, 'TODO: explode here');
  const url = new URL(
    generatePath(APIRoute.Lobby, { lobbyCode }),
    location.href,
  );
  url.port = API_PORT;
  return fetch(url, {
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
  const url = new URL(generatePath(APIRoute.Lobby), location.href);
  url.port = API_PORT;
  return fetch(url, {
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
    generatePath(APIRoute.Lobby, { lobbyCode }),
    location.href,
  );
  url.port = API_PORT;
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
  const url = new URL(APIRoute.Game, location.href);
  url.port = API_PORT;
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  }).then<GamePostResponse>(res => res.json());
}

async function putGame({
  request,
  signal,
}: {
  request: GamePutRequest;
  signal?: AbortSignal;
}): Promise<GamePutResponse> {
  const url = new URL(APIRoute.Game, location.href);
  url.port = API_PORT;
  return fetch(url, {
    method: 'PUT',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  }).then<GamePostResponse>(res => res.json());
}
