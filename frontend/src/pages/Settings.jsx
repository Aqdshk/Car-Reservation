import { useEffect, useState } from 'react';
import api from '../api';
import { Icon } from '../lib/ui';

function CardStat({ label, icon, total, inUse }) {
  const free = Math.max(0, total - inUse);
  const pct = total ? Math.round((inUse / total) * 100) : 0;
  return (
    <div className="stat">
      <div className="k"><Icon name={icon} size={16}/>{label}</div>
      <div className="v">{free}<span className="muted" style={{ fontSize: 16, fontWeight: 600 }}> / {total} free</span></div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--sunken)', marginTop: 12, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: free === 0 && total ? 'var(--red)' : 'var(--accent)', borderRadius: 99 }}/>
      </div>
      <div className="s">{inUse} on open bookings</div>
    </div>
  );
}

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [tng, setTng] = useState(0);
  const [fuel, setFuel] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    const { data } = await api.get('/settings/cards');
    setStatus(data); setTng(data.totalTng); setFuel(data.totalFuel);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await api.put('/settings/cards', { totalTngCards: Number(tng), totalFuelCards: Number(fuel) });
      await load();
      setMsg({ ok: true, text: 'Saved.' });
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Could not save.' });
    } finally { setSaving(false); }
  };

  if (!status) return <div className="card empty">Loading…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cards</h1>
          <p>How many Touch 'n Go and fuel cards the office holds.</p>
        </div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <CardStat label="Touch 'n Go" icon="card" total={status.totalTng} inUse={status.inUseTng}/>
        <CardStat label="Fuel" icon="fuel" total={status.totalFuel} inUse={status.inUseFuel}/>
      </div>

      <form className="card" onSubmit={save}>
        <div className="card-title" style={{ marginBottom: 14 }}>Cards in the office</div>
        <div className="grid-2" style={{ maxWidth: 520 }}>
          <div className="field">
            <label htmlFor="tng">Touch 'n Go cards</label>
            <input id="tng" type="number" min="0" value={tng} onChange={(e) => setTng(e.target.value)} required/>
          </div>
          <div className="field">
            <label htmlFor="fuel">Fuel cards</label>
            <input id="fuel" type="number" min="0" value={fuel} onChange={(e) => setFuel(e.target.value)} required/>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 14, maxWidth: 620 }}>
          "Out" counts every booking that asked for a card and has not been checked out (returned) yet,
          including future ones. A new booking only gets a card if one is free for its own dates.
        </p>
        {msg && <div className={`alert ${msg.ok ? 'alert-ok' : ''}`} style={{ marginTop: 14 }}>{msg.text}</div>}
        <div style={{ marginTop: 18 }}>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </>
  );
}
