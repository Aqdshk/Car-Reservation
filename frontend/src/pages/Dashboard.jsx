import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';

const fmt = (s) => new Date(s).toISOString().slice(0,10);
const badge = (s) => `badge badge-${s.toLowerCase()}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => { api.get('/reservations/mine').then(r => setItems(r.data)); }, []);

  const total = items.length;
  const pending = items.filter(i => i.status === 'Pending').length;
  const approved = items.filter(i => i.status === 'Approved').length;
  const rejected = items.filter(i => i.status === 'Rejected').length;

  return (
    <>
      <div className="page-head">
        <div className="breadcrumb">workspace <span className="accent">/</span> dashboard</div>
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="page-sub">Overview of your reservations</p>
      </div>

      <div className="stats">
        <div className="stat-card"><div className="label">Total Bookings</div><div className="value">{String(total).padStart(2,'0')}</div><div className="delta">all time</div></div>
        <div className="stat-card"><div className="label">Pending</div><div className="value">{String(pending).padStart(2,'0')}</div><div className="delta">awaiting approval</div></div>
        <div className="stat-card"><div className="label">Approved</div><div className="value">{String(approved).padStart(2,'0')}</div><div className="delta">ready to go</div></div>
        <div className="stat-card"><div className="label">Rejected</div><div className="value">{String(rejected).padStart(2,'0')}</div><div className="delta red">check reasons</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Activity</h3>
          <Link to="/new"><button className="btn btn-sm">+ New Booking</button></Link>
        </div>
        {items.length === 0 ? (
          <p style={{color:'var(--muted)',fontSize:14,padding:'20px 0'}}>No bookings yet. <Link to="/new" style={{color:'var(--accent)'}}>Create one →</Link></p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Vehicle</th><th>Purpose</th><th>Status</th></tr></thead>
            <tbody>
              {items.slice(0,5).map(r => (
                <tr key={r.id}>
                  <td><span className="mono">{fmt(r.startTime)}</span></td>
                  <td>{r.vehicleName} · <span className="mono">{r.vehiclePlate}</span></td>
                  <td>{r.destination}</td>
                  <td><span className={badge(r.status)}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
