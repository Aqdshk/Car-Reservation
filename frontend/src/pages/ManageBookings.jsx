import { useEffect, useState } from 'react';
import api from '../api';

const fmt = (s) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
const badge = (s) => `badge badge-${s.toLowerCase()}`;

export default function ManageBookings() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('All');

  const load = () => api.get('/reservations').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const act = async (id, status) => {
    await api.patch(`/reservations/${id}/status`, { status });
    load();
  };

  const del = async (id) => {
    if (!confirm('Delete this booking permanently?')) return;
    await api.delete(`/reservations/${id}`);
    load();
  };

  const filtered = filter === 'All' ? items : items.filter(i => i.status === filter);

  return (
    <>
      <div className="page-head">
        <div className="breadcrumb">admin <span className="accent">/</span> bookings</div>
        <h1 className="page-title">All Bookings</h1>
        <p className="page-sub">Review and process reservation requests</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Booking Queue</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            style={{padding:'7px 12px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-2)',color:'var(--text)',fontSize:12}}>
            <option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option>
          </select>
        </div>
        <table>
          <thead><tr><th>ID</th><th>Booker</th><th>Contact</th><th>Vehicle</th><th>Period</th><th>Purpose</th><th>Extras</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td><span className="mono">#R{String(r.id).padStart(3,'0')}</span></td>
                <td>{r.bookerName}{r.department && <div className="mono" style={{fontSize:11}}>{r.department}</div>}</td>
                <td>
                  {r.bookerPhone && <div className="mono" style={{fontSize:12}}>{r.bookerPhone}</div>}
                  {r.bookerEmail && <div className="mono" style={{fontSize:11,color:'var(--muted)'}}>{r.bookerEmail}</div>}
                </td>
                <td>{r.vehicleName}</td>
                <td><span className="mono">{fmt(r.startTime)}</span></td>
                <td>{r.destination}</td>
                <td className="mono" style={{fontSize:11}}>
                  {r.needTngCard && <div style={{color:'var(--accent)'}}>TnG ✓</div>}
                  {r.needFuelCard && <div style={{color:'var(--accent)'}}>Fuel ✓</div>}
                  {!r.needTngCard && !r.needFuelCard && <span style={{color:'var(--muted)'}}>—</span>}
                </td>
                <td><span className={badge(r.status)}>{r.status}</span></td>
                <td>
                  {r.status === 'Pending' ? (
                    <>
                      <button className="btn btn-sm" onClick={() => act(r.id, 'Approved')}>✓</button>{' '}
                      <button className="btn btn-sm btn-ghost" onClick={() => act(r.id, 'Rejected')}>✕</button>
                    </>
                  ) : (
                    <button className="btn btn-sm btn-ghost" onClick={() => del(r.id)}>🗑</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
