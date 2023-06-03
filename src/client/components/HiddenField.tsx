import React from 'react';

export function HiddenField({ name, value }: { name: string; value: string }) {
  return <input hidden={true} name={name} value={value} readOnly={true} />;
}
