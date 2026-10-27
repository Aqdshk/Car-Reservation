import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';
import Modal from '../components/Modal';
import { Icon, Plate, StatusPill, VehicleIcon } from '../lib/ui';

const TYPES = ['Sedan', 'Hatchback', 'SUV', 'Pickup', 'Van', 'Motorcycle', 'Lorry', 'Truck', 'Bus'];
const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'EV'];
const BLANK = { plateNumber: '', make: '', model: '', type: 'Sedan', fuel: 'Petrol', seats: 5 };

const bookUrl = (v) => `${location.origin}/book/${v.id}`;
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// One key tag: plate, QR, model. Sized to cut out and hang on the key ring.
function tagHtml(v, svg) {
  return `<div class="tag">
    <div class="plate">${esc(v.plateNumber)}</div>
    <div class="qr">${svg}</div>
    <div class="scan">Scan to book</div>
    <div class="model">${esc(v.make)} ${esc(v.model)}</div>
  </div>`;
}

function printTags(items) {
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) { alert('Allow pop-ups for this site to print QR tags.'); return; }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR key tags</title>
  <style>
    @page{margin:10mm}
    *{box-sizing:border-box}
    body{font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;margin:0;color:#0f172a}
    .sheet{display:flex;flex-wrap:wrap;gap:6mm}
    .tag{width:62mm;border:1.5px dashed #94a3b8;border-radius:4mm;padding:5mm 5mm 4mm;text-align:center;break-inside:avoid;page-break-inside:avoid}
    .plate{display:inline-block;background:#111;color:#fff;font:700 15pt/1.2 'JetBrains Mono','Courier New',monospace;letter-spacing:.1em;padding:1.5mm 4mm;border-radius:1.5mm}
    .qr{margin:4mm auto 2mm;width:46mm}
    .qr svg{width:100%;height:auto;display:block}
    .scan{font-weight:700;font-size:11pt;color:#0f766e}
    .model{font-size:9pt;color:#475569;margin-top:.5mm}
  </style></head><body><div class="sheet">${items.map(([v, svg]) => tagHtml(v, svg)).join('')}</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
  win.document.close();
}

function VehicleForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState(initial.v || BLANK);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF(x => ({ ...x, [k]: k === 'plateNumber' ? e.target.value.toUpperCase() : e.target.value }));
  const editing = !!initial.id;

  const save = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      const data = { ...f, seats: Number(f.seats), plateNumber: f.plateNumber.trim() };
      if (editing) await api.put(`/vehicles/${initial.id}`, data); else await api.post('/vehicles', data);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.title || 'Could not save the vehicle.');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={editing ? 'Edit vehicle' : 'Add vehicle'} subtitle={editing ? null : 'A QR tag is ready for it as soon as you save.'} onClose={onClose} size="modal-sm"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" form="vehicle-form" className="btn" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add vehicle'}</button>
      </>}>
      <form id="vehicle-form" onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {err && <div className="alert">{err}</div>}
        <div className="field"><label htmlFor="plate">Plate number<span className="req">*</span></label>
          <input id="plate" className="mono" value={f.plateNumber} onChange={set('plateNumber')} placeholder="VKL 1234" required autoFocus style={{ letterSpacing: '.08em', fontWeight: 700 }}/></div>
        <div className="grid-2">
          <div className="field"><label htmlFor="make">Make<span className="req">*</span></label><input id="make" value={f.make} onChange={set('make')} placeholder="Perodua" required/></div>
          <div className="field"><label htmlFor="model">Model<span className="req">*</span></label><input id="model" value={f.model} onChange={set('model')} placeholder="Bezza" required/></div>
        </div>
        <div className="grid-3">
          <div className="field"><label htmlFor="type">Type</label><select id="type" value={f.type} onChange={set('type')}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label htmlFor="fuel">Fuel</label><select id="fuel" value={f.fuel} onChange={set('fuel')}>{FUELS.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label htmlFor="seats">Seats</label><input id="seats" type="number" min="1" max="60" value={f.seats} onChange={set('seats')}/></div>
        </div>
      </form>
    </Modal>
  );
}

function QrModal({ v, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(bookUrl(v)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } };
  const print = () => { const svg = ref.current?.querySelector('svg'); if (svg) printTags([[v, new XMLSerializer().serializeToString(svg)]]); };
  return (
    <Modal title={`${v.make} ${v.model}`} subtitle="Stick this on the key. Scanning it opens the booking form for this car." onClose={onClose} size="modal-sm"
      footer={<>
        <button className="btn btn-ghost" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={15}/>{copied ? 'Copied' : 'Copy link'}</button>
        <button className="btn" onClick={print}><Icon name="printer" size={15}/>Print tag</button>
      </>}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}><Plate size="lg">{v.plateNumber}</Plate></div>
      <div className="qr-box" ref={ref}><QRCodeSVG value={bookUrl(v)} size={220} level="M" marginSize={0}/></div>
      <div className="qr-url">{bookUrl(v)}</div>
    </Modal>
  );
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);   // { id?, v? }
  const [qr, setQr] = useState(null);
  const [err, setErr] = useState('');
  const allQrRef = useRef(null);

  const load = () => api.get('/vehicles').then(r => setVehicles(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const del = async (v) => {
    if (!confirm(`Remove ${v.plateNumber} (${v.make} ${v.model}) from the fleet? Its QR tag will stop working.`)) return;
    setErr('');
    try { await api.delete(`/vehicles/${v.id}`); load(); }
    catch (e) { setErr(e.response?.data?.message || `Could not remove ${v.plateNumber}. It may still have bookings.`); }
  };

  const printAll = () => {
    const svgs = [...(allQrRef.current?.querySelectorAll('svg') || [])];
    printTags(vehicles.map((v, i) => [v, new XMLSerializer().serializeToString(svgs[i])]));
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vehicles</h1>
          <p>Every vehicle gets its own QR tag for the key. No setup needed.</p>
        </div>
        <div className="toolbar">
          {vehicles.length > 0 && <button className="btn btn-ghost" onClick={printAll}><Icon name="printer" size={16}/>Print all QR tags</button>}
          <button className="btn" onClick={() => setForm({})}><Icon name="plus" size={16}/>Add vehicle</button>
        </div>
      </div>

      {err && <div className="alert" style={{ marginBottom: 14 }}>{err}</div>}

      {loading ? <div className="card empty">Loading…</div>
        : vehicles.length === 0 ? (
          <div className="card empty">
            <p style={{ marginBottom: 14 }}>No vehicles yet. Add the first one to get its QR tag.</p>
            <button className="btn" onClick={() => setForm({})}><Icon name="plus" size={16}/>Add vehicle</button>
          </div>
        ) : (
          <div className="vehicle-grid">
            {vehicles.map(v => (
              <div className="vcard" key={v.id}>
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
                  <div className="vcard-actions">
                    <button className="btn btn-sm" onClick={() => setQr(v)}><Icon name="qr" size={15}/>QR</button>
                    <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setForm({ id: v.id, v: { plateNumber: v.plateNumber, make: v.make, model: v.model, type: v.type, fuel: v.fuel, seats: v.seats } })} aria-label={`Edit ${v.plateNumber}`}><Icon name="pencil" size={15}/></button>
                    <button className="icon-btn" style={{ width: 32, height: 32, color: 'var(--red)' }} onClick={() => del(v)} aria-label={`Remove ${v.plateNumber}`}><Icon name="trash" size={15}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Off-screen QR codes, serialised for "Print all". */}
      <div ref={allQrRef} aria-hidden="true" style={{ position: 'absolute', left: -9999, top: 0 }}>
        {vehicles.map(v => <QRCodeSVG key={v.id} value={bookUrl(v)} size={200} level="M" marginSize={0}/>)}
      </div>

      {form && <VehicleForm initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }}/>}
      {qr && <QrModal v={qr} onClose={() => setQr(null)}/>}
    </>
  );
}
