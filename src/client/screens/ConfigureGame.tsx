import React from 'react';
import {
  Form,
  generatePath,
  Link,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import invariant from 'ts-invariant';
import {
  type CategoryGetResponse,
  DecodeMethod,
  defaultGameConfigWithoutCategories,
  TimeLimit,
  UIRoute,
} from '../../common';
import { useLobby } from './Lobby';

export function ConfigureGame() {
  const { lobbyCode } = useParams();
  invariant(lobbyCode, 'lobbyCode nullish');
  const { playerName } = useLobby();
  invariant(playerName, 'playerName missing');
  const { categories: categoriesRaw } = useLoaderData() as CategoryGetResponse;
  const categories = categoriesRaw.map(({ category }) => category);
  const defaultCategories = categoriesRaw.flatMap(({ category, isDefault }) =>
    isDefault ? [category] : [],
  );

  return (
    <Form className="ConfigureGame" method="post">
      <input hidden={true} name="lobbyCode" value={lobbyCode} readOnly={true} />
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
      <Link role="button" to={generatePath(UIRoute.Lobby, { lobbyCode })}>
        Cancel
      </Link>
      <button>Start game</button>
    </Form>
  );
}
