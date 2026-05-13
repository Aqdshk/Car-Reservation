import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dayHeaders = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const sameDay = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

export default function CalendarPage() {
  const [bookings, setBookings] = useState([]);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    api.get('/reservations/calendar').then(r => setBookings(r.data));
  }, []);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    // Monday-start: weekday 0=Mon..6=Sun
    const firstWeekday = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((firstWeekday + last.getDate()) / 7) * 7;
    return Array.from({length: totalCells}, (_, i) => {
      const dayNum = i - firstWeekday + 1;
      const date = new Date(year, month, dayNum);
      const inMonth = date.getMonth() === month;
      return { date, inMonth, key: i };
    });
  }, [cursor]);

  const bookingsOnDay = (date) => {
    const ds = startOfDay(date);
    return bookings.filter(b => {
      const s = startOfDay(new Date(b.startTime));
      const e = startOfDay(new Date(b.endTime));
      return ds >= s && ds <= e;
    });
  };

  const prev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const next = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const today = () => { setCursor(new Date()); setSelectedDate(new Date()); };

  const selectedBookings = selectedDate ? bookingsOnDay(selectedDate) : [];

  return (
    <>
      <div className="page-head">
        <div className="breadcrumb">admin <span className="accent">/</span> calendar</div>
        <h1 className="page-title">Booking Calendar</h1>
        <p className="page-sub">Month view of all approved &amp; pending reservations</p>
      </div>

      <div className="card">
        <div className="cal-toolbar">
          <button className="btn btn-sm btn-ghost" onClick={prev}>← Prev</button>
          <h3 className="cal-title">{monthNames[cursor.getMonth()]} {cursor.getFullYear()}</h3>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-sm btn-ghost" onClick={today}>Today</button>
            <button className="btn btn-sm btn-ghost" onClick={next}>Next →</button>
          </div>
        </div>

        <div className="cal-grid cal-headers">
          {dayHeaders.map(d => <div key={d} className="cal-header-cell">{d}</div>)}
        </div>

        <div className="cal-grid">
          {cells.map(c => {
            const dayBookings = bookingsOnDay(c.date);
            const isToday = sameDay(c.date, new Date());
            const isSelected = selectedDate && sameDay(c.date, selectedDate);
            return (
              <div key={c.key}
                className={`cal-cell ${c.inMonth ? '' : 'out'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDate(c.date)}>
                <div className="cal-date">{c.date.getDate()}</div>
                <div className="cal-events">
                  {dayBookings.slice(0,3).map(b => (
                    <div key={b.id} className={`cal-event ev-${b.status.toLowerCase()}`} title={`${b.bookerName} · ${b.vehicleName}`}>
                      {b.vehiclePlate}
                    </div>
                  ))}
                  {dayBookings.length > 3 && <div className="cal-more">+{dayBookings.length-3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="card">
          <h3 style={{marginBottom:14}}>
            {selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
          </h3>
          {selectedBookings.length === 0 ? (
            <p style={{color:'var(--muted)',fontSize:14}}>No bookings on this day.</p>
          ) : (
            <table>
              <thead><tr><th>Vehicle</th><th>Booker</th><th>Period</th><th>Destination</th><th>Status</th></tr></thead>
              <tbody>
                {selectedBookings.map(b => (
                  <tr key={b.id}>
                    <td>{b.vehicleName} · <span className="mono">{b.vehiclePlate}</span></td>
                    <td>{b.bookerName}{b.department && <span className="mono" style={{fontSize:11}}> · {b.department}</span>}</td>
                    <td className="mono" style={{fontSize:12}}>
                      {new Date(b.startTime).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                      <br/>→ {new Date(b.endTime).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </td>
                    <td>{b.destination}</td>
                    <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
