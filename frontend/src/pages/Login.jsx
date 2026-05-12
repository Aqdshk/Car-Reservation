import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const [email, setEmail] = useState('aqid@c-zero.my');
  const [password, setPassword] = useState('staff123');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const u = await login(email, password);
      nav(u.role === 'Admin' ? '/admin' : '/');
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
        <h1>Sign in</h1>
        <p className="sub">access <span className="mono">reservation.c-zero.my</span></p>

        {err && <div className="error">{err}</div>}

        <div className="form-group">
          <label>EMAIL</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>PASSWORD</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-full" disabled={loading}>{loading ? 'Signing in…' : 'Continue →'}</button>

        <p style={{textAlign:'center',marginTop:20,fontSize:12,color:'var(--muted)',fontFamily:'JetBrains Mono'}}>
          v1.0.0 · contact admin for password reset
        </p>
      </form>
    </div>
  );
}
