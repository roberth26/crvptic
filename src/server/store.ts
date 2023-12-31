import EventEmitter from 'eventemitter3';
import { runSaga, stdChannel } from 'redux-saga';
import invariant from 'ts-invariant';
import {
  createLobby,
  type LobbyCode,
  type Lobby,
  type Maybe,
  type Event,
} from '../common';
import { root } from './game';

const TICK_RATE_HZ = 5;

export class CrvpticStore {
  private lobbyStores = new Map<LobbyCode, LobbyStore>();

  createLobby = (leaderName: string) => {
    const lobbyStore = new LobbyStore(leaderName);
    const lobbyCode = CrvpticStore.createLobbyCode();
    this.lobbyStores.set(lobbyCode, lobbyStore);
    lobbyStore.onceDispose(() => {
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

  getLobby = (lobbyCode: LobbyCode) => {
    const lobby = this.lobbyStores.get(lobbyCode.toUpperCase());
    invariant(lobby, 'lobby not found');
    return lobby;
  };

  dispose = () => {
    this.lobbyStores.forEach(lobbyStore => {
      lobbyStore.dispose();
    });
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

class LobbyStore {
  private emitter = new EventEmitter<{
    EVENT: (event: Event) => void;
    TICK: (lobby: Lobby) => void;
    DISPOSE: () => void;
  }>();
  private lobby: Lobby;

  constructor(leaderName: string) {
    this.lobby = createLobby(leaderName);

    const channel = stdChannel();
    this.emitter.on('EVENT', channel.put);

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

    task.toPromise().then(this.dispose, this.dispose);

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
    const timer = setInterval(tick, 1000 / TICK_RATE_HZ);

    this.emitter.once('DISPOSE', () => {
      task.cancel();
      channel.close();
      clearInterval(timer);
      setTimeout(() => {
        this.emitter.removeAllListeners();
      });
    });
  }

  dispose = () => {
    this.emitter.emit('DISPOSE');
  };

  onceDispose = (listener: () => void) => {
    this.emitter.once('DISPOSE', listener);
    return () => this.emitter.off('DISPOSE', listener);
  };

  onTick = (listener: (lobby: Lobby) => void) => {
    this.emitter.on('TICK', listener);
    return () => this.emitter.off('TICK', listener);
  };

  send = (event: Event) => {
    return this.emitter.emit('EVENT', event);
  };

  hasPlayer = (playerName: string) => {
    return this.lobby.teams.some(team => team.players.includes(playerName));
  };
}
