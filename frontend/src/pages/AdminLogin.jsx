import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@c-zero.my');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await login(email, password);
      nav('/admin');
    } catch (e) {
      setErr(e.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-wrap">
      <div className="glow glow-1"></div>
      <div className="glow glow-2"></div>
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">→</div>
        <h1>Admin Sign In</h1>
        <p className="sub">restricted area · <Link to="/" style={{color:'var(--accent)'}}>back to booking</Link></p>

        {err && <div className="error">{err}</div>}

        <div className="form-group">
          <label>EMAIL</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
        </div>
        <div className="form-group">
          <label>PASSWORD</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus/>
        </div>
        <button className="btn btn-full" disabled={loading}>{loading ? 'Signing in…' : 'Continue →'}</button>
      </form>
    </div>
  );
}
