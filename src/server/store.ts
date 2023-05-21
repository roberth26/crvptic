import EventEmitter from 'eventemitter3';
import { runSaga, stdChannel, Task } from 'redux-saga';
import { type Lobby, type LobbyCode } from '../common';
import { reducer } from './state';
import { Events, EventType, type Event } from './events';
import { root } from './game';

export class CrypticStore {
  private lobbyStores = new Map<LobbyCode, LobbyStore>();

  createLobby = (leaderName: string) => {
    const lobbyStore = new LobbyStore();
    lobbyStore.send(Events.CreateLobby({ leaderName }));
    this.lobbyStores.set(lobbyStore.lobbyCode.toUpperCase(), lobbyStore);
    return lobbyStore.lobbyCode;
  };

  getLobby = (lobbyCode: LobbyCode) => {
    return this.lobbyStores.get(lobbyCode.toUpperCase());
  };

  dispose = () => {
    this.lobbyStores.forEach(lobbyStore => {
      lobbyStore.dispose();
    });
  };
}

class LobbyStore {
  private emitter = new EventEmitter<
    { [TEventType in EventType]: Event } & {
      TICK: (lobby: Lobby) => void;
    }
  >();
  private lobby = reducer(undefined, {} as Event);
  private task: Task;
  private timer: NodeJS.Timer;

  constructor() {
    const channel = stdChannel();
    Object.values(EventType).forEach(event => {
      this.emitter.on(event, channel.put);
    });

    this.task = runSaga(
      {
        channel,
        dispatch: (event: Event) => {
          this.lobby = reducer(this.lobby, event);
        },
        getState: () => {
          return this.lobby;
        },
      },
      root,
    );

    const tick = () => {
      this.emitter.emit('TICK', this.lobby);
    };

    tick();
    this.timer = setInterval(tick, 500);
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

  get lobbyCode() {
    return this.lobby.code;
  }
}
