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
  type GamePutRequest,
  type LobbyPostRequest,
  type LobbyPutRequest,
  type GamePutOp,
  type TeamColor,
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
                    formData,
                    signal: request.signal,
                  },
                )
              : postLobby({
                  formData,
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
            formData,
            signal: request.signal,
          });
        },
        children: [
          {
            index: true,
            element: <LobbyMenu />,
            action: async ({ params: { lobbyCode }, request }) => {
              invariant(lobbyCode, 'TODO: throw up');
              const formData = await request.formData();
              await postGame({
                formData,
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
            action: async ({ params: { lobbyCode }, request }) => {
              invariant(lobbyCode, 'TODO: throw up');
              const formData = await request.formData();
              await postGame({
                formData,
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
    formData,
    signal,
  }: {
    formData: FormData;
    signal?: AbortSignal;
  },
): Promise<LobbyPutResponse> {
  invariant(lobbyCode, 'TODO: explode here');
  const op = formData.get('op');
  invariant(op, 'TODO: blow up');
  const playerName = formData.get('playerName');
  invariant(playerName, 'TODO: blow up');
  const teamColor = formData.get('teamColor');
  const request: LobbyPutRequest = {
    op: Number(op) as LobbyPutOp,
    playerName: String(playerName),
    ...(teamColor && { teamColor: String(teamColor) as TeamColor }),
  };
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
  formData,
  signal,
}: {
  formData: FormData;
  signal?: AbortSignal;
}): Promise<LobbyPostResponse> {
  const playerName = formData.get('playerName');
  invariant(playerName, 'TODO: blow up');
  const request: LobbyPostRequest = {
    playerName: String(playerName),
  };
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
  formData,
  signal,
}: {
  formData: FormData;
  signal?: AbortSignal;
}): Promise<GamePostResponse> {
  const lobbyCode = formData.get('lobbyCode');
  invariant(lobbyCode, 'TODO: blow up');
  const playerName = formData.get('playerName');
  invariant(playerName, 'TODO: blow up');
  const encodeTimeLimit = formData.get('encodeTimeLimit');
  const decodeTimeLimit = formData.get('decodeTimeLimit');
  const secretCount = formData.get('secretCount');
  const virusCount = formData.get('virusCount');
  const decodeMethod = formData.get('decodeMethod');
  const allowExtraDecode = formData.get('allowExtraDecode');
  const categories = formData.get('categories');
  const request: GamePostRequest = {
    lobbyCode: String(lobbyCode),
    playerName: String(playerName),
    gameConfig: {
      ...(encodeTimeLimit != null && {
        encodeTimeLimit: Number(encodeTimeLimit),
      }),
      ...(decodeTimeLimit != null && {
        decodeTimeLimit: Number(decodeTimeLimit),
      }),
      ...(secretCount != null && { secretCount: Number(secretCount) }),
      ...(virusCount != null && { virusCount: Number(virusCount) }),
      ...(decodeMethod != null && {
        decodeMethod: Number(decodeMethod) as DecodeMethod,
      }),
      ...(allowExtraDecode != null && {
        allowExtraDecode: allowExtraDecode === 'on' ? 1 : 0,
      }),
      ...(categories != null && {
        categories: formData.getAll('categories') as Array<string>,
      }),
    },
  };
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
  formData,
  signal: abortSignal,
}: {
  formData: FormData;
  signal?: AbortSignal;
}): Promise<GamePutResponse> {
  const lobbyCode = formData.get('lobbyCode');
  invariant(lobbyCode, 'TODO: blow up');
  const playerName = formData.get('playerName');
  invariant(playerName, 'TODO: blow up here');
  const op = formData.get('op');
  invariant(op, 'TODO: blow up');
  const signal = formData.get('signal');
  const secretCount = formData.get('secretCount');
  const secret = formData.get('secret');
  // TODO:
  // @ts-ignore
  const request: GamePutRequest = {
    lobbyCode: String(lobbyCode),
    playerName: String(playerName),
    op: Number(op) as GamePutOp,
    ...(signal && { signal: String(signal) }),
    ...(secretCount && { secretCount: Number(secretCount) }),
    ...(secret && { secret: String(signal) }),
  };
  const url = new URL(APIRoute.Game, location.href);
  url.port = API_PORT;
  return fetch(url, {
    method: 'PUT',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortSignal,
  }).then<GamePostResponse>(res => res.json());
}
