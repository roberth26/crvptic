import shuffleArray from 'shuffle-array';
import uuid from 'shortid';
import {
  createLobbyCode,
  DecodeMethod,
  DEFAULT_GAME_CONFIG,
  type Secret,
  SecretType,
  SECRET_BANK,
  type Lobby,
  type Maybe,
} from '../common';
import { EventType, type Event } from './events';

export function reducer(lobby = createLobby(), event: Event): Lobby {
  switch (event.type) {
    case EventType.CreateLobby: {
      const {
        payload: { leaderName },
      } = event;
      return createLobby(leaderName);
    }

    case EventType.StartGame: {
      const config = {
        ...DEFAULT_GAME_CONFIG,
        ...event.payload.config,
      };
      const teams = lobby.teams.filter(team => team.players.length);
      // invariant(nonEmptyTeams.length >= 2, '<2 non-empty teams detected');
      // const players = lobby.teams.flatMap(team => team.players);
      // const freeAgents = players.filter(player =>
      //   teams.every(team => !team.players.includes(player)),
      // );
      // invariant(freeAgents.length === 0, 'free-agents detected');
      // const partialTeams = teams.filter(team => team.players.length < 2);
      const totalTeamSecrets = config.secretCount * lobby.teams.length;
      const totalNulls = config.secretCount;
      const totalViruses = config.virusCount;
      const totalSecrets = totalTeamSecrets + totalNulls + totalViruses;
      const secretBank = shuffleArray(
        Object.entries(SECRET_BANK)
          .filter(([category]) => config.categories.includes(category))
          .map(([, secrets]) => secrets)
          .flat(),
      ).slice(0, totalSecrets);
      let secrets: Array<Secret> = [];
      // team secrets
      teams.forEach(team => {
        secrets.push(
          ...secretBank.splice(0, config.secretCount).map(
            (secret): Secret => ({
              type: SecretType.Secret,
              value: secret,
              teamColor: team.color,
            }),
          ),
        );
      });
      // nulls
      secrets.push(
        ...secretBank.splice(0, totalNulls).map(
          (secret): Secret => ({
            type: SecretType.Null,
            value: secret,
          }),
        ),
      );
      // viruses
      secrets.push(
        ...secretBank.splice(0, totalViruses).map(
          (secret): Secret => ({
            type: SecretType.Virus,
            value: secret,
          }),
        ),
      );
      secrets = shuffleArray(secrets);
      return {
        ...lobby,
        activeGame: {
          id: uuid(),
          config,
          encodingTeamColor: teams[0]!.color,
          secrets,
        },
      };
    }

    case EventType.JoinLobby:
    case EventType.JoinTeam: {
      const { playerName, teamColor: newTeamColor } = event.payload;
      const currentTeam = lobby.teams.find(team => {
        return team.players.includes(playerName);
      });
      if (
        currentTeam &&
        (!newTeamColor || currentTeam.color === newTeamColor)
      ) {
        return lobby;
      }

      return {
        ...lobby,
        teams: lobby.teams.map((team, index) => {
          const isCurrentTeam = team === currentTeam;

          if (isCurrentTeam) {
            const newPlayers = team.players.filter(
              player => player !== playerName,
            );
            return {
              ...team,
              players: newPlayers,
            };
          }

          const isNewTeam = team.color === newTeamColor;

          if (isNewTeam) {
            return {
              ...team,
              players: [...team.players, playerName],
            };
          }

          const isJoinLobby = event.type === EventType.JoinLobby;
          const isFirstTeam = index === 0;

          if (isJoinLobby && isFirstTeam) {
            return {
              ...team,
              players: [...team.players, playerName],
            };
          }

          return team;
        }),
      };
    }

    case EventType.LeaveLobby: {
      const {
        payload: { playerName },
      } = event;
      return {
        ...lobby,
        teams: lobby.teams.map(team => {
          const isTeam = team.players.includes(playerName);
          if (!isTeam) {
            return team;
          }
          return {
            ...team,
            players: team.players.filter(player => player !== playerName),
          };
        }),
      };
    }

    case EventType.DemoteEncoder: {
      const {
        payload: { playerName },
      } = event;
      return {
        ...lobby,
        teams: lobby.teams.map(team => {
          const canDemote = team.players.length > 1;
          const isTeam = team.players.includes(playerName);
          if (!canDemote || !isTeam) {
            return team;
          }
          return {
            ...team,
            players: team.players.slice(1).concat(team.players[0]!),
          };
        }),
      };
    }

    case EventType.PromoteEncoder: {
      const {
        payload: { playerName },
      } = event;
      return {
        ...lobby,
        teams: lobby.teams.map(team => {
          const isTeam = team.players.includes(playerName);
          const isEncoder = team.players[0] === playerName;
          if (!isTeam || isEncoder) {
            return team;
          }
          return {
            ...team,
            players: [
              playerName,
              ...team.players.filter(player => player !== playerName),
            ],
          };
        }),
      };
    }

    case EventType.EncodeSecret: {
      const {
        payload: { signal, secretCount },
      } = event;
      const activeGame = lobby.activeGame;
      if (activeGame == null) {
        return lobby;
      }
      return {
        ...lobby,
        activeGame: {
          ...activeGame,
          signal,
          secretCount,
        },
      };
    }

    case EventType.DecodeSecret: {
      const {
        payload: { playerName, secret: decodedSecret },
      } = event;
      const activeGame = lobby.activeGame;
      if (activeGame == null) {
        return lobby;
      }
      const team = lobby.teams.find(team => team.players.includes(playerName));
      if (team == null) {
        return lobby;
      }
      return {
        ...lobby,
        activeGame: {
          ...activeGame,
          secrets: activeGame.secrets.map(secret => {
            const wasSecretDecoded = secret.value === decodedSecret;
            const hasPlayerDecoded = Boolean(
              secret.decodeAttempt?.players.includes(playerName),
            );
            if (!wasSecretDecoded || secret.isDecoded || hasPlayerDecoded) {
              return secret;
            }

            const decodedPlayers = [
              ...(secret.decodeAttempt?.players ?? []),
              playerName,
            ];

            const decodeMethod = activeGame.config.decodeMethod;

            const isDecoded =
              decodeMethod === DecodeMethod.All
                ? decodedPlayers.length === team.players.length
                : decodeMethod === DecodeMethod.First
                ? true
                : decodeMethod === DecodeMethod.Majority
                ? decodedPlayers.length >= Math.ceil(team.players.length / 2)
                : false;

            return {
              ...secret,
              isDecoded: isDecoded ? 1 : 0,
              decodeAttempt: {
                teamColor: team.color,
                players: decodedPlayers,
              },
            };
          }),
        },
      };
    }

    case EventType.CancelDecodeSecret: {
      const {
        payload: { playerName, secret: decodedSecret },
      } = event;
      const activeGame = lobby.activeGame;
      if (activeGame == null) {
        return lobby;
      }
      const team = lobby.teams.find(team => team.players.includes(playerName));
      if (team == null) {
        return lobby;
      }
      return {
        ...lobby,
        activeGame: {
          ...activeGame,
          secrets: activeGame.secrets.map(secret => {
            const decodeAttempt = secret.decodeAttempt;
            if (decodeAttempt == null) {
              return secret;
            }
            const wasSecretDecoded = secret.value === decodedSecret;
            const hasPlayerDecoded = Boolean(
              decodeAttempt.players.includes(playerName),
            );
            if (!wasSecretDecoded || secret.isDecoded || !hasPlayerDecoded) {
              return secret;
            }

            const decodedPlayers = decodeAttempt.players.filter(
              player => player !== playerName,
            );

            return {
              ...secret,
              decodeAttempt: {
                ...decodeAttempt,
                players: decodedPlayers,
              },
            };
          }),
        },
      };
    }

    default:
      return lobby;
  }
}

export function createLobby(leaderName?: Maybe<string>): Lobby {
  return {
    code: createLobbyCode(),
    leader: leaderName,
    activeGame: null,
    teams: [
      {
        color: 'Blue',
        players: leaderName ? [leaderName] : [],
      },
      {
        color: 'Red',
        players: [],
      },
      {
        color: 'Orange',
        players: [],
      },
      {
        color: 'Yellow',
        players: [],
      },
      {
        color: 'Pink',
        players: [],
      },
      {
        color: 'Purple',
        players: [],
      },
    ],
  };
}

export function getEncodingTeam(lobby: Lobby) {
  const teamColor = lobby.activeGame?.encodingTeamColor;
  return teamColor == null
    ? null
    : lobby.teams.find(team => team.color === teamColor);
}
