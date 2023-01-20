import React, {
  createContext,
  Dispatch,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import invariant from 'ts-invariant';
import { Event } from '../common';

interface State {}

interface StateContext {
  state: State;
  dispatch: Dispatch<Event[keyof Event]>;
}

const StateContext = createContext<StateContext | null>(null);

export function useStateContext(): StateContext {
  const stateContext = useContext(StateContext);
  invariant(stateContext != null, 'stateContext nullish');
  return stateContext;
}

const initialState: State = {};

function reducer(state: State, event: Event[keyof Event]): State {
  switch (event.type) {
    default:
      return state;
  }
}

export function StateContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const url = new URL('/socket', location.href);
    url.protocol = 'wss';
    const ws = new WebSocket(url);

    const handleMessage = (event: MessageEvent) => {
      console.log(event.data);
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
      ws.close();
    };
  }, []);

  const context = useMemo<StateContext>(
    () => ({
      state,
      dispatch,
    }),
    [state, dispatch],
  );

  return (
    <StateContext.Provider value={context}>{children}</StateContext.Provider>
  );
}
