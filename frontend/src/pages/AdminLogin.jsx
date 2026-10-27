import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import ThemeToggle from '../components/ThemeToggle';
import { Brand } from '../components/PublicShell';
import { Icon } from '../lib/ui';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await login(email, password);
      window.location.replace('/admin');
    } catch (e) {
      setErr(e.response?.status === 429 ? 'Too many attempts. Wait a minute and try again.' : (e.response?.data?.message || 'Wrong email or password.'));
    } finally { setLoading(false); }
  };

  return (
    <div className="login">
      <div style={{ position: 'fixed', top: 16, right: 16 }}><ThemeToggle/></div>
      <div className="login-card">
        <Link to="/"><Brand/></Link>
        <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Admin sign in</h1>
            <p className="muted" style={{ fontSize: 14, marginTop: 2 }}>Manage the fleet and bookings.</p>
          </div>
          {err && <div className="alert">{err}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus/>
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required/>
          </div>
          <button className="btn btn-lg btn-block" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <Link to="/" className="backlink" style={{ marginTop: 16 }}><Icon name="back" size={16}/>Back to booking</Link>
      </div>
    </div>
  );
}
