import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { FormEvent } from 'react';
import invariant from 'ts-invariant';
import {
  DecodeMethod,
  GameConfig,
  GetCategoriesResponse,
  TimeLimit,
} from '../../common';

export function CreateGame() {
  const categories = useQueryClient().getQueryData<
    GetCategoriesResponse['categories']
  >(['getCategories']);
  invariant(categories, 'categories nullish');

  const { mutate } = useMutation({
    mutationFn: (gameConfig: GameConfig) =>
      fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameConfig }),
      }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { currentTarget } = event;
    invariant(currentTarget != null, 'currentTarget nullish');
    const encodeTimeLimitElement =
      currentTarget.elements.namedItem('encodeTimeLimit');
    invariant(
      encodeTimeLimitElement instanceof HTMLSelectElement,
      'encodeTimeLimitElement nullish',
    );
    const encodeTimeLimit = Number(encodeTimeLimitElement.value);
    const decodeTimeLimitElement =
      currentTarget.elements.namedItem('decodeTimeLimit');
    invariant(
      decodeTimeLimitElement instanceof HTMLSelectElement,
      'decodeTimeLimitElement nullish',
    );
    const decodeTimeLimit = Number(decodeTimeLimitElement.value);
    const secretCountElement = currentTarget.elements.namedItem('secretCount');
    invariant(
      secretCountElement instanceof HTMLInputElement,
      'secretCountElement nullish',
    );
    const secretCount = Number(secretCountElement.value);
    const virusCountElement = currentTarget.elements.namedItem('virusCount');
    invariant(
      virusCountElement instanceof HTMLInputElement,
      'virusCountElement nullish',
    );
    const virusCount = Number(virusCountElement.value);
    const decodeMethodElement =
      currentTarget.elements.namedItem('decodeMethod');
    invariant(
      decodeMethodElement instanceof HTMLSelectElement,
      'decodeMethodElement nullish',
    );
    const decodeMethod = decodeMethodElement.value as DecodeMethod;
    const allowExtraDecodeElement =
      currentTarget.elements.namedItem('allowExtraDecode');
    invariant(
      allowExtraDecodeElement instanceof HTMLInputElement,
      'allExtraDecodeElement nullish',
    );
    const allowExtraDecode = allowExtraDecodeElement.checked;
    const categoriesElement = currentTarget.elements.namedItem('categories');
    invariant(
      categoriesElement instanceof HTMLSelectElement,
      'categoriesElement nullish',
    );
    const categories = Array.from(
      categoriesElement.querySelectorAll('option:checked'),
      el => (el as HTMLOptionElement).value,
    );
    const gameConfig: GameConfig = {
      encodeTimeLimit,
      decodeTimeLimit,
      secretCount,
      virusCount,
      decodeMethod,
      allowExtraDecode,
      categories,
    };
    mutate(gameConfig);
  };

  return (
    <main className="CreateGame container">
      <form onSubmit={handleSubmit}>
        <label>
          <div>Encode time limit</div>
          <select name="encodeTimeLimit" defaultValue={TimeLimit['5m']}>
            {Object.entries(TimeLimit).map(([name, value]) => (
              <option key={name} value={value} children={name} />
            ))}
          </select>
        </label>
        <label>
          <div>Decode time limit</div>
          <select name="decodeTimeLimit" defaultValue={TimeLimit['5m']}>
            {Object.entries(TimeLimit).map(([name, value]) => (
              <option key={name} value={value} children={name} />
            ))}
          </select>
        </label>
        <label>
          <div>Secret count (per team)</div>
          <input
            type="number"
            name="secretCount"
            min={2}
            max={16}
            step={1}
            defaultValue={8}
          />
        </label>
        <label>
          <div>Virus count (per team)</div>
          <input
            type="number"
            name="virusCount"
            min={0}
            max={8}
            step={1}
            defaultValue={1}
          />
        </label>
        <label>
          <div>Decode method</div>
          <select name="decodeMethod" defaultValue={DecodeMethod.Majority}>
            {Object.entries(DecodeMethod).map(([name, value]) => (
              <option key={name} value={value} children={name} />
            ))}
          </select>
        </label>
        <label>
          <div>Extra decode</div>
          <input
            type="checkbox"
            name="allowExtraDecode"
            defaultChecked={true}
          />
        </label>
        <label>
          <div>Secret categories</div>
          <select
            name="categories"
            multiple={true}
            defaultValue={categories.filter(category => category !== 'Adult')}
          >
            {categories.map(category => (
              <option key={category} value={category} children={category} />
            ))}
          </select>
        </label>
        <button>Create game</button>
      </form>
    </main>
  );
}
