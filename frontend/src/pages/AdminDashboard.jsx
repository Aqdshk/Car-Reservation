import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Icon, Plate, StatusPill, fmtRange, tripState } from '../lib/ui';

function BookingRows({ rows, empty }) {
  if (rows.length === 0) return <div className="empty">{empty}</div>;
  return (
    <table className="tbl tbl-stack">
      <thead><tr><th>Driver</th><th>Vehicle</th><th>When</th><th>Destination</th><th>Status</th></tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td className="lead"><b>{r.bookerName}</b>{r.department && <div className="sub">{r.department}</div>}</td>
            <td data-label="Vehicle"><Plate>{r.vehiclePlate}</Plate></td>
            <td data-label="When" className="num">{fmtRange(r.startTime, r.endTime)}</td>
            <td data-label="Destination">{r.destination}</td>
            <td data-label="Status"><StatusPill state={tripState(r)}/></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    api.get('/reservations', { params: { pageSize: 500 } }).then(r => setBookings(r.data.items || []));
    api.get('/vehicles').then(r => setVehicles(r.data));
  }, []);

  const now = new Date();
  const { onRoad, upcoming, today, overdue } = useMemo(() => {
    const onRoad = bookings.filter(b => b.checkedInAt && !b.checkedOutAt);
    const upcoming = bookings
      .filter(b => !b.checkedInAt && new Date(b.endTime) >= now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).slice(0, 8);
    const today = bookings.filter(b => new Date(b.startTime).toDateString() === now.toDateString()).length;
    const overdue = onRoad.filter(b => new Date(b.endTime) < now).length;
    return { onRoad, upcoming, today, overdue };
  }, [bookings]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <Link to="/admin/vehicles" className="btn btn-ghost"><Icon name="qr" size={16}/>Vehicles &amp; QR tags</Link>
      </div>

      <div className="stats">
        <div className="stat"><div className="k"><Icon name="car" size={16}/>Fleet</div><div className="v">{vehicles.length}</div><div className="s">vehicles</div></div>
        <div className="stat"><div className="k"><Icon name="next" size={16}/>On the road</div><div className="v">{onRoad.length}</div><div className="s">{overdue ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>{overdue} overdue</span> : 'checked out now'}</div></div>
        <div className="stat"><div className="k"><Icon name="calendar" size={16}/>Starting today</div><div className="v">{today}</div><div className="s">bookings</div></div>
        <div className="stat"><div className="k"><Icon name="list" size={16}/>All time</div><div className="v">{bookings.length}</div><div className="s">bookings</div></div>
      </div>

      {onRoad.length > 0 && (
        <div className="card card-flush" style={{ marginBottom: 16 }}>
          <div className="card-head"><div className="card-title">On the road now</div></div>
          <BookingRows rows={onRoad} empty=""/>
        </div>
      )}

      <div className="card card-flush">
        <div className="card-head">
          <div className="card-title">Coming up</div>
          <Link to="/admin/bookings" className="btn btn-quiet btn-sm">All bookings <Icon name="next" size={14}/></Link>
        </div>
        <BookingRows rows={upcoming} empty="No upcoming bookings."/>
      </div>
    </>
  );
}
