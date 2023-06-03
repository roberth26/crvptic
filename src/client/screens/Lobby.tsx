import React, { memo, useMemo } from 'react';
import { generatePath, Link } from 'react-router-dom';
import {
  type Team,
  Colors,
  objectKeys,
  Route,
  colorValue,
  colorName,
  type Color,
  EventType,
} from '../../common';
import {
  useLeaderTeam,
  useLobby,
  useLobbyCode,
  usePlayerName,
} from '../components/LobbyLayout';
import * as EventForm from '../components/EventForm';

export function Lobby() {
  const eventFetcher = EventForm.useEventFetcher();
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
      <eventFetcher.Form className="LobbyMenu_controls">
        {isLeader && (
          <>
            <button
              className="bordered"
              name="type"
              value={EventType.StartGame}
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
        )}
        {!isLeader && (
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
        <button className="bordered" name="type" value={EventType.LeaveLobby}>
          Leave lobby
        </button>
        {isLeader && (
          <button
            className="bordered"
            name="type"
            value={EventType.DisbandLobby}
          >
            Disband lobby
          </button>
        )}
      </eventFetcher.Form>
      <div className="LobbyMenu_teams">
        {allTeams.map(team => (
          <Team key={team.color} team={team} />
        ))}
      </div>
    </div>
  );
}

const Team = memo(({ team }: { team: Team }) => {
  const eventFetcher = EventForm.useEventFetcher();
  const playerName = usePlayerName();
  const teamColor = team.color;
  const isMember = team.players.includes(playerName);
  const isEncoder = team.players[0] === playerName;
  const canJoin = !isMember;
  const canPromote = isMember && !isEncoder;
  const canDemote = isMember && isEncoder && team.players.length > 1;

  return (
    <article className="Team">
      <eventFetcher.Form>
        {canJoin && (
          <EventForm.Event type={EventType.JoinTeam} teamColor={teamColor} />
        )}
        {canPromote && <EventForm.Event type={EventType.PromoteEncoder} />}
        {canDemote && <EventForm.Event type={EventType.DemoteEncoder} />}
        <button
          className="Team_header"
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
      </eventFetcher.Form>
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
