import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import { EventType, colorName, colorValue, getWinningTeam } from '../../common';
import { useLobby } from './LobbyLayout';
import * as EventForm from './EventForm';

export const ConfirmationModal = forwardRef<{
  open: () => void;
}>((_props, ref) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const lobby = useLobby();
  const winningTeam = getWinningTeam(lobby);
  const eventFetcher = EventForm.useEventFetcher();

  useImperativeHandle(
    ref,
    () => ({
      open: () => dialogRef.current?.showModal(),
    }),
    [],
  );

  if (winningTeam == null) {
    return null;
  }

  return (
    <dialog ref={dialogRef} className="ConfirmationModal" open={false}>
      <eventFetcher.Form>
        <EventForm.Event type={EventType.LeaveLobby} />
        <div>
          <span
            className="winningTeam"
            style={{
              // @ts-ignore
              '--team-color': colorValue(winningTeam.color),
            }}
          >
            {colorName(winningTeam.color)}
          </span>
          &nbsp;team wins! Keep playing?
        </div>
        <button className="bordered">Leave lobby</button>
        <button formMethod="dialog" className="bordered">
          Keep playing
        </button>
      </eventFetcher.Form>
    </dialog>
  );
});
