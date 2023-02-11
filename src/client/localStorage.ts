import { type LobbyCode, type Maybe } from '../common';

const KEY = '@cryptic/state';

interface State {
  lobbyCode: LobbyCode;
  playerName: string;
}

export function readStateFromLocalStorage(): Maybe<State> {
  const state = localStorage.getItem(KEY);
  if (state == null) {
    return null;
  }
  return JSON.parse(state);
}

export function writeStateToLocalStorage(state: State) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
