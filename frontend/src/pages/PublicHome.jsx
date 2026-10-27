import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import MiniCalendar from '../components/MiniCalendar';
import PublicShell from '../components/PublicShell';
import { Icon, Plate, StatusPill, VehicleIcon, fmtRange, toLocalInput } from '../lib/ui';

const EMPTY_TRIP = { destination: '', startTime: '', endTime: '', notes: '', needTngCard: false, needFuelCard: false, passengers: 1, passengerList: [''] };

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
        <p>Pick a vehicle, choose your dates, done. Scanning the QR on a key takes you straight to that car.</p>
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
  return (
    <div className="card success">
      <div className="success-mark"><Icon name="check" size={30} strokeWidth={2.5}/></div>
      <h1>You're booked</h1>
      <p>{booking.vehicleName} · {fmtRange(booking.startTime, booking.endTime)}</p>

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

function BookingForm({ vehicle, cardStatus, onBooked }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState([]);
  const [who, setWho] = useState({ bookerName: '', bookerPhone: '', department: '' });
  const [trip, setTrip] = useState(EMPTY_TRIP);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTrip(EMPTY_TRIP); setErr('');
    api.get(`/reservations/busy/${vehicle.id}`).then(r => setBusy(r.data)).catch(() => setBusy([]));
  }, [vehicle.id]);

  const upcoming = useMemo(() => busy.filter(b => new Date(b.endTime) >= new Date()).slice(0, 5), [busy]);

  const setW = (k) => (e) => setWho(w => ({ ...w, [k]: e.target.value }));
  const setT = (k) => (e) => setTrip(t => ({ ...t, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const setCount = (n) => setTrip(t => {
    n = Math.max(1, Math.min(vehicle.seats || 20, n));
    const list = [...t.passengerList];
    while (list.length < n) list.push('');
    list.length = n;
    return { ...t, passengers: n, passengerList: list };
  });

  const onRange = (s, e) => {
    const at = (d, h) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return toLocalInput(x); };
    setTrip(t => ({ ...t, startTime: s ? at(s, 9) : '', endTime: e ? at(e, 17) : '' }));
  };

  const len = trip.startTime && trip.endTime ? duration(trip.startTime, trip.endTime) : '';
  // Counts here are "free right now". Whether a card is free for the chosen
  // dates is checked by the server when the booking is saved.
  const tngOut = cardStatus?.totalTng === 0, fuelOut = cardStatus?.totalFuel === 0;
  const freeNow = (free, total) => total === 0 ? 'The office has none' : free <= 0 ? 'All out right now; checked for your dates' : `${free} of ${total} free now`;

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (new Date(trip.endTime) <= new Date(trip.startTime)) { setErr('The return time must be after the start time.'); return; }
    setSaving(true);
    try {
      const { passengerList, ...rest } = trip;
      const payload = {
        ...who, ...rest, vehicleId: vehicle.id, distanceKm: 0,
        passengerNames: passengerList.map(n => n.trim()).filter(Boolean).join(', '),
      };
      const { data } = await api.post('/reservations', payload);
      onBooked(data);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save the booking. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <>
      <button className="backlink" onClick={() => nav('/')}><Icon name="back" size={16}/>All vehicles</button>
      <div className="vehicle-summary">
        <VehicleIcon type={vehicle.type} size={28}/>
        <div>
          <h1>{vehicle.make} {vehicle.model}</h1>
          <div className="meta"><Plate>{vehicle.plateNumber}</Plate><span>{vehicle.type} · {vehicle.seats} seats · {vehicle.fuel}</span></div>
        </div>
      </div>

      <div className="book-layout">
        <form className="card" onSubmit={submit}>
          <div className="form-section">
            <div className="section-title"><Icon name="clock" size={17}/>When</div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="start">Pick up<span className="req">*</span></label>
                <input id="start" type="datetime-local" value={trip.startTime} onChange={setT('startTime')} required/>
              </div>
              <div className="field">
                <label htmlFor="end">Return<span className="req">*</span></label>
                <input id="end" type="datetime-local" value={trip.endTime} min={trip.startTime || undefined} onChange={setT('endTime')} required/>
              </div>
            </div>
            {len && <div className="trip-summary"><Icon name="check" size={16}/>{fmtRange(trip.startTime, trip.endTime)} · {len}</div>}
          </div>

          <div className="form-section">
            <div className="section-title"><Icon name="users" size={17}/>Who's driving</div>
            <div className="grid-2">
              <div className="field span-2">
                <label htmlFor="name">Your name<span className="req">*</span></label>
                <input id="name" value={who.bookerName} onChange={setW('bookerName')} autoComplete="name" required/>
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" type="tel" inputMode="tel" value={who.bookerPhone} onChange={setW('bookerPhone')} autoComplete="tel" placeholder="012-345 6789"/>
              </div>
              <div className="field">
                <label htmlFor="dept">Department</label>
                <input id="dept" value={who.department} onChange={setW('department')} placeholder="e.g. Sales"/>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title"><Icon name="pin" size={17}/>Trip</div>
            <div className="field">
              <label htmlFor="dest">Destination<span className="req">*</span></label>
              <input id="dest" value={trip.destination} onChange={setT('destination')} placeholder="e.g. Client office, Shah Alam" required/>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <span className="label">People in the car, including you</span>
              <div className="stepper">
                <button type="button" onClick={() => setCount(trip.passengers - 1)} aria-label="Fewer">−</button>
                <span>{trip.passengers}</span>
                <button type="button" onClick={() => setCount(trip.passengers + 1)} aria-label="More">+</button>
              </div>
            </div>
            {trip.passengers > 1 && (
              <div className="passenger-list">
                {trip.passengerList.slice(1).map((n, i) => (
                  <div className="field" key={i}>
                    <label htmlFor={`p${i}`}>Passenger {i + 1}</label>
                    <input id={`p${i}`} value={n} placeholder="Name (optional)"
                      onChange={(e) => setTrip(t => { const l = [...t.passengerList]; l[i + 1] = e.target.value; return { ...t, passengerList: l }; })}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="section-title"><Icon name="card" size={17}/>Cards</div>
            <div className="extras">
              <label className={`toggle-card ${trip.needTngCard ? 'on' : ''} ${tngOut ? 'disabled' : ''}`}>
                <input type="checkbox" checked={trip.needTngCard} disabled={tngOut} onChange={setT('needTngCard')}/>
                <span>
                  <span className="t">Touch 'n Go card</span>
                  {cardStatus && <span className="s" style={{ display: 'block' }}>{freeNow(cardStatus.availableTng, cardStatus.totalTng)}</span>}
                </span>
              </label>
              <label className={`toggle-card ${trip.needFuelCard ? 'on' : ''} ${fuelOut ? 'disabled' : ''}`}>
                <input type="checkbox" checked={trip.needFuelCard} disabled={fuelOut} onChange={setT('needFuelCard')}/>
                <span>
                  <span className="t">Fuel card</span>
                  {cardStatus && <span className="s" style={{ display: 'block' }}>{freeNow(cardStatus.availableFuel, cardStatus.totalFuel)}</span>}
                </span>
              </label>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" rows="2" value={trip.notes} onChange={setT('notes')} placeholder="Anything the admin should know"/>
            </div>
          </div>

          {err && <div className="alert" style={{ marginTop: 18 }}>{err}</div>}
          <div className="submit-bar">
            <button type="submit" className="btn btn-lg" disabled={saving}>{saving ? 'Booking…' : 'Confirm booking'}</button>
          </div>
        </form>

        <aside className="book-side">
          <div className="card">
            <div className="section-title"><Icon name="calendar" size={17}/>Availability</div>
            <MiniCalendar busy={busy} onRangeSelect={onRange}
              selectedStart={trip.startTime ? new Date(trip.startTime) : null}
              selectedEnd={trip.endTime ? new Date(trip.endTime) : null}/>
          </div>
          {upcoming.length > 0 && (
            <div className="card">
              <div className="section-title">Already booked</div>
              <ul className="busy-list">
                {upcoming.map(b => <li key={b.id}><span className="num">{fmtRange(b.startTime, b.endTime)}</span></li>)}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export default function PublicHome() {
  const { vehicleId } = useParams();
  const nav = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardStatus, setCardStatus] = useState(null);
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles(r.data)).catch(() => setVehicles([])).finally(() => setLoading(false));
    api.get('/settings/cards').then(r => setCardStatus(r.data)).catch(() => {});
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
  else body = <BookingForm vehicle={vehicle} cardStatus={cardStatus} onBooked={setBooked}/>;

  return <PublicShell narrow={!!booked}>{body}</PublicShell>;
}
