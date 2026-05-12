import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const isAdmin = user?.role === 'Admin';

  const handleLogout = () => { logout(); nav('/login'); };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-mini">→</div>
          <span>{isAdmin ? 'admin' : 'c-zero'}</span>
        </div>

        {isAdmin ? (
          <>
            <div className="section-label">Management</div>
            <NavLink to="/admin" end className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="ico">▣</span><span>Dashboard</span>
            </NavLink>
            <NavLink to="/admin/bookings" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="ico">≡</span><span>Bookings</span>
            </NavLink>
            <NavLink to="/admin/vehicles" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="ico">⚙</span><span>Vehicles</span>
            </NavLink>
          </>
        ) : (
          <>
            <div className="section-label">Workspace</div>
            <NavLink to="/" end className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="ico">▣</span><span>Dashboard</span>
            </NavLink>
            <NavLink to="/new" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="ico">+</span><span>New Booking</span>
            </NavLink>
            <NavLink to="/mine" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="ico">≡</span><span>My Bookings</span>
            </NavLink>
          </>
        )}

        <div className="section-label">Account</div>
        <div className="nav-item" onClick={handleLogout}>
          <span className="ico">→</span><span>Logout</span>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
