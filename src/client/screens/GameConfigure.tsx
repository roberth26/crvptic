import React from 'react';
import { Form, generatePath, Link, useLoaderData } from 'react-router-dom';
import {
  DecodeMethod,
  defaultGameConfigWithoutCategories,
  Route,
  TimeLimit,
  type CategoriesResponse,
} from '../../common';
import { useLobbyCode, usePlayerName } from '../components/LobbyLayout';

export function GameConfigure() {
  const lobbyCode = useLobbyCode();
  const playerName = usePlayerName();
  const { categories: categoriesRaw } = useLoaderData() as CategoriesResponse;
  const categories = categoriesRaw.map(({ category }) => category);
  const defaultCategories = categoriesRaw.flatMap(({ category, isDefault }) =>
    isDefault ? [category] : [],
  );

  return (
    <Form
      className="ConfigureGame"
      method="post"
      action={generatePath(Route.GameStart, { lobbyCode })}
    >
      <input
        hidden={true}
        name="playerName"
        value={playerName}
        readOnly={true}
      />
      <label className="form-group">
        Encode time limit
        <select
          name="encodeTimeLimit"
          defaultValue={defaultGameConfigWithoutCategories.encodeTimeLimit}
        >
          {Object.entries(TimeLimit).map(([name, value]) => (
            <option key={name} value={value} children={name} />
          ))}
        </select>
      </label>
      <label className="form-group">
        Decode time limit
        <select
          name="decodeTimeLimit"
          defaultValue={defaultGameConfigWithoutCategories.decodeTimeLimit}
        >
          {Object.entries(TimeLimit).map(([name, value]) => (
            <option key={name} value={value} children={name} />
          ))}
        </select>
      </label>
      <label className="form-group">
        Secret count (per team)
        <input
          type="number"
          name="secretCount"
          min={2}
          max={16}
          step={1}
          defaultValue={defaultGameConfigWithoutCategories.secretCount}
        />
      </label>
      <label className="form-group">
        Virus count (per team)
        <input
          type="number"
          name="virusCount"
          min={0}
          max={8}
          step={1}
          defaultValue={defaultGameConfigWithoutCategories.virusCount}
        />
      </label>
      <label className="form-group">
        Decode method
        <select
          name="decodeMethod"
          defaultValue={defaultGameConfigWithoutCategories.decodeMethod}
        >
          {Object.entries(DecodeMethod).map(([name, value]) => (
            <option key={name} value={value} children={name} />
          ))}
        </select>
      </label>
      <label className="form-group">
        Extra decode
        <input
          type="checkbox"
          name="allowExtraDecode"
          defaultChecked={defaultGameConfigWithoutCategories.allowExtraDecode}
        />
      </label>
      <div className="ConfigureGame_categories form-group">
        Secret categories
        <div className="ConfigureGame_categories-list">
          {categories.map(category => (
            <label key={category} className="form-group">
              {category}
              <input
                name="categories"
                type="checkbox"
                value={category}
                defaultChecked={defaultCategories.includes(category)}
              />
            </label>
          ))}
        </div>
      </div>
      <Link role="button" className="bordered" to=".." replace={true}>
        Cancel
      </Link>
      <button className="bordered">Start game</button>
    </Form>
  );
}
