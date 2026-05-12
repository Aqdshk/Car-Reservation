import { useEffect, useState } from 'react';
import api from '../api';

const fmt = (s) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
const badge = (s) => `badge badge-${s.toLowerCase()}`;

export default function MyBookings() {
  const [items, setItems] = useState([]);

  const load = () => api.get('/reservations/mine').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    await api.delete(`/reservations/${id}`);
    load();
  };

  return (
    <>
      <div className="page-head">
        <div className="breadcrumb">workspace <span className="accent">/</span> bookings</div>
        <h1 className="page-title">My Bookings</h1>
        <p className="page-sub">All your reservation history</p>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <p style={{color:'var(--muted)',fontSize:14,padding:'20px 0'}}>No bookings yet.</p>
        ) : (
          <table>
            <thead><tr><th>ID</th><th>Vehicle</th><th>Period</th><th>Purpose</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id}>
                  <td><span className="mono">#R{String(r.id).padStart(3,'0')}</span></td>
                  <td>{r.vehicleName}</td>
                  <td><span className="mono">{fmt(r.startTime)}</span></td>
                  <td>{r.destination}</td>
                  <td><span className={badge(r.status)}>{r.status}</span></td>
                  <td>{r.status === 'Pending' ? <button className="btn btn-sm btn-danger" onClick={() => cancel(r.id)}>Cancel</button> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
