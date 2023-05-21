import Express from 'express';
import cors from 'cors';
import multer from 'multer';
import {
  API_PORT,
  Route,
  type LobbyCreateResponse,
  type Lobby,
  type TeamJoinResponse,
  type TeamColor,
  type TeamEncoderDemoteResponse,
  type TeamEncoderPromoteResponse,
  type CategoriesResponse,
  type GameConfig,
  type DecodeMethod,
  type GameStartResponse,
  type LobbyLeaveResponse,
  type SecretEncodeResponse,
  type SecretDecodeResponse,
  type SecretDecodeCancelResponse,
  DEFAULT_SECRET_CATEGORIES,
  objectKeys,
  SECRET_BANK,
} from '../common';
import { CrypticStore } from './store';
import { Events, EventType } from './events';

const store = new CrypticStore();
const app = Express();

app.use(cors({ origin: true }));
app.use(multer().any());

app.get(Route.Categories, (_req, res) => {
  const defaultCategories = new Set(DEFAULT_SECRET_CATEGORIES);
  const response: CategoriesResponse = {
    categories: objectKeys(SECRET_BANK).map(category => {
      const isDefault = defaultCategories.has(category);
      return {
        category,
        ...(isDefault && { isDefault: 1 }),
      };
    }),
  };
  res.json(response);
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

app.put(Route.LobbyLeave, (req, res) => {
  const { lobbyCode } = req.params;
  const { playerName } = req.body;
  const lobby = lobbyCode == null ? null : store.getLobby(lobbyCode);
  if (lobby == null || !Boolean(playerName)) {
    res.end();
    return;
  }
  lobby.send(Events.LeaveLobby({ playerName }));
  const response: LobbyLeaveResponse = {};
  res.json(response);
});

app.put(Route.TeamJoin, (req, res) => {
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
      teamColor: teamColor as TeamColor,
    }),
  );
  const response: TeamJoinResponse = {};
  res.json(response);
});

app.put(Route.TeamEncoderDemote, (req, res) => {
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
  const response: TeamEncoderDemoteResponse = {};
  res.json(response);
});

app.put(Route.TeamEncoderPromote, (req, res) => {
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
  const response: TeamEncoderPromoteResponse = {};
  res.json(response);
});

app.post(Route.GameStart, (req, res) => {
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
  lobby.send(Events.StartGame({ config }));
  const response: GameStartResponse = {};
  res.json(response);
});

app.put(Route.SecretEncode, (req, res) => {
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
  const response: SecretEncodeResponse = {};
  res.json(response);
});

app.put(Route.SecretDecode, (req, res) => {
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
  const response: SecretDecodeResponse = {};
  res.json(response);
});

app.put(Route.SecretDecodeCancel, (req, res) => {
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
  const response: SecretDecodeCancelResponse = {};
  res.json(response);
});

const server = app.listen(API_PORT);

process.on('SIGTERM', () => {
  store.dispose();
  server.close();
});
