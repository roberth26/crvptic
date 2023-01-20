import React from 'react';
import { Link } from 'react-router-dom';
import { Routes } from '../../common';

export function Index() {
  const handleSubmit = ({ currentTarget }) => {
    console.log({ currentTarget });
  };

  return (
    <main className="Index container">
      <form onSubmit={handleSubmit}>
        <label>
          <div hidden={true}>Join game</div>
          <input placeholder="Game code" name="gameCode" />
        </label>
        <button>Join game</button>
      </form>
      <Link role="button" to={Routes.CreateGame}>
        Create game
      </Link>
    </main>
  );
}
