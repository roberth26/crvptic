import React, { useRef } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Route } from '../../common';

export function Layout() {
  const headerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="Layout">
      <header className="Layout_header">
        <div className="container">
          <div className="Layout_header_content">
            <Link to={Route.LobbyLeave} id="logo">
              <h1>
                <span style={{ fontWeight: 'bold' }}>crvptic</span>:~$
              </h1>
            </Link>
            <div ref={headerRef} />
          </div>
        </div>
      </header>
      <main className="Layout_content container">
        <Outlet context={headerRef} />
      </main>
    </div>
  );
}
