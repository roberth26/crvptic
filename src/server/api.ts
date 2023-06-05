import Express, { ErrorRequestHandler, RequestHandler } from 'express';
import cors from 'cors';
import multer from 'multer';
import invariant from 'ts-invariant';
import {
  Route,
  type LobbyCreateResponse,
  type Color,
  type CategoriesResponse,
  type DecodeMethod,
  objectKeys,
  DEFAULT_SECRET_CATEGORIES,
  EventType,
  Events,
  APIRoute,
} from '../common';
import { CrvpticStore } from './store';
import { SECRET_BANK } from './game';
import { join } from 'path';

const store = new CrvpticStore();
const app = Express();

app.use(cors({ origin: true }));
app.use(multer().any());
app.use('/static', Express.static(join(__dirname, '../static')));

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

app.get(APIRoute(Route.Categories), (_req, res) => {
  res.json(categoriesResponse);
});

app.post(APIRoute(Route.LobbyCreate), (req, res) => {
  const { playerName } = req.body;
  const lobbyCode = store.createLobby(playerName);
  const response: LobbyCreateResponse = {
    lobbyCode,
  };
  res.json(response);
});

app.get(APIRoute(Route.Lobby), (req, res) => {
  const { lobbyCode } = req.params;
  invariant(lobbyCode);
  const { playerName } = req.query;
  invariant(typeof playerName === 'string');

  const lobby = store.getLobby(lobbyCode);
  lobby.send(Events.JoinLobby({ lobbyCode, playerName }));

  res.set({
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });

  res.flushHeaders();

  const unsubscribeTick = lobby.onTick(lobby => {
    res.write('event: message\n');
    res.write(`data: ${JSON.stringify(lobby)}\n\n`);
  });
  const unsubscribeDispose = lobby.onceDispose(() => res.end());

  res.socket?.on('end', () => {
    unsubscribeTick();
    unsubscribeDispose();
  });
});

app.put(APIRoute(Route.LobbyEvent), auth, (req, res) => {
  const { type, lobbyCode, playerName, ...formData } = req.body;
  const lobby = store.getLobby(lobbyCode);
  switch (type as EventType) {
    case EventType.StartGame:
      lobby.send(
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
      lobby.send(
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
      lobby.send(
        Events.JoinLobby({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.LeaveLobby:
      lobby.send(
        Events.LeaveLobby({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.DisbandLobby:
      lobby.send(
        Events.DisbandLobby({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.DemoteEncoder:
      lobby.send(
        Events.DemoteEncoder({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.PromoteEncoder:
      lobby.send(
        Events.PromoteEncoder({
          lobbyCode,
          playerName,
        }),
      );
      break;
    case EventType.EncodeSecret:
      lobby.send(
        Events.EncodeSecret({
          lobbyCode,
          playerName,
          signal: formData.signal,
          secretCount: Number(formData.secretCount),
        }),
      );
      break;
    case EventType.DecodeSecret:
      lobby.send(
        Events.DecodeSecret({
          lobbyCode,
          playerName,
          secret: formData.secret,
        }),
      );
      break;
    case EventType.CancelDecodeSecret:
      lobby.send(
        Events.CancelDecodeSecret({
          lobbyCode,
          playerName,
          secret: formData.secret,
        }),
      );
      break;
    case EventType.SkipDecoding:
      lobby.send(
        Events.SkipDecoding({
          lobbyCode,
          playerName,
        }),
      );
      break;
  }
  res.end();
});

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../static/index.html'));
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.log(error);
  res.status(500).send('Error');
};

app.use(errorHandler);

const server = app.listen(process.env['PORT']);

process.on('SIGTERM', () => {
  store.dispose();
  server.close();
});
