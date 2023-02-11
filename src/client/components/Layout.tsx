import React from 'react';
import { Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="Layout">
      <header className="Layout_header">
        <div className="container">
          <h1 id="logo">_cryptic</h1>
        </div>
      </header>
      <main className="Layout_content container">
        <Outlet />
      </main>
    </div>
  );
}
