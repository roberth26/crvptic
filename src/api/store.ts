import shortid from 'shortid';
import invariant from 'ts-invariant';
import shuffleArray from 'shuffle-array';
import {
  type LobbyCode,
  type Lobby,
  type GameConfig,
  type Secret,
  type TeamColor,
  defaultGameConfigWithoutCategories,
  objectKeys,
} from '../common';
import Adult from '../../data/adult.json';
import Misc from '../../data/misc.json';
import Sports from '../../data/sports.json';
import Animals from '../../data/animals.json';
import Entertainment from '../../data/entertainment.json';

const SECRET_BANK = {
  Animals,
  Entertainment,
  Misc,
  Sports,
  Adult,
};

const DEFAULT_SECRET_CATEGORIES: Array<keyof typeof SECRET_BANK> = [
  'Animals',
  'Entertainment',
  'Misc',
  'Sports',
];

const DEFAULT_GAME_CONFIG: GameConfig = {
  ...defaultGameConfigWithoutCategories,
  categories: DEFAULT_SECRET_CATEGORIES,
};

type GenericSubscriber = () => void;
type LobbySubscriber = (Lobby: Lobby) => void;

interface State {
  lobbiesByCode: Record<LobbyCode, Lobby>;
  LobbySubscribersByLobbyCode: Record<LobbyCode, Set<LobbySubscriber>>;
  tickersByLobbyCode: Record<LobbyCode, NodeJS.Timer>;
  disposeSubscribers: Set<GenericSubscriber>;
}

