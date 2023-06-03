import React, {
  ComponentRef,
  createContext,
  RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Outlet,
  useLoaderData,
  useOutletContext,
  useParams,
} from 'react-router-dom';
import invariant from 'ts-invariant';
import {
  type Maybe,
  type Lobby,
  getWinningTeam,
  EventType,
} from '../../common';
import { Game } from '../screens/Game';
import * as EventForm from './EventForm';
import { ConfirmationModal } from './ConfirmationModal';

interface State {
  lobby: Maybe<Lobby>;
  playerName: Maybe<string>;
}

type LobbyContext = State;

const LobbyContext = createContext<LobbyContext | null>(null);

function useLobbyContext(): LobbyContext {
  const lobbyContext = useContext(LobbyContext);
  invariant(lobbyContext != null, 'lobbyContext nullish');
  return lobbyContext;
}

export function useLobby() {
  const { lobby } = useLobbyContext();
  invariant(lobby, 'lobby nullish');
  return lobby;
}

export function useLobbyCode() {
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'lobbyCode nullish');
  return lobbyCode;
}

export function usePlayerName() {
  const { playerName } = useLobbyContext();
  invariant(playerName, 'playerName nullish');
  return playerName;
}

export function usePlayerTeam() {
  const playerName = usePlayerName();
  const lobby = useLobby();
  const team = lobby.teams.find(team => team.players.includes(playerName));
  invariant(team, 'team nullish');
  return team;
}

export function useLeaderTeam() {
  const { teams, leader } = useLobby();
  const team = teams.find(team => team.players.includes(leader));
  invariant(team, 'team nullish');
  return team;
}

export function LobbyProvider() {
  const eventSource = useLoaderData() as EventSource;
  const eventSourceURL = eventSource.url;
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'lobbyCode nullish');
  const headerRef = useOutletContext<RefObject<HTMLDivElement>>();
  const [lobby, setLobby] = useState<State['lobby']>(null);
  const playerName = useMemo(() => {
    return new URL(eventSourceURL).searchParams.get('playerName');
  }, [eventSourceURL]);
  invariant(playerName, 'playerName empty or nullish');
  const confirmationModalRef = useRef<ComponentRef<
    typeof ConfirmationModal
  > | null>(null);
  const winningTeamColor = lobby == null ? null : getWinningTeam(lobby)?.color;

  useEffect(() => {
    const handleMessage = ({ data: newLobbyStr }: MessageEvent) => {
      setLobby(prevLobby => {
        const prevLobbyStr = JSON.stringify(prevLobby);
        if (prevLobbyStr === newLobbyStr) {
          return prevLobby;
        }
        return JSON.parse(newLobbyStr);
      });
    };
    eventSource.addEventListener('message', handleMessage);
    return () => {
      eventSource.removeEventListener('message', handleMessage);
    };
  }, [eventSource, lobbyCode, playerName]);

  const context = useMemo<LobbyContext>(
    () => ({
      lobby,
      playerName,
    }),
    [lobby, playerName],
  );

  useEffect(() => {
    if (winningTeamColor != null) {
      confirmationModalRef.current?.open();
    }
  }, [winningTeamColor]);

  return (
    <LobbyContext.Provider value={context}>
      {headerRef.current &&
        lobby?.activeGame &&
        createPortal(<HeaderMenu />, headerRef.current)}
      {!lobby && <div className="loading">Connecting...</div>}
      {lobby && lobby.activeGame && <Game />}
      {lobby && !lobby.activeGame && <Outlet />}
      {lobby && <ConfirmationModal ref={confirmationModalRef} />}
    </LobbyContext.Provider>
  );
}

function HeaderMenu() {
  const eventFetcher = EventForm.useEventFetcher();
  const playerName = usePlayerName();
  const lobby = useLobby();
  const isLeader = lobby.leader === playerName;

  return (
    <eventFetcher.Form>
      {isLeader && (
        <button className="bordered" name="type" value={EventType.DisbandLobby}>
          Disband
        </button>
      )}
      <button className="bordered" name="type" value={EventType.LeaveLobby}>
        Leave
      </button>
    </eventFetcher.Form>
  );
}
