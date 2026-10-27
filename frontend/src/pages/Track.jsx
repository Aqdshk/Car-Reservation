import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import PublicShell from '../components/PublicShell';
import { Icon, Plate, StatusPill, fmtDTY, fmtRange, tripState } from '../lib/ui';

const photoUrl = (code, file) => `/api/reservations/track/${code}/photo/${file}`;

function Lookup({ initial = '', error }) {
  const nav = useNavigate();
  const [code, setCode] = useState(initial);
  return (
    <div className="card">
      <div className="hero" style={{ marginBottom: 16 }}>
        <h1>Track your booking</h1>
        <p>Enter the 8-character code you got when you booked.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) nav(`/track/${code.trim().toUpperCase()}`); }}
        style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="input mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          maxLength={8} placeholder="e.g. 3NB3CV44" autoCapitalize="characters" autoComplete="off" spellCheck="false"
          style={{ flex: '1 1 200px', letterSpacing: '.14em', fontWeight: 700 }} aria-label="Tracking code"/>
        <button className="btn btn-lg" disabled={code.length < 4}>Find booking</button>
      </form>
      {error && <div className="alert" style={{ marginTop: 14 }}>{error}</div>}
    </div>
  );
}

function PhotoField({ file, onChange, label }) {
  return (
    <label className={`photo-input ${file ? 'has' : ''}`}>
      <input type="file" accept="image/*" capture="environment" onChange={(e) => onChange(e.target.files[0] || null)} required/>
      <span className="ph-ico"><Icon name={file ? 'check' : 'camera'} size={20}/></span>
      <span style={{ minWidth: 0 }}>
        <span className="ph-t" style={{ display: 'block' }}>{file ? 'Photo added' : label}</span>
        <span className="ph-s" style={{ display: 'block' }}>{file ? file.name : 'Tap to take a photo of the odometer'}</span>
      </span>
    </label>
  );
}

function MileageStep({ code, kind, min, onDone }) {
  const [km, setKm] = useState('');
  const [photo, setPhoto] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const isIn = kind === 'checkin';

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!photo) { setErr('Add a photo of the odometer.'); return; }
    if (!isIn && Number(km) < min) { setErr(`The reading cannot be lower than at check-in (${min.toLocaleString()} km).`); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('mileage', km);
      fd.append('photo', photo);
      await api.post(`/reservations/track/${code}/${kind}`, fd);
      await onDone();
    } catch (e) {
      setErr(e.response?.data?.message || 'Upload failed. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field">
        <label htmlFor={`${kind}-km`}>{isIn ? 'Odometer now (km)' : 'Odometer on return (km)'}<span className="req">*</span></label>
        <input id={`${kind}-km`} type="number" inputMode="numeric" min={min || 0} value={km} onChange={(e) => setKm(e.target.value)}
          placeholder={isIn ? 'e.g. 45230' : `${min.toLocaleString()} or more`} required/>
      </div>
      <PhotoField file={photo} onChange={setPhoto} label="Add odometer photo"/>
      {err && <div className="alert">{err}</div>}
      <button className="btn btn-lg btn-block" disabled={saving}>{saving ? 'Uploading…' : isIn ? 'Check in' : 'Check out'}</button>
    </form>
  );
}

function Recorded({ label, km, at, photo, code }) {
  return (
    <div className="done-box">
      <div className="facts">
        <div className="fact"><div className="k">{label}</div><div className="big-num">{km?.toLocaleString()} km</div></div>
        <div className="fact"><div className="k">Recorded</div><div className="v">{fmtDTY(at)}</div></div>
      </div>
      {photo && <img src={photoUrl(code, photo)} alt={`${label} odometer`} className="proof-photo" loading="lazy"/>}
    </div>
  );
}

