import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import { Icon, Plate, bookingRef, fmtDTY, tripState } from '../lib/ui';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDate = (s) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const hours = (b) => Math.max(0, (new Date(b.endTime) - new Date(b.startTime)) / 36e5);
const km = (b) => (b.endMileage != null && b.startMileage != null) ? b.endMileage - b.startMileage : 0;
const STATE = { booked: 'Booked', inuse: 'In use', done: 'Returned' };

const PRESETS = {
  'This month': () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)]; },
  'Last month': () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)]; },
  'This year': () => { const n = new Date(); return [new Date(n.getFullYear(), 0, 1), new Date(n.getFullYear(), 11, 31)]; },
};

export default function Reports() {
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [[from, to], setRange] = useState(() => PRESETS['This month']().map(iso));

  useEffect(() => {
    api.get('/reservations', { params: { pageSize: 500 } }).then(r => setBookings(r.data.items || []));
    api.get('/vehicles').then(r => setVehicles(r.data));
  }, []);

  const inRange = useMemo(() => {
    const f = new Date(from), t = new Date(to); f.setHours(0, 0, 0, 0); t.setHours(23, 59, 59, 999);
    return bookings.filter(b => { const s = new Date(b.startTime); return s >= f && s <= t; });
  }, [bookings, from, to]);

  const perVehicle = useMemo(() => vehicles.map(v => {
    const list = inRange.filter(b => b.vehicleId === v.id);
    return {
      v, total: list.length,
      returned: list.filter(b => b.checkedOutAt).length,
      hours: Math.round(list.reduce((s, b) => s + hours(b), 0) * 10) / 10,
      km: list.reduce((s, b) => s + km(b), 0),
    };
  }).sort((a, b) => b.km - a.km || b.total - a.total), [inRange, vehicles]);

  const totals = useMemo(() => ({
    total: inRange.length,
    returned: inRange.filter(b => b.checkedOutAt).length,
    hours: Math.round(inRange.reduce((s, b) => s + hours(b), 0)),
    km: inRange.reduce((s, b) => s + km(b), 0),
  }), [inRange]);

  const pdf = () => {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    const head = { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' };

    doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    doc.text('C-Zero Cars: vehicle usage', 14, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`${fmtDate(from)} to ${fmtDate(to)}`, 14, 25);
    doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, 14, 30);

    autoTable(doc, {
      startY: 38, theme: 'grid', headStyles: head, styles: { fontSize: 10 },
      head: [['Bookings', 'Returned', 'Hours booked', 'Distance (km)']],
      body: [[totals.total, totals.returned, totals.hours, totals.km.toLocaleString()]],
    });

    doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('By vehicle', 14, doc.lastAutoTable.finalY + 11);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 14, theme: 'grid', headStyles: head, styles: { fontSize: 9 },
      head: [['Plate', 'Vehicle', 'Bookings', 'Returned', 'Hours', 'Distance (km)']],
      body: perVehicle.map(p => [p.v.plateNumber, `${p.v.make} ${p.v.model}`, p.total, p.returned, p.hours, p.km.toLocaleString()]),
    });

    if (inRange.length) {
      doc.setFont('helvetica', 'bold');
      doc.text('Bookings', 14, doc.lastAutoTable.finalY + 11);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 14, theme: 'striped', headStyles: head,
        styles: { fontSize: 8, cellPadding: 2 }, columnStyles: { 4: { cellWidth: 38 } },
        head: [['Ref', 'Code', 'Driver', 'Vehicle', 'When', 'Start km', 'End km', 'Distance', 'Status']],
        body: inRange.map(b => [
          bookingRef(b.id), b.trackingCode,
          `${b.bookerName}${b.department ? `\n${b.department}` : ''}`,
          `${b.vehicleName}\n${b.vehiclePlate}`,
          `${fmtDTY(b.startTime)}\nto ${fmtDTY(b.endTime)}`,
          b.startMileage?.toLocaleString() ?? '-', b.endMileage?.toLocaleString() ?? '-',
          km(b) > 0 ? `${km(b).toLocaleString()} km` : '-', STATE[tripState(b)],
        ]),
      });
    }

    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150);
      doc.text('C-Zero Cars', 14, H - 8);
      doc.text(`Page ${i} of ${pages}`, W - 14, H - 8, { align: 'right' });
    }
    doc.save(`vehicle-usage_${from}_to_${to}.pdf`);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p>How much each vehicle is used, by bookings started in the period.</p>
        </div>
        <button className="btn" onClick={pdf}><Icon name="download" size={16}/>Download PDF</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <div className="seg">
            {Object.entries(PRESETS).map(([label, fn]) => {
              const [a, b] = fn().map(iso);
              return <button key={label} className={a === from && b === to ? 'on' : ''} onClick={() => setRange([a, b])}>{label}</button>;
            })}
          </div>
          <div className="toolbar">
            <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <label htmlFor="from" style={{ fontWeight: 500 }}>From</label>
              <input id="from" type="date" value={from} max={to} onChange={(e) => setRange([e.target.value, to])} style={{ height: 38, width: 'auto' }}/>
            </div>
            <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <label htmlFor="to" style={{ fontWeight: 500 }}>To</label>
              <input id="to" type="date" value={to} min={from} onChange={(e) => setRange([from, e.target.value])} style={{ height: 38, width: 'auto' }}/>
            </div>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="k"><Icon name="list" size={16}/>Bookings</div><div className="v">{totals.total}</div><div className="s">in the period</div></div>
        <div className="stat"><div className="k"><Icon name="check" size={16}/>Returned</div><div className="v">{totals.returned}</div><div className="s">trips completed</div></div>
        <div className="stat"><div className="k"><Icon name="clock" size={16}/>Hours booked</div><div className="v">{totals.hours.toLocaleString()}</div><div className="s">across the fleet</div></div>
        <div className="stat"><div className="k"><Icon name="gauge" size={16}/>Distance</div><div className="v">{totals.km.toLocaleString()}</div><div className="s">km driven</div></div>
      </div>

      <div className="card card-flush">
        <div className="card-head"><div className="card-title">By vehicle</div></div>
        {perVehicle.length === 0 ? <div className="empty">No vehicles.</div> : (
          <table className="tbl tbl-stack">
            <thead><tr><th>Vehicle</th><th className="right">Bookings</th><th className="right">Returned</th><th className="right">Hours</th><th className="right">Distance</th></tr></thead>
            <tbody>
              {perVehicle.map(p => (
                <tr key={p.v.id}>
                  <td className="lead"><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Plate>{p.v.plateNumber}</Plate><span>{p.v.make} {p.v.model}</span></div></td>
                  <td data-label="Bookings" className="right num">{p.total}</td>
                  <td data-label="Returned" className="right num">{p.returned}</td>
                  <td data-label="Hours" className="right num">{p.hours}</td>
                  <td data-label="Distance" className="right num"><b>{p.km.toLocaleString()} km</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
