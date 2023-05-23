import React, { memo, useEffect, useReducer } from 'react';
import { generatePath, useFetcher } from 'react-router-dom';
import invariant from 'ts-invariant';
import {
  type Game,
  type Secret,
  SecretType,
  Route,
  colorValue,
  colorName,
} from '../../common';
import {
  useLobby,
  useLobbyCode,
  usePlayerName,
  usePlayerTeam,
} from '../components/LobbyLayout';

export function Game() {
  const fetcher = useFetcher();
  const playerName = usePlayerName();
  const { activeGame } = useLobby();
  invariant(activeGame, 'activeGame nullish');

  return (
    <div className="Game">
      <fetcher.Form className="Game_secrets" method="put">
        <input
          hidden={true}
          name="playerName"
          value={playerName}
          readOnly={true}
        />
        {activeGame.secrets.map(secret => (
          <Secret key={secret.value} secret={secret} />
        ))}
      </fetcher.Form>
      <Encoder />
    </div>
  );
}

const TimeLeft = memo(({ endTime }: { endTime: number }) => {
  const [_, tick] = useReducer(x => !x, true);

  useEffect(() => {
    const intervalID = setInterval(tick, 1000);
    return () => clearInterval(intervalID);
  }, []);

  const secondsLeft = Math.max(0, endTime - Math.floor(Date.now() / 1000));
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return <>{`${minutes}:${seconds}`}</>;
});

const Secret = memo(({ secret }: { secret: Secret }) => {
  const lobbyCode = useLobbyCode();
  const playerName = usePlayerName();
  const playerTeam = usePlayerTeam();
  const isEncoder = playerName === playerTeam.players[0];
  const isDecoded = secret.decodeTeamColor != null;
  const isDecoding =
    secret.decodeAttempt?.players.includes(playerName) ?? false;
  const secretColor =
    secret.type === SecretType.Secret ? secret.teamColor : null;
  const playerCount = isDecoded ? null : secret.decodeAttempt?.players.length;
  const isVirus = secret.type === SecretType.Virus;
  const isNull = secret.type === SecretType.Null;
  const formAction = isDecoded
    ? undefined
    : isDecoding
    ? generatePath(Route.GameSecretDecodeCancel, { lobbyCode })
    : generatePath(Route.GameSecretDecode, { lobbyCode });

  return (
    <button
      formAction={formAction}
      className={[
        'Secret',
        isDecoded && 'decoded',
        isVirus && 'virus',
        isNull && 'null',
        isEncoder && 'encoder',
      ]
        .filter(Boolean)
        .join(' ')}
      name="secret"
      value={secret.value}
      style={{
        // @ts-ignore
        '--secret-team-color':
          secretColor == null ? undefined : colorValue(secretColor),
      }}
      disabled={isEncoder || Boolean(isDecoded)}
    >
      <span>{secret.value}</span>
      <span>
        {isVirus && (isEncoder || isDecoded) && <>⚠️</>}
        {Boolean(playerCount) && <>&nbsp;{playerCount}</>}
      </span>
    </button>
  );
});

const Encoder = memo(() => {
  const fetcher = useFetcher();
  const lobbyCode = useLobbyCode();
  const playerName = usePlayerName();
  const { activeGame } = useLobby();
  invariant(activeGame, 'activeGame nullish');
  const playerTeam = usePlayerTeam();
  const activeTeamColor = activeGame.activeTeam;
  const isPlayerTeamActive = playerTeam.color === activeTeamColor;
  const isPlayerTeamEncoder = playerName === playerTeam.players[0];
  const isPlayerEncoding = isPlayerTeamActive && isPlayerTeamEncoder;
  const hasEncoded = Boolean(activeGame.signal);

  return (
    <div className="Game_controls">
      <div className="Game_controls_infobar">
        <div>
          <span
            className="active-team"
            style={{
              // @ts-ignore
              '--active-team-color': colorValue(activeTeamColor),
            }}
          >
            {colorName(activeGame.activeTeam)} team
          </span>
          &nbsp;is {activeGame.signal ? 'decoding' : 'encoding'}
        </div>
        <div>
          {activeGame.encodeStartTime != null && (
            <>
              Encode by:&nbsp;
              <TimeLeft
                endTime={
                  activeGame.encodeStartTime + activeGame.config.encodeTimeLimit
                }
              />
            </>
          )}
          {activeGame.decodeStartTime != null && (
            <>
              Decode by:&nbsp;
              <TimeLeft
                endTime={
                  activeGame.decodeStartTime + activeGame.config.decodeTimeLimit
                }
              />
            </>
          )}
        </div>
      </div>
      <fetcher.Form className="Encoder">
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
            value={isPlayerEncoding ? undefined : activeGame.signal ?? '--'}
            pattern="[^\s]+"
            required={true}
            disabled={!isPlayerEncoding || hasEncoded}
            readOnly={!isPlayerEncoding}
          />
        </label>
        <label className="form-group">
          Secret count:
          <input
            name="secretCount"
            type="number"
            defaultValue={isPlayerEncoding ? 2 : undefined}
            value={
              isPlayerEncoding ? undefined : activeGame.secretCount ?? '--'
            }
            min={0}
            max={16}
            step={1}
            required={true}
            disabled={!isPlayerEncoding || hasEncoded}
            readOnly={!isPlayerEncoding}
          />
        </label>
        {!hasEncoded && isPlayerEncoding && (
          <button
            className="bordered"
            formMethod="put"
            formAction={generatePath(Route.GameSecretEncode, { lobbyCode })}
          >
            Encode
          </button>
        )}
        {hasEncoded && !isPlayerTeamEncoder && isPlayerTeamActive && (
          <button
            className="bordered"
            formMethod="put"
            formAction={generatePath(Route.GameSecretDecodeSkip, { lobbyCode })}
          >
            Skip
          </button>
        )}
      </fetcher.Form>
    </div>
  );
});
