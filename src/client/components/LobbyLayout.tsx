import React, {
  createContext,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Form,
  generatePath,
  Outlet,
  useLoaderData,
  useOutletContext,
  useParams,
  useSubmit,
} from 'react-router-dom';
import invariant from 'ts-invariant';
import {
  type Maybe,
  type Lobby,
  getWinningTeam,
  colorName,
  colorValue,
  Route,
} from '../../common';
import { Game } from '../screens/Game';

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
  const submit = useSubmit();
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'lobbyCode nullish');
  const headerRef = useOutletContext<RefObject<HTMLDivElement>>();
  const [lobby, setLobby] = useState<State['lobby']>(null);
  const [playerName] = useState<State['playerName']>(() => {
    return new URL(eventSource.url).searchParams.get('playerName');
  });
  invariant(playerName, 'playerName empty or nullish');
  const isLeader = lobby?.leader === playerName;

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
    const winningTeam = lobby == null ? null : getWinningTeam(lobby);
    if (winningTeam == null) {
      return;
    }
    setTimeout(() => {
      const keepPlaying = confirm(
        `${colorName(winningTeam.color)} team wins!\nKeep playing?`,
      );
      if (!keepPlaying) {
        const formData = new FormData();
        submit(formData, {
          action: generatePath(Route.LobbyLeave, { lobbyCode }),
          method: 'put',
        });
      }
    }, 2000);
  }, [lobby]);

  return (
    <LobbyContext.Provider value={context}>
      {headerRef.current &&
        lobby?.activeGame &&
        createPortal(
          <Form>
            <input
              hidden={true}
              name="playerName"
              value={playerName}
              readOnly={true}
            />
            {isLeader && (
              <button
                className="bordered"
                formAction={generatePath(Route.LobbyDisband, { lobbyCode })}
                formMethod="delete"
              >
                Disband
              </button>
            )}
            <button
              className="bordered"
              formAction={generatePath(Route.LobbyLeave, { lobbyCode })}
              formMethod="put"
            >
              Leave
            </button>
          </Form>,
          headerRef.current,
        )}
      {lobby == null ? (
        <div className="loading">Connecting...</div>
      ) : lobby.activeGame ? (
        <Game />
      ) : (
        <Outlet />
      )}
    </LobbyContext.Provider>
  );
}
