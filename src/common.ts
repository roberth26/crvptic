export type Maybe<T> = T | undefined | null;

export const MS_IN_SEC = 1000 as const;

export const TimeLimit = {
  '10s': 10000,
  '20s': 20000,
  '30s': 30000,
  '1m': 60000,
  '5m': 300000,
  '10m': 600000,
} as const;

export type TimeLimit = typeof TimeLimit[keyof typeof TimeLimit];

export const Color = [
  'red',
  'green',
  'blue',
  'yellow',
  'purple',
  'orange',
] as const;

export const DecodeMethod = {
  First: 'FIRST',
  All: 'ALL',
  Majority: 'MAJORITY',
} as const;

export type DecodeMethod = typeof DecodeMethod[keyof typeof DecodeMethod];

export type Color = typeof Color[keyof typeof Color];

export interface GameConfig {
  encodeTimeLimit: number;
  decodeTimeLimit: number;
  secretCount: number;
  virusCount: number;
  decodeMethod: DecodeMethod;
  allowExtraDecode: boolean;
  categories: Array<string>;
}

export type ID = string;

export type TeamID = ID;

export interface Team {
  id: TeamID;
  slug: string;
  name: string;
  players: Array<PlayerID>;
  color: Color;
}

export type PlayerID = ID;

export interface Player {
  id: PlayerID;
  name: string;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  winsAsEncoder: number;
  encoderAvgSecretKeyTime: number;
}

export type GameCode = string;

export interface Game {
  code: GameCode;
  config: GameConfig;
  teamIDs: Array<TeamID>;
  secrets: Record<
    string,
    {
      secret: string;
      teamID: TeamID;
      decodeAttempt: Maybe<{
        teamID: TeamID;
        key: string;
      }>;
    }
  >;
}

export const GameState = {
  Pre: 'PRE',
  Mid: 'MID',
  Post: 'POST',
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

export const Routes = {
  Index: '/', // [JOIN_GAME] | [CREATE_GAME]
  CreateGame: '/create', // [...CONFIG] | [CREATE]
  Game: '/:gameCode',
} as const;

export interface GetCategoriesResponse {
  categories: Array<string>;
}

export interface CreateGameRequest {
  gameConfig: GameConfig;
}

export interface CreateGameResponse {
  gameCode: GameCode;
}

export type Event = {
  CreateGame: {
    type: 'CREATE_GAME';
    payload: {
      config: GameConfig;
    };
  };
};
