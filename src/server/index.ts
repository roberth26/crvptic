import path from 'path';
import Express from 'express';
import { WebSocketServer } from 'ws';
import shortid from 'shortid';
import shuffle from 'shuffle-array';
import Adult from '../../lib/adult.json';
import Misc from '../../lib/misc.json';
import Sports from '../../lib/sports.json';
import Animals from '../../lib/animals.json';
import Entertainment from '../../lib/entertainment.json';
import {
  CreateGameRequest,
  CreateGameResponse,
  Game,
  GameCode,
  GameConfig,
  GetCategoriesResponse,
} from '../common';

const SECRET_BANK = {
  Animals,
  Entertainment,
  Misc,
  Sports,
  Adult,
};

const GET_CATEGORIES_RESPONSE: GetCategoriesResponse = {
  categories: Object.keys(SECRET_BANK),
};

// screens
/**
 *
 * / ([join game], [create game])
 * /join ([game slug/code])
 * /:slug
 *
 *
 * team creator becomes initial encoder
 * encoder can disband team , and self demote
 * anyone can self promote to encoder, team players sorted in order of join/demote,
 * anyone can leave team
 * game creator can start game (on the lobby screen)
 *
 * GA
 *
 */

const app = Express();
const SERVER_PORT = 3000;
const SOCKET_PORT = 3001;

app.use(Express.json());
app.use('/static', Express.static(path.join(__dirname, 'static')));

app.get('/api/categories', (_req, res) => {
  res.json(GET_CATEGORIES_RESPONSE);
});

app.post('/api/games', (req, res) => {
  const { gameConfig } = req.body as CreateGameRequest;
  const gameCode = createGame(gameConfig);
  const response: CreateGameResponse = {
    gameCode,
  };
  res.json(response);
});

app.get('/*', (_req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});

app.listen(SERVER_PORT);

const wss = new WebSocketServer({ port: SOCKET_PORT });

const gamesByCode: Record<GameCode, Game> = {};

function createGame(gameConfig: GameConfig): GameCode {
  const gameCode = shortid.generate();
  const game: Game = {
    code: gameCode,
    config: gameConfig,
    teamIDs: [],
    secrets: {},
  };
  gamesByCode[gameCode] = game;
  console.log(JSON.stringify(gamesByCode, null, 2));
  return gameCode;
}

wss.on('connection', ws => {
  ws.on('message', data => {
    console.log;
  });
});
