import React from 'react';
import { Form, useParams } from 'react-router-dom';
import invariant from 'ts-invariant';
import {
  type Lobby,
  type Game,
  type Secret,
  SecretType,
  Color,
} from '../../common';
import { useLobby } from './Lobby';

export function Game() {
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
    playerName === playerTeam.encoder;

  return (
    <div className="Game">
      <Form className="Game_secrets" method="put">
        <input
          hidden={true}
          name="lobbyCode"
          value={lobbyCode}
          readOnly={true}
        />
        <input
          hidden={true}
          name="playerName"
          value={playerName}
          readOnly={true}
        />
        {game.secrets.map(secret => (
          <Secret
            key={secret.value}
            secret={secret}
            lobby={lobby}
            playerName={playerName}
          />
        ))}
      </Form>
      {isEncoder && <Encoder />}
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
    playerName === playerTeam.encoder;
  const isDecoded = secret.isDecoded ?? false;
  const isDecoding =
    secret.decodeAttempt?.players.includes(playerName) ?? false;
  const secretColor =
    secret.type === SecretType.Secret ? Color[secret.teamColor] : null;
  const playerCount = isDecoded ? null : secret.decodeAttempt?.players.length;

  return (
    <>
      <input
        hidden={true}
        name="op"
        value={isDecoding ? 'CANCEL_DECODE' : 'DECODE'}
        readOnly={true}
      />
      <button
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
    </>
  );
}

function Encoder() {
  return (
    <Form className="Encoder" method="put">
      <label className="form-group">
        Secret key:
        <input
          name="signal"
          type="text"
          placeholder="signal"
          pattern="[^\s]+"
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
        />
      </label>
      <button className="bordered">Encode</button>
    </Form>
  );
}
