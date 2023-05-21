import React, { memo, useMemo } from 'react';
import {
  Form,
  generatePath,
  Link,
  useFetcher,
  useParams,
} from 'react-router-dom';
import invariant from 'ts-invariant';
import { type Team, Color, objectKeys, Route } from '../../common';
import { useLobby } from './Lobby';

export function LobbyMenu() {
  const { playerName, lobby } = useLobby();
  invariant(playerName, 'playerName missing');
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'lobbyCode missing');
  const isLeader = lobby?.leader === playerName;

  const teams = useMemo(() => {
    return objectKeys(Color).map(
      (color): Team =>
        lobby?.teams.find(team => team.color === color) ?? {
          color,
          players: [],
        },
    );
  }, [lobby]);

  return (
    <div className="LobbyMenu">
      {isLeader && (
        <Form
          className="LobbyMenu_controls"
          method="post"
          action={generatePath(Route.GameStart, { lobbyCode })}
        >
          <input
            hidden={true}
            name="playerName"
            value={playerName}
            readOnly={true}
          />
          <button className="bordered">Start game</button>
          <hr />
          <Link
            role="button"
            to={generatePath(Route.GameConfigure, { lobbyCode })}
            className="bordered"
          >
            Configure custom game
          </Link>
        </Form>
      )}
      <div className="LobbyMenu_teams">
        {teams.map(team => (
          <Team key={team.color} team={team} />
        ))}
      </div>
    </div>
  );
}

const Team = memo(({ team }: { team: Team }) => {
  const fetcher = useFetcher();
  const { lobby, playerName } = useLobby();
  invariant(lobby, 'TODO: blow up');
  invariant(playerName, 'TODO: also blow up');
  const lobbyCode = lobby.code;
  const teamColor = team.color;
  const isMember = team.players.includes(playerName);
  const isEncoder = team.players[0] === playerName;
  const canJoin = !isMember;
  const canPromote = isMember && !isEncoder;
  const canDemote = isMember && isEncoder && team.players.length > 1;
  const formAction = canDemote
    ? generatePath(Route.TeamEncoderDemote, { lobbyCode, teamColor })
    : canPromote
    ? generatePath(Route.TeamEncoderPromote, { lobbyCode, teamColor })
    : canJoin
    ? generatePath(Route.TeamJoin, { lobbyCode, teamColor })
    : undefined;

  return (
    <article className="Team">
      <fetcher.Form method="put">
        <button
          className="Team_header"
          formAction={formAction}
          name="playerName"
          value={playerName}
          disabled={!canDemote && !canPromote && !canJoin}
          style={{
            // @ts-ignore
            '--teamColor': Color[team.color],
          }}
        >
          <span>{team.color} team</span>
          {canDemote && <span>Demote</span>}
          {canPromote && <span>Promote</span>}
          {canJoin && <span>Join</span>}
        </button>
      </fetcher.Form>
      {team.players.map(player => {
        const isLeader = player === lobby?.leader;
        const isEncoder = player === team.players[0];
        return (
          <div
            key={player}
            className={`Team_member ${isLeader ? 'leader' : ''}`}
          >
            <span>{player}</span>
            {isEncoder && <span className="encoder">📟</span>}
          </div>
        );
      })}
    </article>
  );
});
