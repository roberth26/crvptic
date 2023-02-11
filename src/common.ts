export type Maybe<T> = T | undefined | null;

export const TimeLimit = {
  '10s': 10,
  '20s': 20,
  '30s': 30,
  '1m': 60,
  '5m': 300,
  '10m': 600,
} as const;

export type TimeLimit = typeof TimeLimit[keyof typeof TimeLimit];

export const Color = {
  Blue: 'hsl(228, 79%, 69%)',
  Red: 'hsl(1, 100%, 62%)',
  Orange: 'hsl(20, 100%, 61%)',
  Yellow: 'hsl(46, 100%, 50%)',
  Pink: 'hsl(350, 100%, 73%)',
  Purple: 'hsl(288, 76%, 69%)',
} as const;

export type TeamColor = keyof typeof Color;

export type Color = typeof Color[TeamColor];

export const DecodeMethod = {
  First: 'FIRST',
  All: 'ALL',
  Majority: 'MAJORITY',
} as const;

export type DecodeMethod = typeof DecodeMethod[keyof typeof DecodeMethod];

export interface GameConfig {
  encodeTimeLimit: number;
  decodeTimeLimit: number;
  secretCount: number;
  virusCount: number;
  decodeMethod: DecodeMethod;
  allowExtraDecode: boolean;
  categories: Array<string>;
}

export const defaultGameConfigWithoutCategories: GameConfig = {
  encodeTimeLimit: TimeLimit['5m'],
  decodeTimeLimit: TimeLimit['5m'],
  secretCount: 8,
  virusCount: 1,
  decodeMethod: DecodeMethod.Majority,
  allowExtraDecode: true,
  categories: [], // to be filled in
};

export type ID = string;

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

export interface Team {
  color: TeamColor;
  players: Array<string>;
  encoder: Maybe<string>;
}

export type LobbyCode = string;

export interface Lobby {
  code: LobbyCode;
  leader: Maybe<string>;
  activeGame?: Maybe<Game>;
  teams: Array<Team>;
}

export type GameID = ID;

export type Game = {
  id: GameID;
  config: GameConfig;
  state: GameState;
  secrets: Array<Secret>;
};

export type GameState =
  | {
      state: 'ENCODING';
      teamColor: TeamColor;
    }
  | {
      state: 'DECODING';
      teamColor: TeamColor;
      signal: string;
      secretCount: number;
    };

export type Secret = {
  secret: string;
  decodeAttempt?: Maybe<{
    teamColor: TeamColor;
    key: string;
  }>;
} & (
  | // team secret
  {
      teamColor: TeamColor;
    }
  // neutral secret
  | {}
  // virus
  | {
      isVirus: true;
    }
);

export const UIRoute = {
  JoinCreateLobby: '/',
  Lobby: '/:lobbyCode',
  ConfigureGame: '/:lobbyCode/config',
} as const;

const API_ROUTE_BASE = '/api' as const;

export const APIRoute = {
  Category: `${API_ROUTE_BASE}/category`,
  Lobby: `${API_ROUTE_BASE}/lobby/:lobbyCode?`,
  Game: `${API_ROUTE_BASE}/game`,
} as const;

export interface CategoryGetResponse {
  categories: Array<{ category: string; isDefault?: 1 }>;
}

export type LobbyPostRequest = {
  playerName: string;
};

export interface LobbyPostResponse {
  lobbyCode: LobbyCode;
}

export type LobbyPutRequest =
  | {
      op: 'JOIN';
      playerName: string;
      teamColor?: TeamColor;
    }
  | {
      op: 'PROMOTE_DECODER';
      playerName: string;
      teamColor: TeamColor;
    }
  | {
      op: 'DEMOTE_DECODER';
      teamColor: TeamColor;
    }
  | {
      op: 'LEAVE';
      playerName: string;
    };

export interface LobbyPutResponse {
  lobbyCode: LobbyCode;
}

export interface LobbyDeleteRequest {}

export interface LobbyPutResponse {}

export interface GamePostRequest {
  lobbyCode: LobbyCode;
  playerName: string;
  gameConfig?: GameConfig;
}

export interface GamePostResponse {}

export type GamePutRequest = {
  lobbyCode: LobbyCode;
  playerName: string;
} & (
  | {
      op: 'ENCODE';
      signal: string;
      secretCount: number;
    }
  | {
      op: 'DECODE';
      signal: string;
    }
  | {
      op: 'CANCEL_DECODE';
      signal: string;
    }
  | {
      op: 'SKIP_DECODE';
    }
  | {
      op: 'CANCEL_SKIP_DECODE';
    }
);

export interface GamePutResponse {}

export function objectKeys<TObject extends object>(
  object: TObject,
): Array<keyof TObject> {
  return Object.keys(object) as Array<keyof TObject>;
}
