import { type SECRET_BANK } from './server/game';

export const DEFAULT_SECRET_CATEGORIES: Array<keyof typeof SECRET_BANK> = [
  'Animals',
  'Entertainment',
  'Misc',
  'Sports',
];

export type Maybe<T> = T | undefined | null;

export const TimeLimit = {
  '10s': 10,
  '20s': 20,
  '30s': 30,
  '1m': 60,
  '5m': 300,
  '10m': 600,
} as const;

export type TimeLimit = (typeof TimeLimit)[keyof typeof TimeLimit];

export const Colors = {
  0: { name: 'Blue', value: 'hsl(228, 79%, 69%)' },
  1: { name: 'Red', value: 'hsl(1, 100%, 62%)' },
  2: { name: 'Orange', value: 'hsl(20, 100%, 61%)' },
  3: { name: 'Yellow', value: 'hsl(46, 100%, 50%)' },
  4: { name: 'Pink', value: 'hsl(350, 100%, 73%)' },
  5: { name: 'Purple', value: 'hsl(288, 76%, 69%)' },
} as const;

export type Color = keyof typeof Colors;

export function colorName<TColor extends Color>(
  color: TColor,
): (typeof Colors)[TColor]['name'] {
  return Colors[color]?.['name'];
}

export function colorValue<TColor extends Color>(
  color: TColor,
): (typeof Colors)[TColor]['value'] {
  return Colors[color]?.['value'];
}

export const DecodeMethod = {
  First: 0,
  All: 1,
  Majority: 2,
} as const;

export type DecodeMethod = (typeof DecodeMethod)[keyof typeof DecodeMethod];

export interface GameConfig {
  encodeTimeLimit: number;
  decodeTimeLimit: number;
  secretCount: number;
  virusCount: number;
  decodeMethod: DecodeMethod;
  allowExtraDecode: boolean;
  categories: Array<string>;
}

export const defaultGameConfigWithoutCategories: Omit<
  GameConfig,
  'categories'
> = {
  encodeTimeLimit: TimeLimit['5m'],
  decodeTimeLimit: TimeLimit['5m'],
  secretCount: 8,
  virusCount: 1,
  decodeMethod: DecodeMethod.Majority,
  allowExtraDecode: true,
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  ...defaultGameConfigWithoutCategories,
  categories: DEFAULT_SECRET_CATEGORIES,
};

export interface Team {
  color: Color;
  players: Array<string>;
}

export type LobbyCode = string;

export function LobbyCode(code: Maybe<string>) {
  if (code == null || !/[A-Za-z]{4}/.test(code.trim())) {
    return null;
  }
  return code.trim().toUpperCase() as LobbyCode;
}

export interface Lobby {
  leader: string;
  activeGame?: Maybe<Game>;
  teams: Array<Team>;
}

export type Game = {
  config: GameConfig;
  activeTeam: Color;
  encodeStartTime?: Maybe<number>; // seconds since epoch
  decodeStartTime?: Maybe<number>; // seconds since epoch
  secrets: Array<Secret>;
  signal?: Maybe<string>;
  secretCount?: Maybe<number>;
  eliminatedTeams?: Maybe<Array<Color>>;
};

export const SecretType = {
  Secret: 0,
  Virus: 1,
  Null: 2,
} as const;

export type SecretType = (typeof SecretType)[keyof typeof SecretType];

export const ErrorCode = {
  LobbyNotFound: 0,
  GameInProgress: 1,
  Unknown: -1,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface DecodeAttempt {
  teamColor: Color;
  players: Array<string>;
}

export type Secret = {
  value: string;
} & (
  | {
      decodeTeamColor?: Maybe<Color>;
      decodeAttempt?: never;
    }
  | {
      decodeTeamColor?: never;
      decodeAttempt?: Maybe<DecodeAttempt>;
    }
) &
  (
    | // team secret
    {
        type: typeof SecretType.Secret;
        teamColor: Color;
      }
    // null or virus
    | {
        type: typeof SecretType.Null | typeof SecretType.Virus;
      }
  );

export const Route = {
  Index: '/',
  Categories: '/categories',
  LobbyCreate: '/lobby/create',
  Lobby: '/:lobbyCode',
  LobbyJoin: '/:lobbyCode/join',
  LobbyLeave: '/:lobbyCode/leave',
  LobbyDisband: '/:lobbyCode/disband',
  LobbyState: '/:lobbyCode/stats',
  LobbyTeamJoin: '/:lobbyCode/:teamColor/join',
  LobbyTeamEncoderPromote: '/:lobbyCode/:teamColor/promote',
  LobbyTeamEncoderDemote: '/:lobbyCode/:teamColor/demote',
  Game: '/:lobbyCode/game',
  GameConfigure: '/:lobbyCode/game/configure',
  GameStart: '/:lobbyCode/game/start',
  GameSecretEncode: '/:lobbyCode/game/encode',
  GameSecretDecode: '/:lobbyCode/game/decode',
  GameSecretDecodeCancel: '/:lobbyCode/game/decode-cancel',
  GameSecretDecodeSkip: '/:lobbyCode/game/decode-skip',
} as const;

export interface CategoriesResponse {
  categories: Array<{ category: string; isDefault?: 1 }>;
}

export interface LobbyCreateResponse {
  lobbyCode: LobbyCode;
}

export function objectKeys<TObject extends object>(
  object: TObject,
): Array<keyof TObject> {
  return Object.keys(object) as Array<keyof TObject>;
}

export const API_PORT = process.env['PORT'] as string;

export function createLobby(leaderName: string): Lobby {
  return {
    leader: leaderName,
    activeGame: null,
    teams: objectKeys(Colors).map((color, index) => ({
      color: Number(color) as Color,
      players: index === 0 ? [leaderName] : [],
    })),
  };
}

export function getWinningTeam(lobby: Lobby) {
  const game = lobby.activeGame;
  if (game == null) {
    return null;
  }
  return lobby.teams.find(team => {
    const teamSecrets = game.secrets.filter(secret => {
      return (
        secret.type === SecretType.Secret && secret.teamColor === team.color
      );
    });
    if (teamSecrets.length === 0) {
      return false;
    }
    return teamSecrets.every(secret => secret.decodeTeamColor != null);
  });
}
