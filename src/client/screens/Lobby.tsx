import React, { memo, useMemo } from 'react';
import { Form, generatePath, Link, useFetcher } from 'react-router-dom';
import {
  type Team,
  Colors,
  objectKeys,
  Route,
  colorValue,
  colorName,
  type Color,
} from '../../common';
import {
  useLeaderTeam,
  useLobby,
  useLobbyCode,
  usePlayerName,
} from '../components/LobbyLayout';

export function Lobby() {
  const lobbyCode = useLobbyCode();
  const playerName = usePlayerName();
  const leaderTeam = useLeaderTeam();
  const { leader, teams } = useLobby();
  const isLeader = leader === playerName;

  const allTeams = useMemo(() => {
    return objectKeys(Colors)
      .map(color => Number(color) as Color)
      .map(
        (color): Team => ({
          color,
          players: teams.find(team => team.color === color)?.players ?? [],
        }),
      );
  }, [teams]);

  return (
    <div className="LobbyMenu">
      <Form className="LobbyMenu_controls">
        <input
          hidden={true}
          name="playerName"
          value={playerName}
          readOnly={true}
        />
        {isLeader ? (
          <>
            <button
              className="bordered"
              formMethod="post"
              formAction={generatePath(Route.GameStart, { lobbyCode })}
            >
              Start game
            </button>
            <Link
              role="button"
              to={generatePath(Route.GameConfigure, { lobbyCode })}
              className="bordered"
            >
              Configure custom game
            </Link>
          </>
        ) : (
          <span>
            Waiting for&nbsp;
            <span
              className="leader-team"
              style={{
                // @ts-ignore
                '--leader-team-color': colorValue(leaderTeam.color),
              }}
            >
              {leader}
            </span>
            &nbsp;to start a game.
          </span>
        )}
        <hr />
        <button
          className="bordered"
          formMethod="put"
          formAction={generatePath(Route.LobbyLeave, { lobbyCode })}
        >
          Leave lobby
        </button>
        {isLeader && (
          <button
            className="bordered"
            formMethod="delete"
            formAction={generatePath(Route.LobbyDisband, { lobbyCode })}
          >
            Disband lobby
          </button>
        )}
      </Form>
      <div className="LobbyMenu_teams">
        {allTeams.map(team => (
          <Team key={team.color} team={team} />
        ))}
      </div>
    </div>
  );
}

const Team = memo(({ team }: { team: Team }) => {
  const fetcher = useFetcher();
  const lobbyCode = useLobbyCode();
  const playerName = usePlayerName();
  const teamColor = team.color;
  const isMember = team.players.includes(playerName);
  const isEncoder = team.players[0] === playerName;
  const canJoin = !isMember;
  const canPromote = isMember && !isEncoder;
  const canDemote = isMember && isEncoder && team.players.length > 1;
  const formAction = canDemote
    ? generatePath(Route.LobbyTeamEncoderDemote, {
        lobbyCode,
        teamColor: String(teamColor),
      })
    : canPromote
    ? generatePath(Route.LobbyTeamEncoderPromote, {
        lobbyCode,
        teamColor: String(teamColor),
      })
    : canJoin
    ? generatePath(Route.LobbyTeamJoin, {
        lobbyCode,
        teamColor: String(teamColor),
      })
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
            '--team-color': colorValue(teamColor),
          }}
        >
          <span>{colorName(teamColor)} team</span>
          {canDemote && <span>Demote</span>}
          {canPromote && <span>Promote</span>}
          {canJoin && <span>Join</span>}
        </button>
      </fetcher.Form>
      {team.players.map(player => {
        const isPlayer = player === playerName;
        const isEncoder = player === team.players[0];
        return (
          <div
            key={player}
            className={`Team_member ${isPlayer ? 'player' : ''}`}
          >
            <span>{player}</span>
            {isEncoder && <span className="encoder">📟</span>}
          </div>
        );
      })}
    </article>
  );
});
