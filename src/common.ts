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
  First: 0,
  All: 1,
  Majority: 2,
} as const;

export type DecodeMethod = typeof DecodeMethod[keyof typeof DecodeMethod];

export interface GameConfig {
  encodeTimeLimit: number;
  decodeTimeLimit: number;
  secretCount: number;
  virusCount: number;
  decodeMethod: DecodeMethod;
  allowExtraDecode: 0 | 1;
  categories: Array<string>;
}

export const defaultGameConfigWithoutCategories: GameConfig = {
  encodeTimeLimit: TimeLimit['5m'],
  decodeTimeLimit: TimeLimit['5m'],
  secretCount: 8,
  virusCount: 1,
  decodeMethod: DecodeMethod.Majority,
  allowExtraDecode: 1,
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
  encodingTeamColor: TeamColor;
  secrets: Array<Secret>;
  signal?: Maybe<string>;
  secretCount?: Maybe<number>;
};

export const SecretType = {
  Secret: 0,
  Virus: 1,
  Null: 2,
} as const;

export type SecretType = typeof SecretType[keyof typeof SecretType];

export interface DecodeAttempt {
  teamColor: TeamColor;
  players: Array<string>;
}

export type Secret = {
  value: string;
} & (
  | {
      isDecoded: 1;
      decodeAttempt: DecodeAttempt;
    }
  | {
      isDecoded?: 0;
      decodeAttempt?: Maybe<DecodeAttempt>;
    }
) &
  (
    | // team secret
    {
        type: typeof SecretType.Secret;
        teamColor: TeamColor;
      }
    // null or virus
    | {
        type: typeof SecretType.Null | typeof SecretType.Virus;
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

export const LobbyPutOp = {
  Join: 0,
  PromoteDecoder: 1,
  DemoteEncoder: 2,
  Leave: 3,
} as const;

export type LobbyPutOp = typeof LobbyPutOp[keyof typeof LobbyPutOp];

export type LobbyPutRequest =
  | {
      op: typeof LobbyPutOp.Join;
      playerName: string;
      teamColor?: TeamColor;
    }
  | {
      op: typeof LobbyPutOp.PromoteDecoder;
      playerName: string;
    }
  | {
      op: typeof LobbyPutOp.DemoteEncoder;
      playerName: string;
    }
  | {
      op: typeof LobbyPutOp.Leave;
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
  gameConfig?: Partial<GameConfig>;
}

export interface GamePostResponse {}

export const GamePutOp = {
  Encode: 0,
  Decode: 1,
  CancelDecode: 2,
  SkipDecode: 3,
  CancelSkipDecode: 4,
} as const;

export type GamePutOp = typeof GamePutOp[keyof typeof GamePutOp];

export type GamePutRequest = {
  lobbyCode: LobbyCode;
  playerName: string;
} & (
  | {
      op: typeof GamePutOp.Encode;
      signal: string;
      secretCount: number;
    }
  | {
      op: typeof GamePutOp.Decode;
      secret: string;
    }
  | {
      op: typeof GamePutOp.CancelDecode;
      secret: string;
    }
  | {
      op: typeof GamePutOp.SkipDecode;
    }
  | {
      op: typeof GamePutOp.CancelSkipDecode;
    }
);

export interface GamePutResponse {}

export function objectKeys<TObject extends object>(
  object: TObject,
): Array<keyof TObject> {
  return Object.keys(object) as Array<keyof TObject>;
}

export const API_PORT = process.env['PORT'] as string;
