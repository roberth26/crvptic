import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Outlet, useLoaderData, useParams } from 'react-router-dom';
import invariant from 'ts-invariant';
import { type Maybe, type Lobby } from '../../common';
import { Game } from './Game';

interface State {
  lobby: Maybe<Lobby>;
  playerName: Maybe<string>;
}

type LobbyContext = State;

const LobbyContext = createContext<LobbyContext | null>(null);

export function useLobby(): LobbyContext {
  const lobbyContext = useContext(LobbyContext);
  invariant(lobbyContext != null, 'lobbyContext nullish');
  return lobbyContext;
}

export function Lobby() {
  const eventSource = useLoaderData() as EventSource;
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'lobbyCode nullish');
  const [lobby, setLobby] = useState<State['lobby']>(null);
  const [playerName] = useState<State['playerName']>(() => {
    return new URL(eventSource.url).searchParams.get('playerName');
  });

  useEffect(() => {
    const handleMessage = (messageEvent: MessageEvent) => {
      setLobby(JSON.parse(messageEvent.data));
    };
    eventSource.addEventListener('message', handleMessage);
    return () => eventSource.removeEventListener('message', handleMessage);
  }, [eventSource]);

  const context = useMemo<LobbyContext>(
    () => ({
      lobby,
      playerName,
    }),
    [lobby, playerName],
  );

  return (
    <LobbyContext.Provider value={context}>
      {lobby == null ? 'Loading...' : lobby.activeGame ? <Game /> : <Outlet />}
    </LobbyContext.Provider>
  );
}
