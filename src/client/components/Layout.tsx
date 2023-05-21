import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Route } from '../../common';

export function Layout() {
  return (
    <div className="Layout">
      <header className="Layout_header">
        <div className="container">
          <Link to={Route.Index} id="logo">
            <h1>_cryptic</h1>
          </Link>
        </div>
      </header>
      <main className="Layout_content container">
        <Outlet />
      </main>
    </div>
  );
}
