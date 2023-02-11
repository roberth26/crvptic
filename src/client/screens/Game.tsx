import React, { useMemo } from 'react';
import invariant from 'ts-invariant';
import { Color, type Lobby, type Game, type Secret } from '../../common';
import { useLobby } from './Lobby';

export function Game() {
  const { lobby, playerName } = useLobby();
  invariant(lobby != null, 'lobby nullish');
  const game = lobby.activeGame;
  invariant(game != null, 'game not found');
  invariant(playerName, 'playerName empty or nullish');

  return (
    <div className="Game">
      {game.secrets.map(secret => (
        <Secret
          key={secret.secret}
          secret={secret}
          lobby={lobby}
          playerName={playerName}
        />
      ))}
    </div>
  );
}

function Secret({
  secret,
  lobby,
  playerName,
}: {
  secret: Secret;
  lobby: Lobby;
  playerName: string;
}) {
  const isRandomlyDecoded = useMemo(() => {
    return Math.random() > 0.5;
  }, [secret.secret]);

  const secretColor = !('teamColor' in secret) ? null : Color[secret.teamColor];
  const playerTeamColorName = lobby.teams.find(team =>
    team.players.includes(playerName),
  )?.color;
  invariant(playerTeamColorName, 'playerTeamColorName not found');
  const playerColor = Color[playerTeamColorName];

  return (
    <button
      className="Secret"
      style={{
        // @ts-ignore
        '--teamColor':
          isRandomlyDecoded && secretColor ? secretColor : playerColor,
      }}
      disabled={isRandomlyDecoded}
    >
      <span>{secret.secret}</span>
    </button>
  );
}
