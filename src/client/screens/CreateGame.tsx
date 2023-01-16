import React from 'react';

export function CreateGame() {
  const handleSubmit = ({ currentTarget }) => {
    console.log({ currentTarget });
  };

  return (
    <main>
      <form onSubmit={handleSubmit}>
        inputs go here
        <button>Create</button>
      </form>
    </main>
  );
}
