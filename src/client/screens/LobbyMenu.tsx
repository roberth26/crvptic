import { useMutation } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { Form, generatePath, Link, useParams } from 'react-router-dom';
import invariant from 'ts-invariant';
import {
  type Team,
  UIRoute,
  Color,
  objectKeys,
  type Lobby,
  type Maybe,
  type LobbyPutRequest,
  APIRoute,
} from '../../common';
import { useLobby } from './Lobby';

export function LobbyMenu() {
  const { playerName, lobby } = useLobby();
  invariant(playerName, 'playerName missing');
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'lobbyCode missing');

  const { mutate: putLobby } = useMutation({
    mutationFn: (request: LobbyPutRequest) => {
      return fetch(generatePath(APIRoute.Lobby, { lobbyCode }), {
        method: 'PUT',
        body: JSON.stringify(request),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  });

  const isLeader = lobby?.leader === playerName;

  const teams = useMemo(() => {
    return objectKeys(Color).map(
      (color): Team =>
        lobby?.teams.find(team => team.color === color) ?? {
          color,
          players: [],
          encoder: null,
        },
    );
  }, [lobby]);

  return (
    <div className="LobbyMenu">
      {isLeader && (
        <Form className="LobbyMenu_controls" method="post">
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
          <button>Start game</button>
          <hr />
          <Link
            role="button"
            to={generatePath(UIRoute.ConfigureGame, { lobbyCode })}
          >
            Configure custom game
          </Link>
        </Form>
      )}
      <div className="LobbyMenu_teams">
        {teams.map(team => (
          <Team
            key={team.color}
            team={team}
            lobby={lobby}
            playerName={playerName}
            onJoin={() => {
              putLobby({ op: 'JOIN', playerName, teamColor: team.color });
            }}
            onEncoderPromote={() => {
              putLobby({
                op: 'PROMOTE_DECODER',
                playerName,
                teamColor: team.color,
              });
            }}
            onEncoderDemote={() => {
              putLobby({
                op: 'DEMOTE_DECODER',
                teamColor: team.color,
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Team({
  team,
  lobby,
  onJoin,
  onEncoderPromote,
  onEncoderDemote,
  playerName,
}: {
  team: Team;
  lobby: Maybe<Lobby>;
  onJoin: () => void;
  onEncoderPromote: () => void;
  onEncoderDemote: () => void;
  playerName: string;
}) {
  const isMember = team.players.includes(playerName);
  const isEncoder = team.encoder === playerName;
  const canJoin = !isMember;
  const canPromote = isMember && !isEncoder;
  const canDemote = isMember && isEncoder && team.players.length > 1;

  return (
    <article className="Team">
      <button
        className="Team_header"
        onClick={
          canDemote
            ? onEncoderDemote
            : canPromote
            ? onEncoderPromote
            : canJoin
            ? onJoin
            : () => invariant(false, 'unhandled!')
        }
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
      {team.players.map(player => {
        const isLeader = player === lobby?.leader;
        const isEncoder = player === team.encoder;
        return (
          <div
            key={player}
            className={`Team_member ${isLeader ? 'leader' : ''}`}
          >
            <span>{player}</span>
            {isEncoder && <span className="encoder">🔮</span>}
          </div>
        );
      })}
    </article>
  );
}
