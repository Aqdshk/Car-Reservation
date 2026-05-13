import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtDate = (s) => new Date(s).toLocaleDateString('en-GB');
const fmtDT = (s) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
const hoursBetween = (s, e) => Math.max(0, (new Date(e) - new Date(s)) / 36e5);
const actualKm = (b) => (b.endMileage != null && b.startMileage != null) ? (b.endMileage - b.startMileage) : 0;

export default function Reports() {
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));

  useEffect(() => {
    api.get('/reservations').then(r => setBookings(r.data));
    api.get('/vehicles').then(r => setVehicles(r.data));
  }, []);

  const filtered = useMemo(() => {
    const f = new Date(from), t = new Date(to); t.setHours(23,59,59);
    return bookings.filter(b => {
      const s = new Date(b.startTime);
      return s >= f && s <= t;
    });
  }, [bookings, from, to]);

  const perVehicle = useMemo(() => {
    return vehicles.map(v => {
      const list = filtered.filter(b => b.vehicleId === v.id);
      const approved = list.filter(b => b.status === 'Approved');
      const totalHours = approved.reduce((sum, b) => sum + hoursBetween(b.startTime, b.endTime), 0);
      const actualMileage = approved.reduce((sum, b) => sum + actualKm(b), 0);
      const completed = approved.filter(b => b.checkedOutAt).length;
      return {
        vehicle: v,
        total: list.length,
        approved: approved.length,
        pending: list.filter(b => b.status === 'Pending').length,
        rejected: list.filter(b => b.status === 'Rejected').length,
        completed,
        hours: Math.round(totalHours * 10) / 10,
        km: actualMileage,
      };
    });
  }, [filtered, vehicles]);

  const totals = useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter(b => b.status === 'Approved').length,
    pending: filtered.filter(b => b.status === 'Pending').length,
    rejected: filtered.filter(b => b.status === 'Rejected').length,
    completed: filtered.filter(b => b.checkedOutAt).length,
    totalKm: filtered.reduce((sum, b) => sum + actualKm(b), 0),
  }), [filtered]);

  const downloadPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('C-Zero Cars — Usage Report', 14, 18);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Period: ${fmtDate(from)} to ${fmtDate(to)}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 31);

    doc.setFontSize(12); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [['Total', 'Approved', 'Completed', 'Pending', 'Rejected', 'Total Distance (km)']],
      body: [[totals.total, totals.approved, totals.completed, totals.pending, totals.rejected, totals.totalKm.toLocaleString()]],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 50], textColor: 255 },
      styles: { fontSize: 10 },
    });

    doc.setFont('helvetica', 'bold');
    doc.text('Per-Vehicle Usage', 14, doc.lastAutoTable.finalY + 12);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Plate', 'Vehicle', 'Total', 'Approved', 'Completed', 'Hours', 'Distance (km)']],
      body: perVehicle.map(p => [
        p.vehicle.plateNumber,
        `${p.vehicle.make} ${p.vehicle.model}`,
        p.total, p.approved, p.completed,
        p.hours, p.km.toLocaleString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 50], textColor: 255 },
      styles: { fontSize: 9 },
    });

    if (filtered.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Booking Details', 14, doc.lastAutoTable.finalY + 12);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 16,
        head: [['ID', 'Code', 'Booker', 'Vehicle', 'Period', 'Start km', 'End km', 'Distance', 'Status']],
        body: filtered.map(b => [
          `#R${String(b.id).padStart(3,'0')}`,
          b.trackingCode,
          `${b.bookerName}${b.department ? `\n${b.department}` : ''}`,
          `${b.vehicleName}\n${b.vehiclePlate}`,
          `${fmtDT(b.startTime)}\n→ ${fmtDT(b.endTime)}`,
          b.startMileage != null ? b.startMileage.toLocaleString() : '-',
          b.endMileage != null ? b.endMileage.toLocaleString() : '-',
          actualKm(b) > 0 ? `${actualKm(b).toLocaleString()} km` : '-',
          b.status,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 50], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 4: { cellWidth: 38 } },
      });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
      doc.text('c-zero booking system', 14, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`car-usage-report_${from}_to_${to}.pdf`);
  };

  return (
    <>
      <div className="page-head">
        <div className="breadcrumb">admin <span className="accent">/</span> reports</div>
        <h1 className="page-title">Usage Reports</h1>
        <p className="page-sub">Vehicle utilization &amp; booking statistics</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Report Period</h3>
          <button className="btn" onClick={downloadPdf}>↓ Download PDF</button>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>FROM</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}/>
          </div>
          <div className="form-group">
            <label>TO</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}/>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card"><div className="label">Total Bookings</div><div className="value">{String(totals.total).padStart(2,'0')}</div><div className="delta">in period</div></div>
        <div className="stat-card"><div className="label">Approved</div><div className="value">{String(totals.approved).padStart(2,'0')}</div><div className="delta">{totals.completed} completed</div></div>
        <div className="stat-card"><div className="label">Pending</div><div className="value">{String(totals.pending).padStart(2,'0')}</div><div className="delta">awaiting</div></div>
        <div className="stat-card"><div className="label">Total Distance</div><div className="value">{totals.totalKm.toLocaleString()}</div><div className="delta">km traveled</div></div>
      </div>

      <div className="card">
        <h3 style={{marginBottom:16}}>Per-Vehicle Usage</h3>
        <table>
          <thead>
            <tr>
              <th>Plate</th><th>Vehicle</th>
              <th>Total</th><th>Approved</th><th>Completed</th>
              <th>Hours</th><th>Distance (km)</th>
            </tr>
          </thead>
          <tbody>
            {perVehicle.map(p => (
              <tr key={p.vehicle.id}>
                <td><span className="mono">{p.vehicle.plateNumber}</span></td>
                <td>{p.vehicle.make} {p.vehicle.model}</td>
                <td>{p.total}</td>
                <td style={{color:'var(--accent)'}}>{p.approved}</td>
                <td style={{color:'var(--accent)'}}>{p.completed}</td>
                <td className="mono">{p.hours} h</td>
                <td className="mono" style={{color:'var(--accent)',fontWeight:700}}>{p.km.toLocaleString()} km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
