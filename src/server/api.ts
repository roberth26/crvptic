import Express, { ErrorRequestHandler, RequestHandler } from 'express';
import cors from 'cors';
import multer from 'multer';
import {
  API_PORT,
  Route,
  type LobbyCreateResponse,
  type Lobby,
  type Color,
  type CategoriesResponse,
  type GameConfig,
  type DecodeMethod,
  objectKeys,
  DEFAULT_SECRET_CATEGORIES,
} from '../common';
import { CrypticStore } from './store';
import { Events } from './events';
import { SECRET_BANK } from './game';

const store = new CrypticStore();
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
  const { playerName } = req.query;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);

  if (lobby == null || typeof playerName !== 'string') {
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

  lobby.send(Events.JoinLobby({ playerName }));

  const handler = (lobby: Lobby) => {
    res.write('event: message\n');
    res.write(`data: ${JSON.stringify(lobby)}\n\n`);
  };

  const unsubscribe = lobby.onTick(handler);

  res.socket?.on('end', () => {
    unsubscribe();
  });
});

app.put(Route.LobbyLeave, auth, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(playerName)) {
    res.end();
    return;
  }
  lobby.send(Events.LeaveLobby({ playerName }));
  res.end();
});

app.put(Route.LobbyTeamJoin, auth, (req, res) => {
  const { lobbyCode, teamColor } = req.params;
  const { playerName } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(teamColor) || !Boolean(playerName)) {
    res.end();
    return;
  }
  lobby.send(
    Events.JoinTeam({
      playerName,
      teamColor: Number(teamColor) as Color,
    }),
  );
  res.end();
});

app.put(Route.LobbyTeamEncoderDemote, auth, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(playerName)) {
    res.end();
    return;
  }
  lobby.send(
    Events.DemoteEncoder({
      playerName,
    }),
  );
  res.end();
});

app.put(Route.LobbyTeamEncoderPromote, auth, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(playerName)) {
    res.end();
    return;
  }
  lobby.send(
    Events.PromoteEncoder({
      playerName,
    }),
  );
  res.end();
});

app.post(Route.GameStart, auth, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(playerName)) {
    res.end();
    return;
  }
  const config: Partial<GameConfig> = {
    ...(req.body.encodeTimeLimit
      ? { encodeTimeLimit: Number(req.body.encodeTimeLimit) }
      : {}),
    ...(req.body.decodeTimeLimit
      ? { decodeTimeLimit: Number(req.body.decodeTimeLimit) }
      : {}),
    ...(req.body.secretCount
      ? { secretCount: Number(req.body.secretCount) }
      : {}),
    ...(req.body.virusCount ? { virusCount: Number(req.body.virusCount) } : {}),
    ...(req.body.decodeMethod
      ? { decodeMethod: Number(req.body.decodeMethod) as DecodeMethod }
      : {}),
    ...(req.body.allowExtraDecode
      ? { virusCount: req.body.allowExtraDecode === 'on' }
      : {}),
    ...(req.body.categories && { categories: req.body.categories }),
  };
  // TODO: make sure only encoder does this in saga
  lobby.send(Events.StartGame({ config }));
  res.end();
});

app.put(Route.GameSecretEncode, auth, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName, signal, secretCount } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (
    lobby == null ||
    !Boolean(playerName) ||
    !Boolean(signal) ||
    !Boolean(secretCount)
  ) {
    res.end();
    return;
  }
  lobby.send(
    Events.EncodeSecret({
      playerName,
      signal,
      secretCount: Number(secretCount),
    }),
  );
  res.end();
});

app.put(Route.GameSecretDecode, auth, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName, secret } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(playerName) || !Boolean(secret)) {
    res.end();
    return;
  }
  lobby.send(
    Events.DecodeSecret({
      playerName,
      secret,
    }),
  );
  res.end();
});

app.put(Route.GameSecretDecodeCancel, auth, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName, secret } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(playerName) || !Boolean(secret)) {
    res.end();
    return;
  }
  lobby.send(
    Events.CancelDecodeSecret({
      playerName,
      secret,
    }),
  );
  res.end();
});

app.put(Route.GameSecretDecodeSkip, auth, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(playerName)) {
    res.end();
    return;
  }
  lobby.send(
    Events.SkipDecoding({
      playerName,
    }),
  );
  res.end();
});

app.delete(Route.LobbyDisband, auth, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(playerName)) {
    res.end();
    return;
  }
  lobby.send(
    Events.DisbandLobby({
      playerName,
    }),
  );
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
