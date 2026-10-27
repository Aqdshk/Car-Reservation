import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';

const emojiFor = (type) => ({ Sedan:'🚗', SUV:'🚙', Pickup:'🛻', Van:'🚐', Motorcycle:'🏍️', Lorry:'🚛', Truck:'🚚', Bus:'🚌' }[type] || '🚗');

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plateNumber:'', make:'', model:'', type:'Sedan', fuel:'Petrol', seats:5 });
  const [editId, setEditId] = useState(null);
  const [qrVehicle, setQrVehicle] = useState(null);
  const qrRef = useRef(null);

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

  const qrUrl = (v) => `${location.origin}/book/${v.id}`;

  const printQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const win = window.open('', '_blank', 'width=600,height=800');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>QR · ${qrVehicle.plateNumber}</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#111}
        .plate{font-family:'Courier New',monospace;font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;padding:8px 20px;background:#fde047;display:inline-block;border-radius:8px;border:2px solid #000}
        h2{margin:8px 0 4px;font-size:28px}
        .meta{color:#555;margin-bottom:24px;font-size:14px}
        .qr-wrap{display:inline-block;padding:20px;background:#fff;border:3px solid #000;border-radius:16px}
        .url{font-family:'Courier New',monospace;font-size:12px;color:#555;margin-top:16px;word-break:break-all}
        .footer{margin-top:40px;font-size:12px;color:#999}
        @media print{body{padding:0}}
      </style></head><body>
      <div class="plate">${qrVehicle.plateNumber}</div>
      <h2>${qrVehicle.make} ${qrVehicle.model}</h2>
      <div class="meta">${qrVehicle.type} · ${qrVehicle.seats} seats · ${qrVehicle.fuel}</div>
      <div class="qr-wrap">${svgData}</div>
      <div class="url">${qrUrl(qrVehicle)}</div>
      <div class="footer">Scan to book this vehicle · c-zero cars</div>
      <script>setTimeout(()=>window.print(),300);</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:28,flexWrap:'wrap',gap:12}}>
        <div>
          <div className="breadcrumb">admin <span className="accent">/</span> fleet</div>
          <h1 className="page-title">Fleet Management</h1>
          <p className="page-sub">Manage vehicles and print QR tags</p>
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
                <option>Sedan</option><option>SUV</option><option>Pickup</option><option>Van</option>
                <option>Motorcycle</option><option>Lorry</option><option>Truck</option><option>Bus</option>
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
              <button className="btn btn-sm" onClick={() => setQrVehicle(v)}>⊞ QR</button>
              <button className="btn btn-sm btn-ghost" onClick={() => edit(v)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => del(v.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {qrVehicle && (
        <div className="modal-backdrop" onClick={() => setQrVehicle(null)}>
          <div className="modal-content" style={{maxWidth:460}} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="breadcrumb">qr code <span className="accent">/</span> {qrVehicle.plateNumber}</div>
                <h2 style={{fontSize:22,marginTop:4}}>{qrVehicle.make} {qrVehicle.model}</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setQrVehicle(null)}>✕</button>
            </div>
            <div ref={qrRef} className="qr-wrap-modal">
              <QRCodeSVG value={qrUrl(qrVehicle)} size={240} level="M" includeMargin={false}/>
            </div>
            <p className="qr-url mono">{qrUrl(qrVehicle)}</p>
            <p style={{fontSize:12,color:'var(--muted)',marginTop:8,textAlign:'center'}}>
              Scan to open booking form for this vehicle
            </p>
            <div className="form-actions" style={{justifyContent:'center',marginTop:20}}>
              <button className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(qrUrl(qrVehicle))}>Copy URL</button>
              <button className="btn" onClick={printQr}>⎙ Print QR</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
