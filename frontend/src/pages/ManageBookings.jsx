import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { Icon, Plate, StatusPill, bookingRef, fmtDTY, fmtRange, tripState } from '../lib/ui';

const FILTERS = [['all', 'All'], ['booked', 'Upcoming'], ['inuse', 'In use'], ['done', 'Returned']];
const photoUrl = (code, file) => `/api/reservations/track/${code}/photo/${file}`;

function Detail({ r, onClose, onDelete }) {
  const km = r.checkedOutAt ? r.endMileage - r.startMileage : null;
  return (
    <Modal title={`${r.bookerName} · ${r.vehicleName}`} subtitle={<>{bookingRef(r.id)} · <span className="code">{r.trackingCode}</span></>} onClose={onClose}
      footer={<>
        <button className="btn btn-danger" onClick={() => onDelete(r)}><Icon name="trash" size={15}/>Delete booking</button>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </>}>
      <div className="facts">
        <div className="fact"><div className="k">Status</div><div className="v"><StatusPill state={tripState(r)}/></div></div>
        <div className="fact"><div className="k">Vehicle</div><div className="v"><Plate>{r.vehiclePlate}</Plate></div></div>
        <div className="fact"><div className="k">When</div><div className="v">{fmtRange(r.startTime, r.endTime)}</div></div>
        <div className="fact"><div className="k">Destination</div><div className="v">{r.destination}</div></div>
        {/* Older bookings may carry these; the form no longer asks for them. */}
        {r.bookerPhone && <div className="fact"><div className="k">Phone</div><div className="v"><a href={`tel:${r.bookerPhone}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>{r.bookerPhone}</a></div></div>}
        {r.department && <div className="fact"><div className="k">Department</div><div className="v">{r.department}</div></div>}
        {r.passengers > 1 && <div className="fact"><div className="k">People</div><div className="v">{r.passengers}{r.passengerNames && <div className="muted" style={{ fontSize: 13.5 }}>{r.passengerNames}</div>}</div></div>}
        <div className="fact"><div className="k">Cards taken</div><div className="v">
          {r.needTngCard || r.needFuelCard
            ? <span style={{ display: 'flex', gap: 6 }}>{r.needTngCard && <span className="tag">Touch 'n Go</span>}{r.needFuelCard && <span className="tag">Fuel</span>}</span>
            : <span className="muted">None</span>}
        </div></div>
        {r.notes && <div className="fact" style={{ gridColumn: '1/-1' }}><div className="k">Notes</div><div className="v">{r.notes}</div></div>}
      </div>

      <div className="section-title" style={{ marginTop: 22 }}><Icon name="gauge" size={17}/>Odometer</div>
      <div className="facts">
        {[['Check in', r.checkedInAt, r.startMileage, r.startMileagePhoto], ['Check out', r.checkedOutAt, r.endMileage, r.endMileagePhoto]].map(([label, at, val, photo]) => (
          <div className="done-box" key={label}>
            <div className="k muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div>
            {at ? <>
              <div className="big-num">{val?.toLocaleString()} km</div>
              <div className="muted" style={{ fontSize: 13 }}>{fmtDTY(at)}</div>
              {photo && <a href={photoUrl(r.trackingCode, photo)} target="_blank" rel="noreferrer"><img src={photoUrl(r.trackingCode, photo)} alt={`${label} odometer`} className="proof-photo" loading="lazy"/></a>}
            </> : <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Not yet</div>}
          </div>
        ))}
      </div>
      {km != null && <div className="trip-summary"><Icon name="check" size={16}/>{km.toLocaleString()} km driven</div>}
    </Modal>
  );
}

export default function ManageBookings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);

  const load = () => api.get('/reservations', { params: { pageSize: 500 } })
    .then(r => setItems(r.data.items || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const del = async (r) => {
    if (!confirm(`Delete booking ${r.trackingCode} for ${r.bookerName}? This cannot be undone.`)) return;
    await api.delete(`/reservations/${r.id}`);
    setDetail(null);
    load();
  };

  const counts = useMemo(() => items.reduce((c, i) => { c[tripState(i)]++; c.all++; return c; }, { all: 0, booked: 0, inuse: 0, done: 0 }), [items]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(i => {
      if (filter !== 'all' && tripState(i) !== filter) return false;
      if (!s) return true;
      return [i.bookerName, i.vehiclePlate, i.vehicleName, i.trackingCode, i.destination, i.department]
        .some(v => v && v.toLowerCase().includes(s));
    });
  }, [items, filter, q]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bookings</h1>
          <p>Every booking is confirmed when it is made. Open one to see the odometer photos.</p>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-head">
          <div className="seg" role="tablist">
            {FILTERS.map(([k, label]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{label} <span className="muted num">{counts[k]}</span></button>
            ))}
          </div>
          <div className="search">
            <Icon name="search" size={16}/>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, plate, code…" aria-label="Search bookings"/>
          </div>
        </div>
        {loading ? <div className="empty">Loading…</div> : rows.length === 0 ? <div className="empty">{items.length ? 'Nothing matches.' : 'No bookings yet.'}</div> : (
          <table className="tbl tbl-stack">
            <thead><tr><th>Driver</th><th>Vehicle</th><th>When</th><th>Destination</th><th>Cards</th><th>Odometer</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="click" onClick={() => setDetail(r)}>
                  <td className="lead">
                    <b>{r.bookerName}</b>
                    <div className="sub"><span className="code">{r.trackingCode}</span>{r.department && ` · ${r.department}`}</div>
                  </td>
                  <td data-label="Vehicle"><Plate>{r.vehiclePlate}</Plate></td>
                  <td data-label="When" className="num">{fmtRange(r.startTime, r.endTime)}</td>
                  <td data-label="Destination">{r.destination}</td>
                  <td data-label="Cards">{r.needTngCard || r.needFuelCard
                    ? <span style={{ display: 'inline-flex', gap: 4 }}>{r.needTngCard && <span className="tag">TnG</span>}{r.needFuelCard && <span className="tag">Fuel</span>}</span>
                    : <span className="muted">—</span>}</td>
                  <td data-label="Odometer" className="num">
                    {r.checkedOutAt ? <b>{(r.endMileage - r.startMileage).toLocaleString()} km</b>
                      : r.checkedInAt ? <span>{r.startMileage?.toLocaleString()} km out</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td data-label="Status"><StatusPill state={tripState(r)}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail && <Detail r={detail} onClose={() => setDetail(null)} onDelete={del}/>}
    </>
  );
}
