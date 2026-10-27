import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { Icon, Plate, StatusPill, fmtRange, tripState } from '../lib/ui';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

export default function CalendarPage() {
  const [bookings, setBookings] = useState([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState(() => new Date());

  useEffect(() => { api.get('/reservations/calendar').then(r => setBookings(r.data)); }, []);

  const cells = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const total = Math.ceil((lead + new Date(y, m + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const date = new Date(y, m, i - lead + 1);
      return { date, inMonth: date.getMonth() === m, key: i };
    });
  }, [cursor]);

  const onDay = (date) => {
    const d = startOfDay(date);
    return bookings.filter(b => d >= startOfDay(b.startTime) && d <= startOfDay(b.endTime));
  };

  const move = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const goToday = () => { const d = new Date(); d.setDate(1); setCursor(d); setSelected(new Date()); };
  const dayList = onDay(selected);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p>Which car is out when. Tap a day for the details.</p>
        </div>
      </div>

      <div className="card">
        <div className="cal-toolbar">
          <div className="cal-title">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</div>
          <div className="toolbar">
            <button className="btn btn-ghost btn-sm" onClick={goToday}>Today</button>
            <button className="icon-btn" onClick={() => move(-1)} aria-label="Previous month"><Icon name="chevL" size={16}/></button>
            <button className="icon-btn" onClick={() => move(1)} aria-label="Next month"><Icon name="chevR" size={16}/></button>
          </div>
        </div>
        <div className="cal">
          {DAYS.map(d => <div key={d} className="cal-h">{d}</div>)}
          {cells.map(c => {
            const list = onDay(c.date);
            const cls = ['cal-cell', !c.inMonth && 'out', sameDay(c.date, new Date()) && 'today', sameDay(c.date, selected) && 'sel'].filter(Boolean).join(' ');
            return (
              <div key={c.key} className={cls} onClick={() => setSelected(c.date)}>
                <div className="cal-d">{c.date.getDate()}</div>
                {list.slice(0, 3).map(b => (
                  <div key={b.id} className={`ev ev-${tripState(b)}`} title={`${b.bookerName} · ${b.vehicleName}`}>{b.vehiclePlate}</div>
                ))}
                {list.length > 3 && <div className="ev-more">+{list.length - 3} more</div>}
              </div>
            );
          })}
        </div>
        <div className="mcal-legend" style={{ marginTop: 14 }}>
          <span><i className="sw" style={{ background: 'var(--accent-soft)', boxShadow: 'inset 0 0 0 1px var(--accent)' }}/>Booked</span>
          <span><i className="sw" style={{ background: 'var(--blue-soft)', boxShadow: 'inset 0 0 0 1px var(--blue)' }}/>In use</span>
          <span><i className="sw" style={{ background: 'var(--slate-soft)', boxShadow: 'inset 0 0 0 1px var(--border-strong)' }}/>Returned</span>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-head">
          <div className="card-title">{selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <span className="muted" style={{ fontSize: 13.5 }}>{dayList.length} booking{dayList.length === 1 ? '' : 's'}</span>
        </div>
        {dayList.length === 0 ? <div className="empty">No bookings on this day.</div> : (
          <table className="tbl tbl-stack">
            <thead><tr><th>Driver</th><th>Vehicle</th><th>When</th><th>Destination</th><th>Status</th></tr></thead>
            <tbody>
              {dayList.map(b => (
                <tr key={b.id}>
                  <td className="lead"><b>{b.bookerName}</b>{b.department && <div className="sub">{b.department}</div>}</td>
                  <td data-label="Vehicle"><Plate>{b.vehiclePlate}</Plate></td>
                  <td data-label="When" className="num">{fmtRange(b.startTime, b.endTime)}</td>
                  <td data-label="Destination">{b.destination}</td>
                  <td data-label="Status"><StatusPill state={tripState(b)}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
