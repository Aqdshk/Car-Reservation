import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import ThemeToggle from '../components/ThemeToggle';

const fmtDT = (s) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

export default function Track() {
  const { code } = useParams();
  const nav = useNavigate();
  const [booking, setBooking] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  // Check-in form
  const [ciMileage, setCiMileage] = useState('');
  const [ciPhoto, setCiPhoto] = useState(null);
  const [ciLoading, setCiLoading] = useState(false);
  const [ciErr, setCiErr] = useState('');

  // Check-out form
  const [coMileage, setCoMileage] = useState('');
  const [coPhoto, setCoPhoto] = useState(null);
  const [coLoading, setCoLoading] = useState(false);
  const [coErr, setCoErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reservations/track/${code}`);
      setBooking(data);
      setErr('');
    } catch (e) {
      setErr(e.response?.data?.message || 'Booking not found');
      setBooking(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [code]);

  const submitCheckin = async (e) => {
    e.preventDefault(); setCiErr(''); setCiLoading(true);
    try {
      const fd = new FormData();
      fd.append('mileage', ciMileage);
      fd.append('photo', ciPhoto);
      await api.post(`/reservations/track/${code}/checkin`, fd, { headers: {'Content-Type':'multipart/form-data'} });
      await load();
    } catch (e) { setCiErr(e.response?.data?.message || 'Check-in failed'); }
    finally { setCiLoading(false); }
  };

  const submitCheckout = async (e) => {
    e.preventDefault(); setCoErr(''); setCoLoading(true);
    try {
      const fd = new FormData();
      fd.append('mileage', coMileage);
      fd.append('photo', coPhoto);
      await api.post(`/reservations/track/${code}/checkout`, fd, { headers: {'Content-Type':'multipart/form-data'} });
      await load();
    } catch (e) { setCoErr(e.response?.data?.message || 'Check-out failed'); }
    finally { setCoLoading(false); }
  };

  return (
    <div className="public-wrap">
      <header className="public-header">
        <div className="public-brand">
          <div className="logo-mini">→</div>
          <div>
            <div className="public-title">C-Zero Cars</div>
            <div className="public-sub mono">booking tracker</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <ThemeToggle/>
          <Link to="/" className="admin-link mono">home ›</Link>
        </div>
      </header>

      <main className="public-main" style={{maxWidth:780}}>
        {loading && <div className="card"><p style={{color:'var(--muted)'}}>Loading...</p></div>}

        {err && (
          <div className="card">
            <div className="error">{err}</div>
            <button className="btn" onClick={() => nav('/')}>← Back to vehicles</button>
          </div>
        )}

        {booking && (
          <>
            <div className="page-head">
              <div className="breadcrumb">tracking <span className="accent">/</span> {booking.trackingCode}</div>
              <h1 className="page-title">{booking.vehicleName}</h1>
              <p className="page-sub"><span className="mono">{booking.vehiclePlate}</span> · for {booking.bookerName}</p>
            </div>

            <div className="card">
              <h3 style={{marginBottom:14}}>Booking Details</h3>
              <div className="info-grid">
                <div><div className="info-label">STATUS</div><span className={`badge badge-${booking.status.toLowerCase()}`}>{booking.status}</span></div>
                <div><div className="info-label">TRACKING CODE</div><div className="mono" style={{fontSize:16,fontWeight:700,color:'var(--accent)'}}>{booking.trackingCode}</div></div>
                <div><div className="info-label">DESTINATION</div><div>{booking.destination}</div></div>
                <div><div className="info-label">PERIOD</div><div className="mono" style={{fontSize:12}}>{fmtDT(booking.startTime)}<br/>→ {fmtDT(booking.endTime)}</div></div>
                <div><div className="info-label">PASSENGERS</div><div>{booking.passengers}</div></div>
                <div><div className="info-label">EXTRAS</div><div>
                  {booking.needTngCard && <span className="badge badge-approved" style={{marginRight:6}}>TnG</span>}
                  {booking.needFuelCard && <span className="badge badge-approved">Fuel</span>}
                  {!booking.needTngCard && !booking.needFuelCard && <span style={{color:'var(--muted)'}}>—</span>}
                </div></div>
              </div>
            </div>

            {booking.status === 'Pending' && (
              <div className="card busy-card">
                <h3 style={{fontSize:15,marginBottom:6}}>⏳ Waiting for approval</h3>
                <p style={{color:'var(--muted)',fontSize:13}}>Your booking is being reviewed by admin. Check back later, or wait for confirmation.</p>
              </div>
            )}

            {booking.status === 'Rejected' && (
              <div className="card" style={{borderLeft:'3px solid var(--red)'}}>
                <h3 style={{fontSize:15,marginBottom:6,color:'var(--red)'}}>✕ Booking rejected</h3>
                <p style={{color:'var(--muted)',fontSize:13}}>Please contact admin or submit a new booking.</p>
              </div>
            )}

            {booking.status === 'Approved' && (
              <>
                {/* CHECK-IN */}
                <div className="card">
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                    <h3>① Check-in</h3>
                    {booking.checkedInAt && <span className="badge badge-approved">Done</span>}
                  </div>
                  <p className="page-sub" style={{marginBottom:14}}>Before you drive — record current mileage with photo proof.</p>

                  {!booking.checkedInAt ? (
                    <form onSubmit={submitCheckin}>
                      {ciErr && <div className="error">{ciErr}</div>}
                      <div className="form-grid">
                        <div className="form-group">
                          <label>CURRENT MILEAGE (KM) *</label>
                          <input type="number" min="0" value={ciMileage} onChange={(e) => setCiMileage(e.target.value)} placeholder="e.g. 45230" required/>
                        </div>
                        <div className="form-group">
                          <label>ODOMETER PHOTO *</label>
                          <input type="file" accept="image/*" capture="environment" onChange={(e) => setCiPhoto(e.target.files[0])} required/>
                        </div>
                      </div>
                      <div className="form-actions">
                        <button className="btn" disabled={ciLoading}>{ciLoading ? 'Uploading…' : 'Submit Check-in →'}</button>
                      </div>
                    </form>
                  ) : (
                    <div className="checkin-summary">
                      <div className="form-grid">
                        <div><div className="info-label">START MILEAGE</div><div className="mono" style={{fontSize:18,fontWeight:700}}>{booking.startMileage?.toLocaleString()} km</div></div>
                        <div><div className="info-label">CHECKED IN AT</div><div className="mono" style={{fontSize:12}}>{fmtDT(booking.checkedInAt)}</div></div>
                      </div>
                      {booking.startMileagePhoto && (
                        <div style={{marginTop:14}}>
                          <div className="info-label">PHOTO PROOF</div>
                          <img src={`/api/reservations/photo/${booking.startMileagePhoto}`} alt="Start mileage" className="proof-photo"/>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CHECK-OUT */}
                {booking.checkedInAt && (
                  <div className="card">
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                      <h3>② Check-out</h3>
                      {booking.checkedOutAt && <span className="badge badge-approved">Done</span>}
                    </div>
                    <p className="page-sub" style={{marginBottom:14}}>After trip — record final mileage with photo proof.</p>

                    {!booking.checkedOutAt ? (
                      <form onSubmit={submitCheckout}>
                        {coErr && <div className="error">{coErr}</div>}
                        <div className="form-grid">
                          <div className="form-group">
                            <label>FINAL MILEAGE (KM) *</label>
                            <input type="number" min={booking.startMileage || 0} value={coMileage} onChange={(e) => setCoMileage(e.target.value)} placeholder={`Must be ≥ ${booking.startMileage}`} required/>
                          </div>
                          <div className="form-group">
                            <label>ODOMETER PHOTO *</label>
                            <input type="file" accept="image/*" capture="environment" onChange={(e) => setCoPhoto(e.target.files[0])} required/>
                          </div>
                        </div>
                        <div className="form-actions">
                          <button className="btn" disabled={coLoading}>{coLoading ? 'Uploading…' : 'Submit Check-out →'}</button>
                        </div>
                      </form>
                    ) : (
                      <div className="checkin-summary">
                        <div className="form-grid">
                          <div><div className="info-label">END MILEAGE</div><div className="mono" style={{fontSize:18,fontWeight:700}}>{booking.endMileage?.toLocaleString()} km</div></div>
                          <div><div className="info-label">DISTANCE TRAVELED</div><div className="mono" style={{fontSize:18,fontWeight:700,color:'var(--accent)'}}>{(booking.endMileage - booking.startMileage).toLocaleString()} km</div></div>
                          <div><div className="info-label">CHECKED OUT AT</div><div className="mono" style={{fontSize:12}}>{fmtDT(booking.checkedOutAt)}</div></div>
                        </div>
                        {booking.endMileagePhoto && (
                          <div style={{marginTop:14}}>
                            <div className="info-label">PHOTO PROOF</div>
                            <img src={`/api/reservations/photo/${booking.endMileagePhoto}`} alt="End mileage" className="proof-photo"/>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {booking.checkedInAt && booking.checkedOutAt && (
                  <div className="card success-card">
                    <div className="success-icon">✓</div>
                    <h2>Trip complete!</h2>
                    <p className="page-sub">Thank you for using C-Zero Cars. Drive safely 🚗</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer className="public-footer mono">
        <span>c-zero booking system</span>
        <span>·</span>
        <Link to="/" style={{color:'var(--accent)'}}>home</Link>
      </footer>
    </div>
  );
}
