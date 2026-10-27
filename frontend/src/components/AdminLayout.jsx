import { Suspense } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';
import ThemeToggle from './ThemeToggle';
import { Brand } from './PublicShell';
import { Icon } from '../lib/ui';

const LINKS = [
  { to: '/admin', end: true, icon: 'dashboard', label: 'Overview' },
  { to: '/admin/bookings', icon: 'list', label: 'Bookings' },
  { to: '/admin/calendar', icon: 'calendar', label: 'Calendar' },
  { to: '/admin/vehicles', icon: 'car', label: 'Vehicles' },
  { to: '/admin/reports', icon: 'chart', label: 'Reports' },
];

function Links() {
  return LINKS.map(l => (
    <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => 'nav' + (isActive ? ' active' : '')}>
      <Icon name={l.icon} size={18}/><span>{l.label}</span>
    </NavLink>
  ));
}

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const handleLogout = () => { logout(); window.location.replace('/'); };

  return (
    <div className="admin">
      <aside className="side">
        <Brand sub="Admin"/>
        <Links/>
        <div className="side-foot">
          <a className="nav" href="/" target="_blank" rel="noreferrer"><Icon name="next" size={18}/><span>Open booking site</span></a>
          <button className="nav" onClick={handleLogout}><Icon name="logout" size={18}/><span>Sign out</span></button>
          <div style={{ padding: '8px 4px 0' }}><ThemeToggle/></div>
        </div>
      </aside>

      <div className="mobile-bar">
        <div className="row">
          <Brand sub=""/>
          <div style={{ display: 'flex', gap: 8 }}>
            <ThemeToggle/>
            <button className="icon-btn" onClick={handleLogout} aria-label="Sign out"><Icon name="logout" size={17}/></button>
          </div>
        </div>
        <nav className="mobile-nav"><Links/></nav>
      </div>

      <main className="admin-main">
        <Suspense fallback={<div className="empty">Loading…</div>}>{children}</Suspense>
      </main>
    </div>
  );
}