function Timeline({ state }) {
  const steps = [['booked', 'Booked'], ['inuse', 'Checked in'], ['done', 'Returned']];
  const at = steps.findIndex(s => s[0] === state);
  return (
    <div className="timeline">
      {steps.map(([k, label], i) => (
        <span key={k} style={{ display: 'contents' }}>
          {i > 0 && <span className={`tl-line ${i <= at ? 'done' : ''}`}/>}
          <span className={`tl-step ${i <= at ? 'done' : i === at + 1 ? 'now' : ''}`}>
            <span className="tl-dot">{i <= at ? <Icon name="check" size={14} strokeWidth={3}/> : i + 1}</span>
            <span className="tl-label">{label}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

export default function Track() {
  const { code } = useParams();
  const [b, setB] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(!!code);

  const load = async () => {
    try {
      const { data } = await api.get(`/reservations/track/${code}`);
      setB(data); setErr('');
    } catch (e) {
      setB(null);
      setErr(e.response?.status === 404 ? `No booking found for ${code}. Check the code and try again.` : 'Could not load the booking.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (code) { setLoading(true); load(); } else { setB(null); setErr(''); } }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!code || (!loading && !b)) return <PublicShell narrow><Lookup initial={code || ''} error={err}/></PublicShell>;
  if (loading) return <PublicShell narrow><div className="card empty">Loading booking…</div></PublicShell>;

  const state = tripState(b);
  const km = b.checkedOutAt ? b.endMileage - b.startMileage : null;

  return (
    <PublicShell narrow>
      <div className="card">
        <div className="card-head" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Booking <span className="code">{b.trackingCode}</span></div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', marginTop: 2 }}>{b.vehicleName}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              <Plate>{b.vehiclePlate}</Plate><StatusPill state={state}/>
            </div>
          </div>
        </div>
        <Timeline state={state}/>
        <div className="facts" style={{ marginTop: 20 }}>
          <div className="fact"><div className="k"><Icon name="clock" size={14}/>When</div><div className="v">{fmtRange(b.startTime, b.endTime)}</div></div>
          <div className="fact"><div className="k"><Icon name="pin" size={14}/>Destination</div><div className="v">{b.destination}</div></div>
          <div className="fact"><div className="k"><Icon name="users" size={14}/>Driver</div><div className="v">{b.bookerName}{b.passengers > 1 && <span className="muted"> + {b.passengers - 1}</span>}</div></div>
          <div className="fact"><div className="k"><Icon name="card" size={14}/>Cards taken</div><div className="v">
            {b.needTngCard || b.needFuelCard
              ? <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{b.needTngCard && <span className="tag">Touch 'n Go</span>}{b.needFuelCard && <span className="tag">Fuel</span>}</span>
              : <span className="muted">None</span>}
          </div></div>
          {b.passengerNames && <div className="fact span-2" style={{ gridColumn: '1/-1' }}><div className="k">Passengers</div><div className="v">{b.passengerNames}</div></div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head" style={{ marginBottom: 12 }}>
          <div className="card-title">1 · Check in</div>
          {b.checkedInAt && <span className="pill pill-booked">Done</span>}
        </div>
        {b.checkedInAt
          ? <Recorded label="Odometer at start" km={b.startMileage} at={b.checkedInAt} photo={b.startMileagePhoto} code={b.trackingCode}/>
          : <>
              <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>Before you drive off, record the odometer reading.</p>
              <MileageStep code={b.trackingCode} kind="checkin" min={0} onDone={load}/>
            </>}
      </div>

      {b.checkedInAt && (
        <div className="card">
          <div className="card-head" style={{ marginBottom: 12 }}>
            <div className="card-title">2 · Check out</div>
            {b.checkedOutAt && <span className="pill pill-booked">Done</span>}
          </div>
          {b.checkedOutAt
            ? <Recorded label="Odometer at return" km={b.endMileage} at={b.checkedOutAt} photo={b.endMileagePhoto} code={b.trackingCode}/>
            : <>
                <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>Back at the office? Record the final reading and return the key.</p>
                <MileageStep code={b.trackingCode} kind="checkout" min={b.startMileage || 0} onDone={load}/>
              </>}
        </div>
      )}

      {km != null && (
        <div className="card success" style={{ padding: 28 }}>
          <div className="success-mark"><Icon name="check" size={28} strokeWidth={2.5}/></div>
          <h1 style={{ fontSize: 22 }}>Trip complete</h1>
          <p>{km.toLocaleString()} km driven. Thanks for returning the car.</p>
        </div>
      )}
    </PublicShell>
  );
}
