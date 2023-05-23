import EventEmitter from 'eventemitter3';
import { runSaga, stdChannel, Task } from 'redux-saga';
import { createLobby, LobbyCode, type Lobby, Maybe } from '../common';
import { EventType, type Event } from './events';
import { root } from './game';
import invariant from 'ts-invariant';

const TICK_RATE_HZ = 5;

export class CrypticStore {
  private lobbyStores = new Map<LobbyCode, LobbyStore>();

  createLobby = (leaderName: string) => {
    const lobbyStore = new LobbyStore(leaderName);
    const lobbyCode = CrypticStore.createLobbyCode();
    this.lobbyStores.set(lobbyCode, lobbyStore);
    return lobbyCode;
  };

  getLobby = (lobbyCode: LobbyCode) => {
    return this.lobbyStores.get(lobbyCode.toUpperCase());
  };

  dispose = () => {
    this.lobbyStores.forEach(lobbyStore => {
      lobbyStore.dispose();
    });
  };

  ensurePlayer = (lobbyCode: LobbyCode, playerName: Maybe<string>) => {
    invariant(playerName, 'playerName required');
    invariant(
      this.lobbyStores.get(lobbyCode)?.hasPlayer(playerName),
      `lobby code=${lobbyCode} does not include ${playerName}`,
    );
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
    } while (CrypticStore.usedLobbyCodes.has(code));
    CrypticStore.usedLobbyCodes.add(code);
    return code;
  };
}

class LobbyStore {
  private emitter = new EventEmitter<
    { [TEventType in EventType]: Event } & {
      TICK: (lobby: Lobby) => void;
    }
  >();
  private lobby: Lobby;
  private task: Task;
  private timer: NodeJS.Timer;

  constructor(leaderName: string) {
    this.lobby = createLobby(leaderName);

    const channel = stdChannel();
    Object.values(EventType).forEach(event => {
      this.emitter.on(event, channel.put);
    });

    this.task = runSaga(
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
      this.emitter.emit('TICK', {
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
    this.timer = setInterval(tick, 1000 / TICK_RATE_HZ);
  }

  send = (event: Event) => {
    this.emitter.emit(event.type, event);
  };

  onTick = (subscriber: (lobby: Lobby) => void) => {
    this.emitter.on('TICK', subscriber);
    return () => this.emitter.off('TICK', subscriber);
  };

  dispose = () => {
    this.task.cancel();
    clearInterval(this.timer);
    this.emitter.removeAllListeners();
  };

  hasPlayer = (playerName: string) => {
    return this.lobby.teams.some(team => team.players.includes(playerName));
  };
}
