import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import MiniCalendar from '../components/MiniCalendar';

const emojiFor = (type) => ({ Sedan:'🚗', Pickup:'🛻', SUV:'🚙', Van:'🚐' }[type] || '🚗');
const fmtRange = (s, e) => {
  const sd = new Date(s), ed = new Date(e);
  const opt = { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' };
  return `${sd.toLocaleString('en-GB', opt)} → ${ed.toLocaleString('en-GB', opt)}`;
};

export default function PublicHome() {
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [trackCode, setTrackCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bookerName: '', bookerEmail: '', bookerPhone: '', department: '',
    destination: '', startTime: '', endTime: '',
    passengers: 1, distanceKm: 0,
    needTngCard: false, needFuelCard: false, notes: ''
  });

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles(r.data));
  }, []);

  const openBooking = async (v) => {
    setSelected(v);
    setSubmitted(false); setErr('');
    setForm(f => ({ ...f, destination:'', startTime:'', endTime:'', notes:'', needTngCard:false, needFuelCard:false }));
    try {
      const { data } = await api.get(`/reservations/busy/${v.id}`);
      setBusy(data);
    } catch { setBusy([]); }
  };

  const closeBooking = () => { setSelected(null); setSubmitted(false); setBusy([]); };

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value}));

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/reservations', { ...form, vehicleId: selected.id });
      setSubmittedData(data);
      setSubmitted(true);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to submit booking');
    } finally { setLoading(false); }
  };

  return (
    <div className="public-wrap">
      <header className="public-header">
        <div className="public-brand">
          <div className="logo-mini">→</div>
          <div>
            <div className="public-title">C-Zero Cars</div>
            <div className="public-sub mono">company vehicle reservation</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <form onSubmit={(e) => { e.preventDefault(); if (trackCode.trim()) location.href = `/track/${trackCode.trim().toUpperCase()}`; }} style={{display:'flex',gap:6}}>
            <input value={trackCode} onChange={(e) => setTrackCode(e.target.value.toUpperCase())} placeholder="TRACKING CODE" maxLength="8"
              style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-2)',color:'var(--text)',fontFamily:'JetBrains Mono',fontSize:12,letterSpacing:1,width:130}}/>
            <button type="submit" className="admin-link mono" style={{cursor:'pointer'}}>track ›</button>
          </form>
          <Link to="/admin/login" className="admin-link mono">admin ›</Link>
        </div>
      </header>

      <main className="public-main">
        {!selected && (
          <>
            <div className="page-head">
              <div className="breadcrumb">public <span className="accent">/</span> available vehicles</div>
              <h1 className="page-title">Book a Vehicle</h1>
              <p className="page-sub">Browse available cars below. Click any to make a booking request.</p>
            </div>

            {vehicles.length === 0 ? (
              <div className="card"><p style={{color:'var(--muted)'}}>No vehicles available right now.</p></div>
            ) : (
              <div className="vehicle-grid">
                {vehicles.map(v => (
                  <div className="vehicle-card clickable" key={v.id} onClick={() => openBooking(v)}>
                    <div className="row">
                      <div className="car-emoji">{emojiFor(v.type)}</div>
                      <span className="plate">{v.plateNumber}</span>
                    </div>
                    <h4>{v.make} {v.model}</h4>
                    <p className="meta">{v.type} · {v.seats} seats · {v.fuel}</p>
                    <span className={`badge badge-${v.status.toLowerCase()}`}>{v.status}</span>
                    <div className="actions" style={{justifyContent:'flex-end'}}>
                      <button className="btn btn-sm">Book this →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selected && submitted && submittedData && (
          <div className="card success-card">
            <div className="success-icon">✓</div>
            <h2>Booking submitted!</h2>
            <p className="page-sub">Request sent to admin for approval.</p>

            <div style={{margin:'24px auto',maxWidth:400,padding:20,background:'var(--bg-2)',border:'1px solid var(--accent)',borderRadius:12}}>
              <div className="info-label" style={{textAlign:'center'}}>YOUR TRACKING CODE</div>
              <div className="mono" style={{fontSize:32,fontWeight:700,color:'var(--accent)',letterSpacing:3,marginTop:8}}>{submittedData.trackingCode}</div>
              <p style={{fontSize:12,color:'var(--muted)',marginTop:12}}>📸 Save this code — you'll need it to check-in/check-out vehicle later</p>
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
              <Link to={`/track/${submittedData.trackingCode}`}><button className="btn">View tracking page →</button></Link>
              <button className="btn btn-ghost" onClick={() => { setSubmittedData(null); closeBooking(); }}>← Back to vehicles</button>
            </div>
          </div>
        )}

        {selected && !submitted && (
          <>
            <div className="page-head">
              <div className="breadcrumb">
                <span onClick={closeBooking} style={{cursor:'pointer'}}>vehicles</span> <span className="accent">/</span> book {selected.plateNumber}
              </div>
              <h1 className="page-title">{selected.make} {selected.model}</h1>
              <p className="page-sub">{selected.type} · {selected.seats} seats · {selected.fuel} · <span className="mono">{selected.plateNumber}</span></p>
            </div>

            <div className="booking-layout">
              <aside className="calendar-side">
                <div className="card">
                  <h3 style={{marginBottom:14,fontSize:14}}>Pick your dates</h3>
                  <MiniCalendar
                    vehicleId={selected.id}
                    selectedStart={form.startTime ? new Date(form.startTime) : null}
                    selectedEnd={form.endTime ? new Date(form.endTime) : null}
                    onRangeSelect={(s, e) => {
                      const toLocalDT = (d, h, m) => {
                        const dt = new Date(d); dt.setHours(h, m, 0, 0);
                        const pad = (n) => String(n).padStart(2,'0');
                        return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
                      };
                      setForm(f => ({
                        ...f,
                        startTime: s ? toLocalDT(s, 9, 0) : '',
                        endTime: e ? toLocalDT(e, 17, 0) : (s && !e ? f.endTime : ''),
                      }));
                    }}
                  />
                </div>
                {busy.length > 0 && (
                  <div className="card busy-card">
                    <h3 style={{marginBottom:10,fontSize:13}}>Upcoming bookings</h3>
                    <ul className="busy-list">
                      {busy.slice(0,6).map(b => (
                        <li key={b.id}>
                          <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                          <span className="mono" style={{fontSize:11}}>{fmtRange(b.startTime, b.endTime)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>

              <form className="card form-side" onSubmit={submit}>
                {err && <div className="error">{err}</div>}

                <h3 style={{marginBottom:16}}>Your details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>YOUR NAME *</label>
                    <input value={form.bookerName} onChange={set('bookerName')} placeholder="Full name" required/>
                  </div>
                  <div className="form-group">
                    <label>DEPARTMENT</label>
                    <input value={form.department} onChange={set('department')} placeholder="e.g. Sales, IT"/>
                  </div>
                  <div className="form-group">
                    <label>EMAIL</label>
                    <input type="email" value={form.bookerEmail} onChange={set('bookerEmail')} placeholder="you@c-zero.my"/>
                  </div>
                  <div className="form-group">
                    <label>PHONE</label>
                    <input value={form.bookerPhone} onChange={set('bookerPhone')} placeholder="012-3456789"/>
                  </div>
                </div>

                <h3 style={{margin:'24px 0 16px'}}>Trip details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>DESTINATION *</label>
                    <input value={form.destination} onChange={set('destination')} placeholder="e.g. KL Sentral" required/>
                  </div>
                  <div className="form-group">
                    <label>PASSENGERS</label>
                    <input type="number" min="1" value={form.passengers} onChange={set('passengers')} required/>
                  </div>
                  <div className="form-group">
                    <label>START *</label>
                    <input type="datetime-local" value={form.startTime} onChange={set('startTime')} required/>
                  </div>
                  <div className="form-group">
                    <label>END *</label>
                    <input type="datetime-local" value={form.endTime} onChange={set('endTime')} required/>
                  </div>
                  <div className="form-group">
                    <label>DISTANCE (KM)</label>
                    <input type="number" min="0" value={form.distanceKm} onChange={set('distanceKm')}/>
                  </div>
                </div>

                <h3 style={{margin:'24px 0 16px'}}>Extras</h3>
                <div className="checkbox-row">
                  <label className="checkbox-item">
                    <input type="checkbox" checked={form.needTngCard} onChange={set('needTngCard')}/>
                    <span className="checkbox-label">Need <strong>Touch 'n Go</strong> card</span>
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={form.needFuelCard} onChange={set('needFuelCard')}/>
                    <span className="checkbox-label">Need <strong>Fuel</strong> card</span>
                  </label>
                </div>

                <div className="form-group" style={{marginTop:18}}>
                  <label>NOTES</label>
                  <textarea rows="3" value={form.notes} onChange={set('notes')} placeholder="Additional information..."/>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={closeBooking}>Cancel</button>
                  <button type="submit" className="btn" disabled={loading}>{loading ? 'Submitting…' : 'Submit Booking →'}</button>
                </div>
              </form>
            </div>
          </>
        )}
      </main>

      <footer className="public-footer mono">
        <span>c-zero booking system</span>
        <span>·</span>
        <Link to="/admin/login" style={{color:'var(--accent)'}}>admin</Link>
      </footer>
    </div>
  );
}
