import { useEffect, useState } from 'react';
import api from '../api';

const fmt = (s) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
const fmtFull = (s) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
const badge = (s) => `badge badge-${s.toLowerCase()}`;

export default function ManageBookings() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('All');
  const [detail, setDetail] = useState(null);

  const load = () => api.get('/reservations', { params: { pageSize: 500 } }).then(r => setItems(r.data.items));
  useEffect(() => { load(); }, []);

  const act = async (id, status) => {
    await api.patch(`/reservations/${id}/status`, { status });
    load();
    if (detail?.id === id) {
      const updated = (await api.get('/reservations', { params: { pageSize: 500 } })).data.items.find(b => b.id === id);
      setDetail(updated);
    }
  };

  const del = async (id) => {
    if (!confirm('Delete this booking permanently?')) return;
    await api.delete(`/reservations/${id}`);
    setDetail(null);
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
          <thead><tr><th>ID / Code</th><th>Booker</th><th>Contact</th><th>Vehicle</th><th>Period</th><th>Purpose</th><th>Extras</th><th>Mileage</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{cursor:'pointer'}} onClick={() => setDetail(r)}>
                <td>
                  <div className="mono">#R{String(r.id).padStart(3,'0')}</div>
                  <div className="mono" style={{color:'var(--accent)',fontSize:11,fontWeight:700,letterSpacing:1}}>{r.trackingCode}</div>
                </td>
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
                <td className="mono" style={{fontSize:11}}>
                  {r.checkedInAt ? <div style={{color:'var(--accent)'}}>In: {r.startMileage?.toLocaleString()}km</div> : <div style={{color:'var(--muted)'}}>—</div>}
                  {r.checkedOutAt ? <div style={{color:'var(--accent)'}}>Out: {r.endMileage?.toLocaleString()}km</div> : null}
                  {r.checkedInAt && r.checkedOutAt && <div style={{color:'var(--accent)',fontWeight:700}}>Δ {(r.endMileage - r.startMileage).toLocaleString()}km</div>}
                </td>
                <td><span className={badge(r.status)}>{r.status}</span></td>
                <td onClick={(e) => e.stopPropagation()}>
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

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="breadcrumb">booking <span className="accent">/</span> #R{String(detail.id).padStart(3,'0')}</div>
                <h2 style={{fontSize:22,marginTop:4}}>{detail.bookerName} · {detail.vehicleName}</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>✕ Close</button>
            </div>

            <div className="info-grid" style={{marginBottom:18}}>
              <div><div className="info-label">TRACKING CODE</div><div className="mono" style={{fontSize:18,fontWeight:700,color:'var(--accent)',letterSpacing:2}}>{detail.trackingCode}</div></div>
              <div><div className="info-label">STATUS</div><span className={badge(detail.status)}>{detail.status}</span></div>
              <div><div className="info-label">VEHICLE</div><div>{detail.vehicleName} · <span className="mono">{detail.vehiclePlate}</span></div></div>
              <div><div className="info-label">DESTINATION</div><div>{detail.destination}</div></div>
              <div><div className="info-label">PERIOD</div><div className="mono" style={{fontSize:12}}>{fmtFull(detail.startTime)}<br/>→ {fmtFull(detail.endTime)}</div></div>
              <div><div className="info-label">PASSENGERS</div><div>{detail.passengers}</div></div>
              <div><div className="info-label">CONTACT</div><div className="mono" style={{fontSize:12}}>{detail.bookerPhone || '-'}<br/>{detail.bookerEmail || '-'}</div></div>
              <div><div className="info-label">EXTRAS</div><div>
                {detail.needTngCard && <span className="badge badge-approved" style={{marginRight:6}}>TnG</span>}
                {detail.needFuelCard && <span className="badge badge-approved">Fuel</span>}
                {!detail.needTngCard && !detail.needFuelCard && <span style={{color:'var(--muted)'}}>—</span>}
              </div></div>
              {detail.notes && <div style={{gridColumn:'1/-1'}}><div className="info-label">NOTES</div><div style={{fontSize:13}}>{detail.notes}</div></div>}
            </div>

            <h3 style={{marginBottom:12,fontSize:15}}>Mileage Records</h3>
            <div className="info-grid">
              <div>
                <div className="info-label">CHECK-IN</div>
                {detail.checkedInAt ? (
                  <>
                    <div className="mono" style={{fontSize:18,fontWeight:700}}>{detail.startMileage?.toLocaleString()} km</div>
                    <div className="mono" style={{fontSize:11,color:'var(--muted)'}}>{fmtFull(detail.checkedInAt)}</div>
                    {detail.startMileagePhoto && <img src={`/api/reservations/track/${detail.trackingCode}/photo/${detail.startMileagePhoto}`} alt="Start mileage" className="proof-photo" style={{marginTop:8}}/>}
                  </>
                ) : <div style={{color:'var(--muted)',fontSize:13}}>Not checked in yet</div>}
              </div>
              <div>
                <div className="info-label">CHECK-OUT</div>
                {detail.checkedOutAt ? (
                  <>
                    <div className="mono" style={{fontSize:18,fontWeight:700}}>{detail.endMileage?.toLocaleString()} km</div>
                    <div className="mono" style={{fontSize:11,color:'var(--muted)'}}>{fmtFull(detail.checkedOutAt)}</div>
                    {detail.endMileagePhoto && <img src={`/api/reservations/track/${detail.trackingCode}/photo/${detail.endMileagePhoto}`} alt="End mileage" className="proof-photo" style={{marginTop:8}}/>}
                  </>
                ) : <div style={{color:'var(--muted)',fontSize:13}}>Not checked out yet</div>}
              </div>
            </div>

            {detail.checkedInAt && detail.checkedOutAt && (
              <div style={{marginTop:18,padding:14,background:'var(--bg-2)',border:'1px solid var(--accent)',borderLeft:'3px solid var(--accent)',borderRadius:8}}>
                <div className="info-label">DISTANCE TRAVELED</div>
                <div className="mono" style={{fontSize:24,fontWeight:700,color:'var(--accent)'}}>{(detail.endMileage - detail.startMileage).toLocaleString()} km</div>
              </div>
            )}

            <div className="form-actions" style={{marginTop:24}}>
              {detail.status === 'Pending' && (
                <>
                  <button className="btn btn-ghost" onClick={() => act(detail.id, 'Rejected')}>Reject</button>
                  <button className="btn" onClick={() => act(detail.id, 'Approved')}>Approve →</button>
                </>
              )}
              {detail.status !== 'Pending' && (
                <button className="btn btn-danger" onClick={() => del(detail.id)}>Delete booking</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
