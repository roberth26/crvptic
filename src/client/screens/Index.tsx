import React from 'react';
import { Link } from 'react-router-dom';
import { Routes } from '../../common';

export function Index() {
  const handleSubmit = ({ currentTarget }) => {
    console.log({ currentTarget });
  };

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <label>
          <span>Join game</span>
          <input placeholder="Game code" name="gameCode" />
        </label>
        <button>Join</button>
      </form>
      <Link role="button" to={Routes.CreateGame}>
        Create game
      </Link>
    </main>
  );
}
