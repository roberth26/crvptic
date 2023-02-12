import Express from 'express';
import cors from 'cors';
import {
  type CategoryGetResponse,
  type LobbyPostRequest,
  type LobbyPostResponse,
  type LobbyPutRequest,
  type LobbyPutResponse,
  type GamePostRequest,
  type GamePostResponse,
  type GamePutRequest,
  type GamePutResponse,
  API_PORT,
  APIRoute,
  LobbyPutOp,
} from '../common';
import { createStore } from './store';
import invariant from 'ts-invariant';

const store = createStore();
const app = Express();

app.use(Express.json());
app.use(cors({ origin: true }));

app.get(APIRoute.Category, (_req, res) => {
  const defaultCategories = new Set(store.getDefaultSecretCategories());
  const response: CategoryGetResponse = {
    categories: store.getSecretCategories().map(category => {
      const isDefault = defaultCategories.has(category);
      return {
        category,
        ...(isDefault && { isDefault: 1 }),
      };
    }),
  };
  res.json(response);
});

app.post(APIRoute.Lobby, (req, res) => {
  const { playerName } = req.body as LobbyPostRequest;
  const lobby = store.createLobby(playerName);
  const response: LobbyPostResponse = {
    lobbyCode: lobby.code,
  };
  res.json(response);
});

app.put(APIRoute.Lobby, (req, res) => {
  const { lobbyCode } = req.params;
  invariant(typeof lobbyCode === 'string', 'lobbyCode not string');
  const request = req.body as LobbyPutRequest;
  switch (request.op) {
    case LobbyPutOp.Join: {
      const { playerName, teamColor } = request;
      const lobby = store.joinTeam({
        lobbyCode,
        playerName,
        teamColor,
      });
      invariant(lobby != null, 'lobby nullish');
      const response: LobbyPutResponse = {
        lobbyCode: lobby.code,
      };
      res.json(response);
      return;
    }

    case LobbyPutOp.DemoteEncoder: {
      const { playerName } = request;
      store.demoteEncoder(lobbyCode, playerName);
      const response: LobbyPutResponse = {
        lobbyCode,
      };
      res.json(response);
      return;
    }

    case LobbyPutOp.PromoteDecoder: {
      const { playerName } = request;
      store.promoteEncoder(lobbyCode, playerName);
      const response: LobbyPutResponse = {
        lobbyCode,
      };
      res.json(response);
      return;
    }

    case LobbyPutOp.Leave: {
      throw new Error('LEAVE not implemented!');
    }

    default:
      return;
  }
});

app.get(APIRoute.Lobby, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName } = req.query;
  if (lobbyCode == null || typeof playerName !== 'string') {
    res.end();
    return;
  }

  res.set({
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });

  res.flushHeaders();

  const unsubscribe = store.subscribePlayer({
    lobbyCode,
    playerName,
    onSnapshot: lobby => {
      res.write('event: message\n');
      res.write(`data: ${JSON.stringify(lobby)}\n\n`);
    },
    onDispose: () => {
      res.end();
    },
  });

  res.socket?.on('end', () => {
    unsubscribe?.();
  });
});

app.post(APIRoute.Game, (req, res) => {
  const { lobbyCode, gameConfig } = req.body as GamePostRequest;
  store.startGame(lobbyCode, gameConfig);
  const response: GamePostResponse = {};
  res.json(response);
});

app.put(APIRoute.Game, (req, res) => {
  const request = req.body as GamePutRequest;
  store.sendGameEvent(request.lobbyCode, request);
  const response: GamePutResponse = {};
  res.json(response);
});

const server = app.listen(API_PORT);

process.on('SIGTERM', () => {
  store.dispose();
  server.close();
});
