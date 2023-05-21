import React, { useState } from 'react';
import { Form } from 'react-router-dom';
import { LobbyCode, Route } from '../../common';
import { readStateFromLocalStorage } from '../localStorage';

export function LobbyJoinCreate() {
  const [{ defaultLobbyCode, defaultPlayerName }] = useState(() => {
    const state = readStateFromLocalStorage();
    return {
      defaultLobbyCode: state?.lobbyCode,
      defaultPlayerName: state?.playerName,
    };
  });
  const [isLobbyCodeValid, setIsLobbyCodeValid] = useState(
    Boolean(LobbyCode(defaultLobbyCode)),
  );

  return (
    <Form method="post" className="JoinCreateLobby">
      <label className="form-group">
        Your name:
        <input
          name="playerName"
          type="text"
          placeholder="ex: h4x0r"
          defaultValue={defaultPlayerName}
          required={true}
        />
      </label>
      <label className="form-group">
        Lobby code:
        <input
          name="lobbyCode"
          type="text"
          placeholder="ex: ASDF"
          defaultValue={defaultLobbyCode}
          onChange={({ currentTarget: { value: lobbyCode } }) => {
            setIsLobbyCodeValid(Boolean(LobbyCode(lobbyCode)));
          }}
        />
      </label>
      <button
        formAction={Route.Lobby}
        disabled={!isLobbyCodeValid}
        className="bordered"
      >
        Join lobby
      </button>
      <hr />
      <button formAction={Route.LobbyCreate} className="bordered">
        Create lobby
      </button>
    </Form>
  );
}
