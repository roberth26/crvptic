import React, { memo } from 'react';
import { generatePath, useFetcher, useParams } from 'react-router-dom';
import invariant from 'ts-invariant';
import { type Game, type Secret, SecretType, Color, Route } from '../../common';
import { useLobby } from './Lobby';

export function Game() {
  const fetcher = useFetcher();
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'lobbyCode nullish');
  const { lobby, playerName } = useLobby();
  invariant(lobby != null, 'lobby nullish');
  const game = lobby.activeGame;
  invariant(game != null, 'game not found');
  invariant(playerName, 'playerName empty or nullish');
  const playerTeam = lobby.teams.find(team =>
    team.players.includes(playerName),
  );
  invariant(playerTeam, 'TODO: blow up');
  const isEncoder =
    playerTeam.color === game.encodingTeamColor &&
    playerName === playerTeam.players[0];

  return (
    <div className="Game">
      <fetcher.Form className="Game_secrets" method="put">
        <input
          hidden={true}
          name="playerName"
          value={playerName}
          readOnly={true}
        />
        {game.secrets.map(secret => (
          <Secret key={secret.value} secret={secret} />
        ))}
      </fetcher.Form>
      {isEncoder && <Encoder />}
    </div>
  );
}

const Secret = memo(({ secret }: { secret: Secret }) => {
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'lobbyCode nullish');
  const { lobby, playerName } = useLobby();
  invariant(lobby != null, 'lobby nullish');
  invariant(playerName, 'playerName empty or nullish');
  const game = lobby.activeGame;
  invariant(game, 'TODO: blow up');
  const playerTeam = lobby.teams.find(team =>
    team.players.includes(playerName),
  );
  invariant(playerTeam, 'TODO: blow up');
  const playerTeamColor = playerTeam.color;
  invariant(playerTeamColor, 'playerTeamColorName not found');
  const isEncoder =
    playerTeamColor === game.encodingTeamColor &&
    playerName === playerTeam.players[0];
  const isDecoded = secret.isDecoded ?? false;
  const isDecoding =
    secret.decodeAttempt?.players.includes(playerName) ?? false;
  const secretColor =
    secret.type === SecretType.Secret ? Color[secret.teamColor] : null;
  const playerCount = isDecoded ? null : secret.decodeAttempt?.players.length;

  const formAction = isDecoded
    ? undefined
    : isDecoding
    ? generatePath(Route.SecretDecodeCancel, { lobbyCode })
    : generatePath(Route.SecretDecode, { lobbyCode });

  return (
    <button
      formAction={formAction}
      className={`Secret ${isDecoded ? 'decoded' : ''}`}
      name="secret"
      value={secret.value}
      style={{
        // @ts-ignore
        '--teamColor':
          isDecoded && secretColor ? secretColor : Color[playerTeamColor],
      }}
      disabled={isEncoder || Boolean(isDecoded)}
    >
      <span>{secret.value}</span>
      {Boolean(playerCount) && <span>({playerCount})</span>}
    </button>
  );
});

const Encoder = memo(() => {
  const fetcher = useFetcher();
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'TODO: explode');
  const { playerName } = useLobby();
  invariant(playerName, 'TODO: explode');

  return (
    <fetcher.Form
      className="Encoder"
      method="put"
      action={generatePath(Route.SecretEncode, { lobbyCode })}
    >
      <input
        hidden={true}
        name="playerName"
        value={playerName}
        readOnly={true}
      />
      <label className="form-group">
        Encoded signal:
        <input
          name="signal"
          type="text"
          placeholder="signal"
          pattern="[^\s]+"
          required={true}
        />
      </label>
      <label className="form-group">
        Secret count:
        <input
          name="secretCount"
          type="number"
          defaultValue={2}
          min={0}
          max={16}
          step={1}
          required={true}
        />
      </label>
      <button className="bordered">Encode</button>
    </fetcher.Form>
  );
});
