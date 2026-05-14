import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import ThemeToggle from './ThemeToggle';

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const nav = useNavigate();
  const handleLogout = () => { logout(); window.location.replace('/'); };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="logo-mini">→</div>
            <span>admin</span>
          </div>
          <ThemeToggle/>
        </div>
        <div className="section-label">Management</div>
        <NavLink to="/admin" end className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="ico">▣</span><span>Dashboard</span>
        </NavLink>
        <NavLink to="/admin/bookings" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="ico">≡</span><span>Bookings</span>
        </NavLink>
        <NavLink to="/admin/calendar" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="ico">▦</span><span>Calendar</span>
        </NavLink>
        <NavLink to="/admin/reports" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="ico">↓</span><span>Reports</span>
        </NavLink>
        <NavLink to="/admin/vehicles" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="ico">⚙</span><span>Vehicles</span>
        </NavLink>
        <NavLink to="/admin/settings" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="ico">◉</span><span>Settings</span>
        </NavLink>
        <div className="section-label">Account</div>
        <div className="nav-item" onClick={handleLogout}>
          <span className="ico">→</span><span>Logout</span>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
