import { type GameConfig, type Maybe, type TeamColor } from '../common';

export const EventType = {
  CreateLobby: 'CREATE_LOBBY',
  StartGame: 'START_GAME',
  JoinLobby: 'JOIN_LOBBY',
  LeaveLobby: 'LEAVE_LOBBY',
  JoinTeam: 'JOIN_TEAM',
  DemoteEncoder: 'DEMOTE_ENCODER',
  PromoteEncoder: 'PROMOTE_ENCODER',
  EncodeSecret: 'ENCODE_SECRET',
  DecodeSecret: 'DECODE_SECRET',
  CancelDecodeSecret: 'CANCEL_DECODE_SECRET',
} as const;

export const Events = {
  CreateLobby: function createLobby(payload: { leaderName: string }) {
    return {
      type: EventType.CreateLobby,
      payload,
    } as const;
  },
  StartGame: function startGame(payload: { config: Partial<GameConfig> }) {
    return {
      type: EventType.StartGame,
      payload,
    } as const;
  },
  JoinLobby: function joinLobby(payload: {
    playerName: string;
    teamColor?: Maybe<TeamColor>;
  }) {
    return {
      type: EventType.JoinLobby,
      payload,
    } as const;
  },
  LeaveLobby: function leaveLobby(payload: { playerName: string }) {
    return {
      type: EventType.LeaveLobby,
      payload,
    } as const;
  },
  JoinTeam: function joinTeam(payload: {
    playerName: string;
    teamColor: TeamColor;
  }) {
    return {
      type: EventType.JoinTeam,
      payload,
    } as const;
  },
  DemoteEncoder: function demoteEncoder(payload: { playerName: string }) {
    return {
      type: EventType.DemoteEncoder,
      payload,
    } as const;
  },
  PromoteEncoder: function promoteEncoder(payload: { playerName: string }) {
    return {
      type: EventType.PromoteEncoder,
      payload,
    } as const;
  },
  EncodeSecret: function encodeSecret(payload: {
    playerName: string;
    signal: string;
    secretCount: number;
  }) {
    return {
      type: EventType.EncodeSecret,
      payload,
    } as const;
  },
  DecodeSecret: function decodeSecret(payload: {
    playerName: string;
    secret: string;
  }) {
    return {
      type: EventType.DecodeSecret,
      payload,
    } as const;
  },
  CancelDecodeSecret: function cancelDecodeSecret(payload: {
    playerName: string;
    secret: string;
  }) {
    return {
      type: EventType.CancelDecodeSecret,
      payload,
    } as const;
  },
} as const;

export type Event<
  TEventType extends keyof typeof Events = keyof typeof Events,
> = ReturnType<(typeof Events)[TEventType]>;

export type EventType = Event['type'];
