import path from 'path';
import Express from 'express';
import Adult from '../../lib/adult.json';
import Misc from '../../lib/misc.json';
import Sports from '../../lib/sports.json';
import Animals from '../../lib/animals.json';
import { GetCategoriesResponse } from '../common';

const SIGNAL_BANK = {
  Adult,
  Misc,
  Sports,
  Animals,
};

const GET_CATEGORIES_RESPONSE: GetCategoriesResponse = {
  categories: Object.keys(SIGNAL_BANK),
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
const PORT = 3000;

app.use('/static', Express.static(path.join(__dirname, 'static')));

app.get('/api/categories', (_req, res) => {
  // res.writeHead(200, { 'Content-Type': 'application/json' });
  res.json(GET_CATEGORIES_RESPONSE);
});

app.get('/*', (_req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});

app.listen(PORT);