export function createStore() {
  const state: State = {
    lobbiesByCode: {},
    LobbySubscribersByLobbyCode: {},
    tickersByLobbyCode: {},
    disposeSubscribers: new Set(),
  };

  const getSecrets = () => {
    return SECRET_BANK;
  };

  const getSecretCategories = () => {
    return objectKeys(getSecrets());
  };

  const getDefaultSecretCategories = () => {
    return DEFAULT_SECRET_CATEGORIES;
  };

  const onDispose = (subscriber: GenericSubscriber) => {
    state.disposeSubscribers.add(subscriber);
    return () => {
      state.disposeSubscribers.delete(subscriber);
    };
  };

  const dispose = () => {
    state.disposeSubscribers.forEach(subscriber => subscriber());
    Object.keys(state.tickersByLobbyCode).forEach(lobbyCode => {
      stopTicking(lobbyCode);
    });
  };

  const stopTicking = (lobbyCode: LobbyCode) => {
    clearInterval(state.tickersByLobbyCode[lobbyCode]);
    delete state.tickersByLobbyCode[lobbyCode];
  };

  const restartTicking = (lobbyCode: LobbyCode) => {
    const tick = () => {
      const subscribers = state.LobbySubscribersByLobbyCode[lobbyCode];
      if (subscribers == null) {
        return;
      }
      const lobby = state.lobbiesByCode[lobbyCode];
      invariant(lobby != null, `'${lobbyCode}' missing in lobbiesByCode`);
      subscribers.forEach(subscriber => subscriber(lobby));
    };
    stopTicking(lobbyCode);
    state.tickersByLobbyCode[lobbyCode] = setInterval(tick, 2000);
    tick(); // immediate updates
  };

  const onLobby = (lobbyCode: LobbyCode, subscriber: LobbySubscriber) => {
    const subscribers =
      state.LobbySubscribersByLobbyCode[lobbyCode] ?? new Set();
    subscribers.add(subscriber);
    state.LobbySubscribersByLobbyCode[lobbyCode] = subscribers;
    return () => {
      state.LobbySubscribersByLobbyCode[lobbyCode]?.delete(subscriber);
    };
  };

  const createLobby = (leaderName: string) => {
    const lobby: Lobby = {
      code: createLobbyCode(),
      leader: leaderName,
      activeGame: null,
      teams: [
        {
          color: 'Blue',
          players: [],
          encoder: null,
        },
        {
          color: 'Red',
          players: [],
          encoder: null,
        },
        {
          color: 'Orange',
          players: [],
          encoder: null,
        },
        {
          color: 'Yellow',
          players: [],
          encoder: null,
        },
        {
          color: 'Pink',
          players: [],
          encoder: null,
        },
        {
          color: 'Purple',
          players: [],
          encoder: null,
        },
      ],
    };
    state.lobbiesByCode[lobby.code] = lobby;
    return lobby;
  };

  const createGame = (
    lobbyCode: LobbyCode,
    gameConfig: GameConfig = DEFAULT_GAME_CONFIG,
  ) => {
    const lobby = state.lobbiesByCode[lobbyCode];
    invariant(lobby != null, `'${lobbyCode}' missing in lobbiesByCode`);
    const teams = lobby.teams.filter(team => team.players.length);
    // invariant(nonEmptyTeams.length >= 2, '<2 non-empty teams detected');
    const players = lobby.teams.flatMap(team => team.players);
    const freeAgents = players.filter(player =>
      teams.every(team => !team.players.includes(player)),
    );
    // invariant(freeAgents.length === 0, 'free-agents detected');
    const partialTeams = teams.filter(team => team.players.length < 2);
    // invariant(partialTeams.length === 0, 'partial teams detected');
    const totalTeamSecrets = gameConfig.secretCount * teams.length;
    const totalNeutralSecrets = gameConfig.secretCount;
    const totalViruses = gameConfig.virusCount;
    const totalSecrets = totalTeamSecrets + totalNeutralSecrets + totalViruses;
    const secretBank = shuffleArray(
      Object.entries(SECRET_BANK)
        .filter(([category]) => gameConfig.categories.includes(category))
        .map(([, secrets]) => secrets)
        .flat(),
    ).slice(0, totalSecrets);
    let secrets: Array<Secret> = [];
    // team secrets
    teams.forEach(team => {
      secrets.push(
        ...secretBank.splice(0, gameConfig.secretCount).map(
          (secret): Secret => ({
            secret,
            teamColor: team.color,
          }),
        ),
      );
    });
    // neutral secrets
    secrets.push(
      ...secretBank.splice(0, totalNeutralSecrets).map(
        (secret): Secret => ({
          secret,
        }),
      ),
    );
    // viruses
    secrets.push(
      ...secretBank.splice(0, totalViruses).map(
        (secret): Secret => ({
          secret,
          isVirus: true,
        }),
      ),
    );
    secrets = shuffleArray(secrets);
    // TODO: possibly terminate ACTIVE game
    lobby.activeGame = {
      id: shortid.generate(),
      config: gameConfig,
      state: {
        state: 'ENCODING',
        teamColor: teams[0]!.color,
      },
      secrets,
    };
    restartTicking(lobbyCode);
  };

  const joinTeam = ({
    lobbyCode,
    playerName,
    teamColor,
  }: {
    lobbyCode: LobbyCode;
    playerName: string;
    teamColor?: TeamColor;
  }) => {
    const lobby = state.lobbiesByCode[lobbyCode];
    if (lobby == null) {
      return;
    }
    let team = lobby.teams.find(team => {
      return team.players.includes(playerName);
    });
    if (team && (!teamColor || team.color === teamColor)) {
      return lobby;
    }
    if (team && teamColor) {
      team.players = team.players.filter(player => player !== playerName);
      if (team.encoder === playerName) {
        team.encoder = team.players[0];
      }
    }
    team = lobby.teams.find(team => team.color === (teamColor ?? 'Blue'));
    invariant(team, `team color=${teamColor ?? 'Blue'} not found`);
    team.players.push(playerName);
    team.encoder = team.encoder ?? playerName;
    restartTicking(lobbyCode);
    return lobby;
  };

  const subscribePlayer = ({
    lobbyCode,
    playerName,
    onSnapshot: snapshotSubscriber,
    onDispose: disposeSubscriber,
  }: {
    lobbyCode: LobbyCode;
    playerName: string;
    onSnapshot: LobbySubscriber;
    onDispose: GenericSubscriber;
  }) => {
    const lobby = state.lobbiesByCode[lobbyCode];
    if (lobby == null) {
      return null;
    }
    joinTeam({ lobbyCode, playerName });
    const subscribers =
      state.LobbySubscribersByLobbyCode[lobbyCode] ?? new Set();
    subscribers.add(snapshotSubscriber);
    state.LobbySubscribersByLobbyCode[lobbyCode] = subscribers;
    state.disposeSubscribers.add(disposeSubscriber);
    restartTicking(lobbyCode);
    return () => {
      state.LobbySubscribersByLobbyCode[lobbyCode]?.delete(snapshotSubscriber);
      state.disposeSubscribers.delete(disposeSubscriber);
    };
  };

  const demoteEncoder = (lobbyCode: LobbyCode, teamColor: TeamColor) => {
    const lobby = state.lobbiesByCode[lobbyCode];
    invariant(lobby, `lobby lobbyCode=${lobbyCode} not found`);
    const team = lobby.teams.find(team => team.color === teamColor);
    invariant(team, `team color=${teamColor} not found`);
    invariant(team.players.length > 1, 'no other players to promote');
    const encoder = team.encoder;
    invariant(encoder, 'no encoder to demote');
    team.players = team.players
      .filter(player => player !== encoder)
      .concat([encoder]);
    team.encoder = team.players[0];
    restartTicking(lobbyCode);
  };

  const promoteEncoder = ({
    lobbyCode,
    teamColor,
    playerName,
  }: {
    lobbyCode: LobbyCode;
    teamColor: TeamColor;
    playerName: string;
  }) => {
    const lobby = state.lobbiesByCode[lobbyCode];
    if (lobby == null) {
      return;
    }
    const team = lobby.teams.find(team => team.color === teamColor);
    invariant(team, `team color=${teamColor} not found`);
    invariant(team.players.length > 1, 'no other players');
    const isMember = team.players.includes(playerName);
    invariant(
      isMember,
      `player name=${playerName} not member of team color=${teamColor}`,
    );
    team.players = team.players.filter(player => player !== playerName);
    team.players.unshift(playerName);
    team.encoder = team.players[0];
    restartTicking(lobbyCode);
  };

  return {
    getSecrets,
    getSecretCategories,
    getDefaultSecretCategories,
    onDispose,
    onLobby,
    createLobby,
    createGame,
    joinTeam,
    dispose,
    subscribePlayer,
    demoteEncoder,
    promoteEncoder,
  };
}

const usedLobbyCodes = new Set<LobbyCode>();
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function createLobbyCode(): LobbyCode {
  let code: LobbyCode;
  do {
    code = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  } while (usedLobbyCodes.has(code));
  usedLobbyCodes.add(code);
  return code;
}
