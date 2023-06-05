import React, { type ComponentProps, useMemo } from 'react';
import { useFetcher } from 'react-router-dom';
import {
  type DistributiveOmit,
  type Event,
  Route,
  objectKeys,
} from '../../common';
import { useLobbyCode, usePlayerName } from './LobbyLayout';

export function LobbyCode() {
  return <HiddenField name="lobbyCode" value={useLobbyCode()} />;
}

export function PlayerName() {
  return <HiddenField name="playerName" value={usePlayerName()} />;
}

export function useEventFetcher<TData>() {
  const fetcher = useFetcher<TData>();

  return useMemo(
    () => ({
      ...fetcher,
      Form: ({
        children,
        ...props
      }: Omit<
        ComponentProps<(typeof fetcher)['Form']>,
        'method' | 'action'
      >) => {
        return (
          <fetcher.Form action={Route.LobbyEvent} method="put" {...props}>
            <LobbyCode />
            <PlayerName />
            {children}
          </fetcher.Form>
        );
      },
    }),
    [fetcher],
  );
}

export function Event(
  partialEvent: DistributiveOmit<Event, 'lobbyCode' | 'playerName'>,
) {
  return (
    <>
      {objectKeys(partialEvent).map(key => (
        <HiddenField key={key} name={key} value={partialEvent[key]} />
      ))}
    </>
  );
}

function HiddenField({ name, value }: { name: string; value: string }) {
  return <input hidden={true} name={name} value={value} readOnly={true} />;
}
