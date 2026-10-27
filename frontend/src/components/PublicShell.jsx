import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { Icon } from '../lib/ui';

export function Brand({ sub = 'Company vehicle booking' }) {
  return (
    <span className="brand">
      <span className="brand-mark"><Icon name="car" size={18}/></span>
      <span>C-Zero Cars{sub && <small>{sub}</small>}</span>
    </span>
  );
}

export default function PublicShell({ children, narrow = false }) {
  return (
    <div className="pub">
      <header className="topbar">
        <Link to="/" aria-label="All vehicles"><Brand/></Link>
        <div className="topbar-actions">
          <Link to="/track" className="btn btn-ghost btn-sm"><Icon name="search" size={15}/>Track booking</Link>
          <ThemeToggle/>
        </div>
      </header>
      <main className={`pub-main ${narrow ? 'pub-narrow' : ''}`}>{children}</main>
      <footer className="pub-foot">C-Zero Cars · <Link to="/admin/login">Admin</Link></footer>
    </div>
  );
}
