import EventEmitter from 'eventemitter3';
import { runSaga, stdChannel } from 'redux-saga';
import invariant from 'ts-invariant';
import {
  createLobby,
  type LobbyCode,
  type Lobby,
  type Maybe,
  type Event,
  EventType,
} from '../common';
import { root } from './game';

const TICK_RATE_HZ = 5;

export class CrvpticStore {
  private lobbyStores = new Map<LobbyCode, LobbyStore>();

  createLobby = (leaderName: string) => {
    const lobbyStore = new LobbyStore(leaderName);
    const lobbyCode = CrvpticStore.createLobbyCode();
    this.lobbyStores.set(lobbyCode, lobbyStore);
    lobbyStore.once('DISPOSE', () => {
      this.lobbyStores.delete(lobbyCode);
    });
    return lobbyCode;
  };

  ensurePlayer = (lobbyCode: LobbyCode, playerName: Maybe<string>) => {
    invariant(playerName, 'playerName required');
    invariant(
      this.lobbyStores.get(lobbyCode)?.hasPlayer(playerName),
      `lobby code=${lobbyCode} does not include ${playerName}`,
    );
  };

  getLobby = (lobbyCode: LobbyCode, playerName: Maybe<string>) => {
    this.ensurePlayer(lobbyCode, playerName);
    const lobby = this.lobbyStores.get(lobbyCode.toUpperCase());
    invariant(lobby);
    return lobby;
  };

  dispose = () => {
    this.lobbyStores.forEach(lobbyStore => {
      lobbyStore.emit('DISPOSE');
    });
  };

  send = (event: Event) => {
    const lobbyCode = event.lobbyCode;
    const lobbyStore = this.lobbyStores.get(lobbyCode);
    invariant(lobbyStore);
    lobbyStore.send(event);
  };

  private static usedLobbyCodes = new Set<LobbyCode>();

  private static createLobbyCode = (): LobbyCode => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code: LobbyCode;
    do {
      code = Array.from(
        { length: 4 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join('');
    } while (CrvpticStore.usedLobbyCodes.has(code));
    CrvpticStore.usedLobbyCodes.add(code);
    return code;
  };
}

class LobbyStore extends EventEmitter<{
  TICK: (lobby: Lobby) => void;
  DISPOSE: () => void;
}> {
  private internalEmitter = new EventEmitter<{
    [TEventType in EventType]: Event;
  }>();
  private lobby: Lobby;

  constructor(leaderName: string) {
    super();
    this.lobby = createLobby(leaderName);

    const channel = stdChannel();
    Object.values(EventType).forEach(event => {
      this.internalEmitter.on(event, channel.put);
    });

    const task = runSaga(
      {
        channel,
        dispatch: (setState: (lobby: Lobby) => Lobby) => {
          this.lobby = setState(this.lobby);
        },
        getState: () => {
          return this.lobby;
        },
      },
      root,
    );

    const tick = () => {
      this.emit('TICK', {
        leader: this.lobby.leader,
        // don't send empty teams
        teams: this.lobby.teams.filter(({ players }) => players.length),
        // don't send empty game
        ...(this.lobby.activeGame && {
          activeGame: {
            ...this.lobby.activeGame,
            eliminatedTeams: this.lobby.activeGame.eliminatedTeams?.length
              ? this.lobby.activeGame.eliminatedTeams
              : undefined,
            config: {
              ...this.lobby.activeGame.config,
              // don't send config categories
              categories: [],
            },
          },
        }),
      });
    };

    tick();
    const timer = setInterval(tick, 1000 / TICK_RATE_HZ);

    const reaperTimer = setInterval(() => {
      const isEmpty = this.lobby.teams.every(team => team.players.length === 0);
      if (isEmpty) {
        this.emit('DISPOSE');
      }
    }, 1000 * 60);

    this.once('DISPOSE', () => {
      task.cancel();
      channel.close();
      clearInterval(timer);
      clearInterval(reaperTimer);
      setTimeout(() => {
        this.internalEmitter.removeAllListeners();
        this.removeAllListeners();
      });
    });
  }

  send = (event: Event) => {
    this.internalEmitter.emit(event.type, event);
  };

  hasPlayer = (playerName: string) => {
    return this.lobby.teams.some(team => team.players.includes(playerName));
  };
}
