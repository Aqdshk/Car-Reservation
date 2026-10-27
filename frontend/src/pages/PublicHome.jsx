import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import PublicShell from '../components/PublicShell';
import { Icon, Plate, StatusPill, VehicleIcon, fmtRange } from '../lib/ui';

const EMPTY = { bookerName: '', destination: '', startTime: '', endTime: '', needTngCard: false, needFuelCard: false };

function duration(s, e) {
  const mins = Math.round((new Date(e) - new Date(s)) / 60000);
  if (!(mins > 0)) return '';
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  return [d && `${d} day${d > 1 ? 's' : ''}`, h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ');
}

function VehicleList({ vehicles, loading }) {
  const nav = useNavigate();
  return (
    <>
      <div className="hero">
        <h1>Book a company car</h1>
        <p>Pick a vehicle, fill in four things, done. Scanning the QR on a key takes you straight to that car.</p>
      </div>
      {loading ? <div className="card empty">Loading vehicles…</div>
        : vehicles.length === 0 ? <div className="card empty">No vehicles have been added yet.</div>
        : (
          <div className="vehicle-grid">
            {vehicles.map(v => (
              <div className="vcard clickable" key={v.id} onClick={() => nav(`/book/${v.id}`)}
                role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav(`/book/${v.id}`)}>
                <div className="vcard-top">
                  <VehicleIcon type={v.type}/>
                  <Plate>{v.plateNumber}</Plate>
                </div>
                <div>
                  <h3>{v.make} {v.model}</h3>
                  <div className="meta">{v.type} · {v.seats} seats · {v.fuel}</div>
                </div>
                <div className="vcard-foot">
                  <StatusPill state={v.status === 'Available' ? 'available' : v.status.toLowerCase()}/>
                  <span className="btn btn-sm">Book <Icon name="next" size={15}/></span>
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}

function Success({ booking, onAnother }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(booking.trackingCode); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };
  const cards = [booking.needTngCard && "Touch 'n Go", booking.needFuelCard && 'Fuel'].filter(Boolean);
  return (
    <div className="card success">
      <div className="success-mark"><Icon name="check" size={30} strokeWidth={2.5}/></div>
      <h1>You're booked</h1>
      <p>{booking.vehicleName} · {fmtRange(booking.startTime, booking.endTime)}</p>
      {cards.length > 0 && <p>Remember to take the {cards.join(' and ')} card.</p>}

      <div className="code-box">
        <div className="k">Tracking code</div>
        <div className="v">{booking.trackingCode}</div>
        <button className="btn btn-ghost btn-sm" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={15}/>{copied ? 'Copied' : 'Copy code'}</button>
      </div>

      <ul className="next-steps">
        <li><span className="n">1</span><span>Take a screenshot of this code, or keep the tracking page open.</span></li>
        <li><span className="n">2</span><span>At the car, open the tracking page and <b>check in</b> with an odometer photo.</span></li>
        <li><span className="n">3</span><span>When you return, <b>check out</b> the same way. That's it.</span></li>
      </ul>

      <div className="row-center">
        <Link to={`/track/${booking.trackingCode}`} className="btn btn-lg">Open tracking page <Icon name="next" size={17}/></Link>
        <button className="btn btn-ghost btn-lg" onClick={onAnother}>Book another</button>
      </div>
    </div>
  );
}

function CardToggle({ checked, onChange, title, icon }) {
  return (
    <label className={`toggle-card ${checked ? 'on' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange}/>
      <span className="ico"><Icon name={icon} size={18}/></span>
      <span className="t">{title}</span>
    </label>
  );
}

function BookingForm({ vehicle, onBooked }) {
  const nav = useNavigate();
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setF(EMPTY); setErr(''); }, [vehicle.id]);

  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const len = f.startTime && f.endTime ? duration(f.startTime, f.endTime) : '';

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (new Date(f.endTime) <= new Date(f.startTime)) { setErr('The return time must be after the pick-up time.'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/reservations', { ...f, vehicleId: vehicle.id, passengers: 1, distanceKm: 0 });
      onBooked(data);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save the booking. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <>
      <button className="backlink" onClick={() => nav('/')}><Icon name="back" size={16}/>All vehicles</button>
      <div className="vehicle-summary" style={{ marginBottom: 18 }}>
        <VehicleIcon type={vehicle.type} size={28}/>
        <div>
          <h1>{vehicle.make} {vehicle.model}</h1>
          <div className="meta"><Plate>{vehicle.plateNumber}</Plate><span>{vehicle.type} · {vehicle.seats} seats · {vehicle.fuel}</span></div>
        </div>
      </div>

      <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label htmlFor="name">Your name<span className="req">*</span></label>
          <input id="name" value={f.bookerName} onChange={set('bookerName')} autoComplete="name" required/>
        </div>
        <div className="field">
          <label htmlFor="dest">Destination<span className="req">*</span></label>
          <input id="dest" value={f.destination} onChange={set('destination')} placeholder="e.g. Client office, Shah Alam" required/>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="start">Pick up<span className="req">*</span></label>
            <input id="start" type="datetime-local" value={f.startTime} onChange={set('startTime')} required/>
          </div>
          <div className="field">
            <label htmlFor="end">Return<span className="req">*</span></label>
            <input id="end" type="datetime-local" value={f.endTime} min={f.startTime || undefined} onChange={set('endTime')} required/>
          </div>
        </div>
        {len && <div className="trip-summary" style={{ marginTop: 0 }}><Icon name="clock" size={16}/>{fmtRange(f.startTime, f.endTime)} · {len}</div>}

        <div className="field">
          <span className="label">Taking a card?</span>
          <div className="extras">
            <CardToggle checked={f.needTngCard} onChange={set('needTngCard')} title="Touch 'n Go card" icon="card"/>
            <CardToggle checked={f.needFuelCard} onChange={set('needFuelCard')} title="Fuel card" icon="fuel"/>
          </div>
        </div>

        {err && <div className="alert">{err}</div>}
        <div className="submit-bar" style={{ marginTop: 4 }}>
          <button type="submit" className="btn btn-lg" disabled={saving}>{saving ? 'Booking…' : 'Confirm booking'}</button>
        </div>
      </form>
    </>
  );
}

export default function PublicHome() {
  const { vehicleId } = useParams();
  const nav = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles(r.data)).catch(() => setVehicles([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { setBooked(null); }, [vehicleId]);

  const vehicle = vehicleId ? vehicles.find(v => String(v.id) === String(vehicleId)) : null;

  let body;
  if (booked) body = <Success booking={booked} onAnother={() => { setBooked(null); nav('/'); }}/>;
  else if (!vehicleId) body = <VehicleList vehicles={vehicles} loading={loading}/>;
  else if (loading) body = <div className="card empty">Loading…</div>;
  else if (!vehicle) body = (
    <div className="card empty">
      <p style={{ marginBottom: 14 }}>This vehicle is no longer in the fleet.</p>
      <Link to="/" className="btn btn-ghost">See all vehicles</Link>
    </div>
  );
  else body = <BookingForm vehicle={vehicle} onBooked={setBooked}/>;

  return <PublicShell narrow={!!vehicleId || !!booked}>{body}</PublicShell>;
}
