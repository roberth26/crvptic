import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import invariant from 'ts-invariant';
import { GetCategoriesResponse } from '../../common';

export function CreateGame() {
  const categories = useQueryClient().getQueryData<
    GetCategoriesResponse['categories']
  >(['getCategories']);
  invariant(categories, 'categories nullish');

  const handleSubmit = event => {
    event.preventDefault();
    const { currentTarget } = event;
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
