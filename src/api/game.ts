import invariant from 'ts-invariant';
import { type Lobby, type GamePutRequest, GamePutOp } from '../common';

export function* game(mutateLobby: (mutator: (lobby: Lobby) => void) => void) {
  while (true) {
    const request: GamePutRequest = yield;
    switch (request.op) {
      // TODO: implement DecodeMethods other than First
      case GamePutOp.Decode: {
        const { secret: secretValue, playerName } = request;
        mutateLobby(lobby => {
          const activeGame = lobby.activeGame;
          invariant(activeGame, 'TODO: blow up');
          const secret = activeGame.secrets.find(
            secret => secret.value === secretValue,
          );
          invariant(secret, 'TODO: blow up');
          const playerTeamColor = lobby.teams.find(team =>
            team.players.includes(playerName),
          )?.color;
          invariant(playerTeamColor, 'TODO: also blow up');
          secret.decodeAttempt = {
            ...secret.decodeAttempt,
            players: [...(secret.decodeAttempt?.players ?? []), playerName],
            teamColor: playerTeamColor,
          };
          secret.isDecoded = 1;
        });
        break;
      }

      case GamePutOp.CancelDecode: {
        const { secret: secretValue, playerName } = request;
        mutateLobby(lobby => {
          const activeGame = lobby.activeGame;
          invariant(activeGame, 'TODO: blow up');
          const secret = activeGame.secrets.find(
            secret => secret.value === secretValue,
          );
          invariant(secret, 'TODO: blow up');
          const decodeAttempt = secret.decodeAttempt;
          invariant(decodeAttempt, 'TODO: blow up');
          const players = decodeAttempt.players;
          invariant(players, 'TODO: blow up');
          const hadDecoded = players.includes(playerName);
          invariant(hadDecoded, 'TODO: blow up');
          const newPlayers = players.filter(player => player !== playerName);
          if (newPlayers.length === 0) {
            delete secret.decodeAttempt;
          } else {
            secret.decodeAttempt = {
              ...decodeAttempt,
              players: newPlayers,
            };
          }
        });
        break;
      }
    }
  }
}
