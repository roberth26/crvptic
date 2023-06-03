import Express, { ErrorRequestHandler, RequestHandler } from 'express';
import cors from 'cors';
import multer from 'multer';
import invariant from 'ts-invariant';
import {
  API_PORT,
  Route,
  type LobbyCreateResponse,
  type Lobby,
  type Color,
  type CategoriesResponse,
  type DecodeMethod,
  objectKeys,
  DEFAULT_SECRET_CATEGORIES,
  EventType,
  Events,
} from '../common';
import { CrvpticStore } from './store';
import { SECRET_BANK } from './game';

const store = new CrvpticStore();
const app = Express();

app.use(cors({ origin: true }));
app.use(multer().any());

const auth: RequestHandler = (req, _res, next) => {
  const { lobbyCode } = req.params;
  if (lobbyCode) {
    store.ensurePlayer(lobbyCode, req.body?.playerName);
  }
  next();
};

const defaultCategories = new Set(DEFAULT_SECRET_CATEGORIES);
const categoriesResponse: CategoriesResponse = {
  categories: objectKeys(SECRET_BANK).map(category => {
    const isDefault = defaultCategories.has(category);
    return {
      category,
      ...(isDefault && { isDefault: 1 }),
    };
  }),
};

app.get(Route.Categories, (_req, res) => {
  res.json(categoriesResponse);
});

app.post(Route.LobbyCreate, (req, res) => {
  const { playerName } = req.body;
  const lobbyCode = store.createLobby(playerName);
  const response: LobbyCreateResponse = {
    lobbyCode,
  };
  res.json(response);
});

app.get(Route.Lobby, (req, res) => {
  const { lobbyCode } = req.params;
  invariant(lobbyCode);
  const { playerName } = req.query;
  invariant(typeof playerName === 'string');

  store.send(Events.JoinLobby({ lobbyCode, playerName }));
  const lobby = store.getLobby(lobbyCode, playerName);

  res.set({
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });

  res.flushHeaders();

  const handleTick = (lobby: Lobby) => {
    res.write('event: message\n');
    res.write(`data: ${JSON.stringify(lobby)}\n\n`);
  };

  lobby.addListener('TICK', handleTick);
  lobby.once('DISPOSE', res.end);

  res.socket?.on('end', () => {
    lobby.removeListener('TICK', handleTick);
    lobby.removeListener('DISPOSE', res.end);
  });
});

app.put(Route.LobbyEvent, auth, (req, res) => {
  const { type, lobbyCode, playerName, ...formData } = req.body;
  switch (type as EventType) {
    case EventType.StartGame:
      store.send(
        Events.StartGame({
          lobbyCode,
          playerName,
          ...(formData.teamColor && {
            teamColor: Number(formData.teamColor) as Color,
          }),
          ...(formData.encodeTimeLimit && {
            encodeTimeLimit: Number(formData.encodeTimeLimit),
          }),
          ...(formData.decodeTimeLimit && {
            decodeTimeLimit: Number(formData.decodeTimeLimit),
          }),
          ...(formData.secretCount && {
            secretCount: Number(formData.secretCount),
          }),
          ...(formData.virusCount && {
            virusCount: Number(formData.virusCount),
          }),
          ...(formData.decodeMethod && {
            decodeMethod: Number(formData.decodeMethod) as DecodeMethod,
          }),
          ...(formData.allowExtraDecode && {
            virusCount: formData.allowExtraDecode === 'on',
          }),
          ...(formData.categories && { categories: formData.categories }),
        }),
      );
      break;
    case EventType.JoinTeam:
      store.send(
        Events.JoinTeam({
          lobbyCode,
          playerName,
          ...(formData.teamColor && {
            teamColor: Number(formData.teamColor) as Color,
          }),
        }),
      );
      break;
    case EventType.JoinLobby:
      store.send(
        Events.JoinLobby({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.LeaveLobby:
      store.send(
        Events.LeaveLobby({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.DisbandLobby:
      store.send(
        Events.DisbandLobby({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.DemoteEncoder:
      store.send(
        Events.DemoteEncoder({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.PromoteEncoder:
      store.send(
        Events.PromoteEncoder({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.EncodeSecret:
      store.send(
        Events.EncodeSecret({
          lobbyCode,
          playerName,
          signal: formData.signal,
          secretCount: Number(formData.secretCount),
        }),
      );
      break;
    case EventType.DecodeSecret:
      store.send(
        Events.DecodeSecret({
          lobbyCode,
          playerName,
          secret: formData.secret,
        }),
      );
      break;
    case EventType.CancelDecodeSecret:
      store.send(
        Events.CancelDecodeSecret({
          lobbyCode,
          playerName,
          secret: formData.secret,
        }),
      );
      break;
    case EventType.SkipDecoding:
      store.send(
        Events.SkipDecoding({
          lobbyCode,
          playerName,
        }),
      );
      break;
  }
  res.end();
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.log(error);
  res.status(500).send('Error');
};

app.use(errorHandler);

const server = app.listen(API_PORT);

process.on('SIGTERM', () => {
  store.dispose();
  server.close();
});
