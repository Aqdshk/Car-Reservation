import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const fmt = (s) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    api.get('/reservations', { params: { pageSize: 500 } }).then(r => setBookings(r.data.items || r.data));
    api.get('/vehicles').then(r => setVehicles(r.data));
  }, []);

  const now = new Date();
  const upcoming = bookings
    .filter(b => new Date(b.endTime) >= now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 8);
  const activeNow = bookings.filter(b => {
    const s = new Date(b.startTime), e = new Date(b.endTime);
    return s <= now && e >= now && b.checkedInAt && !b.checkedOutAt;
  }).length;
  const todayCount = bookings.filter(b => {
    const s = new Date(b.startTime);
    return s.toDateString() === now.toDateString();
  }).length;

  return (
    <>
      <div className="page-head">
        <div className="breadcrumb">admin <span className="accent">/</span> overview</div>
        <h1 className="page-title">System Overview</h1>
        <p className="page-sub">Fleet & booking activity at a glance</p>
      </div>

      <div className="stats">
        <div className="stat-card"><div className="label">Fleet</div><div className="value">{String(vehicles.length).padStart(2,'0')}</div><div className="delta">total vehicles</div></div>
        <div className="stat-card"><div className="label">Today</div><div className="value">{String(todayCount).padStart(2,'0')}</div><div className="delta">bookings</div></div>
        <div className="stat-card"><div className="label">Active now</div><div className="value">{String(activeNow).padStart(2,'0')}</div><div className="delta">on the road</div></div>
        <div className="stat-card"><div className="label">All-time</div><div className="value">{String(bookings.length).padStart(3,'0')}</div><div className="delta">bookings</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Upcoming Bookings</h3>
          <Link to="/admin/bookings"><button className="btn btn-sm btn-ghost">View all →</button></Link>
        </div>
        {upcoming.length === 0 ? (
          <p style={{color:'var(--muted)',fontSize:14,padding:'20px 0'}}>No upcoming bookings.</p>
        ) : (
          <table>
            <thead><tr><th>Booker</th><th>Vehicle</th><th>Period</th><th>Destination</th><th>Status</th></tr></thead>
            <tbody>
              {upcoming.map(r => (
                <tr key={r.id}>
                  <td>{r.bookerName}{r.department && <span className="mono" style={{fontSize:11,color:'var(--muted)',marginLeft:6}}>· {r.department}</span>}</td>
                  <td>{r.vehicleName}</td>
                  <td><span className="mono" style={{fontSize:12}}>{fmt(r.startTime)}</span></td>
                  <td>{r.destination}</td>
                  <td>{r.checkedOutAt ? <span className="badge badge-approved">Done</span>
                    : r.checkedInAt ? <span className="badge badge-inuse">In use</span>
                    : <span className="badge badge-approved">Booked</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
