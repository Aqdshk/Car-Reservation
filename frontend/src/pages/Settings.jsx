import { useEffect, useState } from 'react';
import api from '../api';

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [tng, setTng] = useState(0);
  const [fuel, setFuel] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const { data } = await api.get('/settings/cards');
    setStatus(data);
    setTng(data.totalTng);
    setFuel(data.totalFuel);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.put('/settings/cards', { totalTngCards: Number(tng), totalFuelCards: Number(fuel) });
      setMsg('✓ Saved');
      await load();
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (!status) return null;

  return (
    <>
      <div className="page-head">
        <div className="breadcrumb">admin <span className="accent">/</span> settings</div>
        <h1 className="page-title">Card Inventory</h1>
        <p className="page-sub">Manage Touch 'n Go and Fuel card stock</p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="label">Total TnG Cards</div>
          <div className="value">{String(status.totalTng).padStart(2,'0')}</div>
          <div className="delta">in inventory</div>
        </div>
        <div className="stat-card">
          <div className="label">TnG In Use</div>
          <div className="value" style={{color:'var(--orange)'}}>{String(status.inUseTng).padStart(2,'0')}</div>
          <div className="delta">currently out</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Fuel Cards</div>
          <div className="value">{String(status.totalFuel).padStart(2,'0')}</div>
          <div className="delta">in inventory</div>
        </div>
        <div className="stat-card">
          <div className="label">Fuel In Use</div>
          <div className="value" style={{color:'var(--orange)'}}>{String(status.inUseFuel).padStart(2,'0')}</div>
          <div className="delta">currently out</div>
        </div>
      </div>

      <form className="card" onSubmit={save}>
        <h3 style={{marginBottom:16}}>Update Inventory</h3>
        {msg && <div className={msg.startsWith('✓') ? '' : 'error'} style={msg.startsWith('✓') ? {color:'var(--accent)',marginBottom:14,fontSize:13} : null}>{msg}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label>TOTAL TNG CARDS</label>
            <input type="number" min="0" value={tng} onChange={(e) => setTng(e.target.value)} required/>
            <p style={{fontSize:11,color:'var(--muted)',marginTop:6,fontFamily:'JetBrains Mono'}}>{status.availableTng} available now</p>
          </div>
          <div className="form-group">
            <label>TOTAL FUEL CARDS</label>
            <input type="number" min="0" value={fuel} onChange={(e) => setFuel(e.target.value)} required/>
            <p style={{fontSize:11,color:'var(--muted)',marginTop:6,fontFamily:'JetBrains Mono'}}>{status.availableFuel} available now</p>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>

      <div className="card">
        <h3 style={{marginBottom:10,fontSize:15}}>How it works</h3>
        <ul style={{listStyle:'disc',paddingLeft:20,fontSize:13,color:'var(--muted)',lineHeight:1.7}}>
          <li>When a booking is <strong>approved</strong> with a card requested → card counts as "in use"</li>
          <li>When user <strong>checks out</strong> the vehicle → card becomes available again</li>
          <li>If all cards are in use, the checkbox is disabled on the booking form</li>
          <li>Admin can also see remaining count when approving requests</li>
        </ul>
      </div>
    </>
  );
}
