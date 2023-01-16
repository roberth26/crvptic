import path from 'path';
import Express from 'express';

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

app.get('/*', (_req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});

app.listen('3000');
