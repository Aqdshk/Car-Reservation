import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function NewBooking() {
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({
    vehicleId: '', destination: '',
    startTime: '', endTime: '',
    passengers: 1, distanceKm: 0, notes: ''
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api.get('/vehicles').then(r => {
      setVehicles(r.data);
      if (r.data[0]) setForm(f => ({...f, vehicleId: r.data[0].id}));
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await api.post('/reservations', { ...form, vehicleId: Number(form.vehicleId) });
      nav('/mine');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to submit');
    } finally { setLoading(false); }
  };

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  return (
    <>
      <div className="page-head">
        <div className="breadcrumb">workspace <span className="accent">/</span> new booking</div>
        <h1 className="page-title">New Reservation</h1>
        <p className="page-sub">Submit a request to book a company vehicle</p>
      </div>

      <form className="card" onSubmit={submit}>
        {err && <div className="error">{err}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label>VEHICLE</label>
            <select value={form.vehicleId} onChange={set('vehicleId')} required>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} — {v.plateNumber}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>DESTINATION</label>
            <input type="text" value={form.destination} onChange={set('destination')} placeholder="e.g. KL Sentral" required/>
          </div>
          <div className="form-group">
            <label>START</label>
            <input type="datetime-local" value={form.startTime} onChange={set('startTime')} required/>
          </div>
          <div className="form-group">
            <label>END</label>
            <input type="datetime-local" value={form.endTime} onChange={set('endTime')} required/>
          </div>
          <div className="form-group">
            <label>PASSENGERS</label>
            <input type="number" min="1" value={form.passengers} onChange={set('passengers')} required/>
          </div>
          <div className="form-group">
            <label>DISTANCE (KM)</label>
            <input type="number" min="0" value={form.distanceKm} onChange={set('distanceKm')}/>
          </div>
        </div>
        <div className="form-group" style={{marginTop:18}}>
          <label>NOTES</label>
          <textarea rows="3" value={form.notes} onChange={set('notes')} placeholder="Additional information..."/>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => nav('/')}>Cancel</button>
          <button type="submit" className="btn" disabled={loading}>{loading ? 'Submitting…' : 'Submit Request →'}</button>
        </div>
      </form>
    </>
  );
}
