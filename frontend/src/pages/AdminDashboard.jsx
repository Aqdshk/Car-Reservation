import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const fmt = (s) => new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });

export default function AdminDashboard() {
  const [pending, setPending] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const load = () => {
    api.get('/reservations/pending').then(r => setPending(r.data));
    api.get('/vehicles').then(r => setVehicles(r.data));
  };
  useEffect(() => { load(); }, []);

  const act = async (id, status) => {
    await api.patch(`/reservations/${id}/status`, { status });
    load();
  };

  const available = vehicles.filter(v => v.status === 'Available').length;

  return (
    <>
      <div className="page-head">
        <div className="breadcrumb">admin <span className="accent">/</span> overview</div>
        <h1 className="page-title">System Overview</h1>
        <p className="page-sub">Real-time fleet management dashboard</p>
      </div>

      <div className="stats">
        <div className="stat-card"><div className="label">Fleet Size</div><div className="value">{String(vehicles.length).padStart(2,'0')}</div><div className="delta">total vehicles</div></div>
        <div className="stat-card"><div className="label">Available</div><div className="value">{String(available).padStart(2,'0')}</div><div className="delta">ready to book</div></div>
        <div className="stat-card"><div className="label">Pending</div><div className="value">{String(pending.length).padStart(2,'0')}</div><div className="delta">needs review</div></div>
        <div className="stat-card"><div className="label">Active</div><div className="value">—</div><div className="delta">in use</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Pending Approvals</h3>
          <Link to="/admin/bookings"><button className="btn btn-sm btn-ghost">View all →</button></Link>
        </div>
        {pending.length === 0 ? (
          <p style={{color:'var(--muted)',fontSize:14,padding:'20px 0'}}>No pending requests. All caught up ✓</p>
        ) : (
          <table>
            <thead><tr><th>Staff</th><th>Vehicle</th><th>Date</th><th>Purpose</th><th></th></tr></thead>
            <tbody>
              {pending.map(r => (
                <tr key={r.id}>
                  <td>{r.userName}</td>
                  <td>{r.vehicleName}</td>
                  <td><span className="mono">{fmt(r.startTime)}</span></td>
                  <td>{r.destination}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => act(r.id, 'Approved')}>Approve</button>{' '}
                    <button className="btn btn-sm btn-ghost" onClick={() => act(r.id, 'Rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
