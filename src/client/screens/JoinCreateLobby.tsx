import React, { useState } from 'react';
import { Form } from 'react-router-dom';
import { LobbyPutOp } from '../../common';
import { readStateFromLocalStorage } from '../localStorage';

export function JoinCreateLobby() {
  const [{ defaultLobbyCode, defaultPlayerName }] = useState(() => {
    const state = readStateFromLocalStorage();
    return {
      defaultLobbyCode: state?.lobbyCode,
      defaultPlayerName: state?.playerName,
    };
  });

  return (
    <Form className="JoinCreateLobby" method="post">
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
          pattern="[A-Za-z]{4}"
        />
      </label>
      <button name="op" value={LobbyPutOp.Join} className="bordered">
        Join lobby
      </button>
      <hr />
      <button name="op" value={-1} className="bordered">
        Create lobby
      </button>
    </Form>
  );
}
