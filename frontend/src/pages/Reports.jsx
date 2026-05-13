import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtDate = (s) => new Date(s).toLocaleDateString('en-GB');
const fmtDT = (s) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
const hoursBetween = (s, e) => Math.max(0, (new Date(e) - new Date(s)) / 36e5);

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
      const totalKm = approved.reduce((sum, b) => sum + (b.distanceKm || 0), 0);
      return {
        vehicle: v,
        total: list.length,
        approved: approved.length,
        pending: list.filter(b => b.status === 'Pending').length,
        rejected: list.filter(b => b.status === 'Rejected').length,
        hours: Math.round(totalHours * 10) / 10,
        km: totalKm,
      };
    });
  }, [filtered, vehicles]);

  const totals = useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter(b => b.status === 'Approved').length,
    pending: filtered.filter(b => b.status === 'Pending').length,
    rejected: filtered.filter(b => b.status === 'Rejected').length,
  }), [filtered]);

  const downloadPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('C-Zero Cars — Usage Report', 14, 18);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Period: ${fmtDate(from)} to ${fmtDate(to)}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 31);

    // Summary
    doc.setFontSize(12); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [['Total Bookings', 'Approved', 'Pending', 'Rejected']],
      body: [[totals.total, totals.approved, totals.pending, totals.rejected]],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 50], textColor: 255 },
      styles: { fontSize: 10 },
    });

    // Per vehicle
    doc.setFont('helvetica', 'bold');
    doc.text('Per-Vehicle Usage', 14, doc.lastAutoTable.finalY + 12);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Plate', 'Vehicle', 'Total', 'Approved', 'Pending', 'Rejected', 'Hours Used', 'KM']],
      body: perVehicle.map(p => [
        p.vehicle.plateNumber,
        `${p.vehicle.make} ${p.vehicle.model}`,
        p.total, p.approved, p.pending, p.rejected,
        p.hours, p.km
      ]),
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 50], textColor: 255 },
      styles: { fontSize: 9 },
    });

    // All bookings detail
    if (filtered.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Booking Details', 14, doc.lastAutoTable.finalY + 12);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 16,
        head: [['ID', 'Booker', 'Dept', 'Vehicle', 'Period', 'Destination', 'Status']],
        body: filtered.map(b => [
          `#R${String(b.id).padStart(3,'0')}`,
          b.bookerName,
          b.department || '-',
          `${b.vehicleName}\n${b.vehiclePlate}`,
          `${fmtDT(b.startTime)}\nto ${fmtDT(b.endTime)}`,
          b.destination,
          b.status,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 50], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 4: { cellWidth: 45 } },
      });
    }

    // Footer
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
        <div className="stat-card"><div className="label">Approved</div><div className="value">{String(totals.approved).padStart(2,'0')}</div><div className="delta">completed</div></div>
        <div className="stat-card"><div className="label">Pending</div><div className="value">{String(totals.pending).padStart(2,'0')}</div><div className="delta">awaiting</div></div>
        <div className="stat-card"><div className="label">Rejected</div><div className="value">{String(totals.rejected).padStart(2,'0')}</div><div className="delta red">declined</div></div>
      </div>

      <div className="card">
        <h3 style={{marginBottom:16}}>Per-Vehicle Usage</h3>
        <table>
          <thead>
            <tr>
              <th>Plate</th><th>Vehicle</th>
              <th>Total</th><th>Approved</th><th>Pending</th><th>Rejected</th>
              <th>Hours Used</th><th>Distance (km)</th>
            </tr>
          </thead>
          <tbody>
            {perVehicle.map(p => (
              <tr key={p.vehicle.id}>
                <td><span className="mono">{p.vehicle.plateNumber}</span></td>
                <td>{p.vehicle.make} {p.vehicle.model}</td>
                <td>{p.total}</td>
                <td style={{color:'var(--accent)'}}>{p.approved}</td>
                <td style={{color:'var(--orange)'}}>{p.pending}</td>
                <td style={{color:'var(--red)'}}>{p.rejected}</td>
                <td className="mono">{p.hours} h</td>
                <td className="mono">{p.km} km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
