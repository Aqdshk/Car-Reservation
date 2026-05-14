import { useEffect, useState } from 'react';
import api from '../api';

const emojiFor = (type) => ({ Sedan:'🚗', SUV:'🚙', Pickup:'🛻', Van:'🚐', Motorcycle:'🏍️', Lorry:'🚛', Truck:'🚚', Bus:'🚌' }[type] || '🚗');

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plateNumber:'', make:'', model:'', type:'Sedan', fuel:'Petrol', seats:5 });
  const [editId, setEditId] = useState(null);

  const load = () => api.get('/vehicles').then(r => setVehicles(r.data));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  const save = async (e) => {
    e.preventDefault();
    const data = { ...form, seats: Number(form.seats) };
    if (editId) await api.put(`/vehicles/${editId}`, data);
    else await api.post('/vehicles', data);
    setShowForm(false); setEditId(null);
    setForm({ plateNumber:'', make:'', model:'', type:'Sedan', fuel:'Petrol', seats:5 });
    load();
  };

  const edit = (v) => {
    setForm({ plateNumber:v.plateNumber, make:v.make, model:v.model, type:v.type, fuel:v.fuel, seats:v.seats });
    setEditId(v.id); setShowForm(true);
  };

  const del = async (id) => {
    if (!confirm('Delete this vehicle?')) return;
    await api.delete(`/vehicles/${id}`);
    load();
  };

  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:28,flexWrap:'wrap',gap:12}}>
        <div>
          <div className="breadcrumb">admin <span className="accent">/</span> fleet</div>
          <h1 className="page-title">Fleet Management</h1>
          <p className="page-sub">Manage company vehicles</p>
        </div>
        <button className="btn" onClick={() => { setShowForm(true); setEditId(null); }}>+ Add Vehicle</button>
      </div>

      {showForm && (
        <form className="card" onSubmit={save}>
          <h3 style={{marginBottom:18}}>{editId ? 'Edit Vehicle' : 'New Vehicle'}</h3>
          <div className="form-grid">
            <div className="form-group"><label>PLATE NUMBER</label><input value={form.plateNumber} onChange={set('plateNumber')} required/></div>
            <div className="form-group"><label>MAKE</label><input value={form.make} onChange={set('make')} required/></div>
            <div className="form-group"><label>MODEL</label><input value={form.model} onChange={set('model')} required/></div>
            <div className="form-group"><label>TYPE</label>
              <select value={form.type} onChange={set('type')}>
                <option>Sedan</option>
                <option>SUV</option>
                <option>Pickup</option>
                <option>Van</option>
                <option>Motorcycle</option>
                <option>Lorry</option>
                <option>Truck</option>
                <option>Bus</option>
              </select>
            </div>
            <div className="form-group"><label>FUEL</label>
              <select value={form.fuel} onChange={set('fuel')}>
                <option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>EV</option>
              </select>
            </div>
            <div className="form-group"><label>SEATS</label><input type="number" min="1" value={form.seats} onChange={set('seats')}/></div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            <button type="submit" className="btn">{editId ? 'Save Changes' : 'Add Vehicle'} →</button>
          </div>
        </form>
      )}

      <div className="vehicle-grid">
        {vehicles.map(v => (
          <div className="vehicle-card" key={v.id}>
            <div className="row">
              <div className="car-emoji">{emojiFor(v.type)}</div>
              <span className="plate">{v.plateNumber}</span>
            </div>
            <h4>{v.make} {v.model}</h4>
            <p className="meta">{v.type} · {v.seats} seats · {v.fuel}</p>
            <span className={`badge badge-${v.status.toLowerCase()}`}>{v.status}</span>
            <div className="actions">
              <button className="btn btn-sm btn-ghost" onClick={() => edit(v)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => del(v.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
