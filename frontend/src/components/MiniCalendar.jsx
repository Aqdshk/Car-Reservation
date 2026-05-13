import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dayHeaders = ['M','T','W','T','F','S','S'];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const sameDay = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export default function MiniCalendar({ vehicleId, onRangeSelect, selectedStart, selectedEnd }) {
  const [busy, setBusy] = useState([]);
  const [cursor, setCursor] = useState(new Date());
  const [pickStart, setPickStart] = useState(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!vehicleId) return;
    api.get(`/reservations/busy/${vehicleId}`).then(r => setBusy(r.data));
    setPickStart(null); setHover(null);
  }, [vehicleId]);

  // Sync local picking when parent clears
  useEffect(() => {
    if (!selectedStart && !selectedEnd) setPickStart(null);
  }, [selectedStart, selectedEnd]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstWeekday = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((firstWeekday + last.getDate()) / 7) * 7;
    return Array.from({length: totalCells}, (_, i) => {
      const dayNum = i - firstWeekday + 1;
      const date = new Date(year, month, dayNum);
      return { date, inMonth: date.getMonth() === month, key: i };
    });
  }, [cursor]);

  const statusOnDay = (date) => {
    const ds = startOfDay(date);
    const matched = busy.filter(b => {
      const s = startOfDay(new Date(b.startTime));
      const e = startOfDay(new Date(b.endTime));
      return ds >= s && ds <= e;
    });
    if (matched.some(m => m.status === 'Approved')) return 'approved';
    if (matched.some(m => m.status === 'Pending')) return 'pending';
    return null;
  };

  const isPast = (date) => startOfDay(date) < startOfDay(new Date());

  const inRange = (date, a, b) => {
    if (!a || !b) return false;
    const d = startOfDay(date).getTime();
    const lo = Math.min(startOfDay(a).getTime(), startOfDay(b).getTime());
    const hi = Math.max(startOfDay(a).getTime(), startOfDay(b).getTime());
    return d >= lo && d <= hi;
  };

  const handleClick = (date) => {
    if (isPast(date) || statusOnDay(date) === 'approved') return;

    if (!pickStart) {
      // First click — pick start
      setPickStart(date);
      onRangeSelect?.(date, null);
    } else {
      // Second click — pick end (or reset if before start)
      if (startOfDay(date) < startOfDay(pickStart)) {
        // Clicked earlier date — restart from there
        setPickStart(date);
        onRangeSelect?.(date, null);
      } else {
        onRangeSelect?.(pickStart, date);
        setPickStart(null);
      }
    }
  };

  const prev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const next = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  const today = new Date();
  const finalStart = pickStart || selectedStart;
  const finalEnd = pickStart ? (hover || null) : selectedEnd;

  return (
    <div className="mini-cal">
      <div className="mini-cal-head">
        <button type="button" className="mini-cal-nav" onClick={prev}>‹</button>
        <span className="mini-cal-title">{monthNames[cursor.getMonth()]} {cursor.getFullYear()}</span>
        <button type="button" className="mini-cal-nav" onClick={next}>›</button>
      </div>
      <div className="mini-cal-grid mini-cal-headers">
        {dayHeaders.map((d,i) => <div key={i} className="mini-cal-h">{d}</div>)}
      </div>
      <div className="mini-cal-grid">
        {cells.map(c => {
          const st = statusOnDay(c.date);
          const past = isPast(c.date);
          const blocked = st === 'approved' || past;
          const isToday = sameDay(c.date, today);
          const isStart = finalStart && sameDay(c.date, finalStart);
          const isEnd = finalEnd && sameDay(c.date, finalEnd);
          const isMid = inRange(c.date, finalStart, finalEnd) && !isStart && !isEnd;
          return (
            <div key={c.key}
              className={`mini-cal-cell ${c.inMonth?'':'out'} ${isToday?'today':''} ${st?`busy-${st}`:''} ${blocked?'blocked':''} ${isStart?'sel-start':''} ${isEnd?'sel-end':''} ${isMid?'sel-mid':''}`}
              onClick={() => c.inMonth && handleClick(c.date)}
              onMouseEnter={() => pickStart && setHover(c.date)}
              onMouseLeave={() => setHover(null)}
              title={blocked ? (past ? 'Past date' : 'Already booked') : fmt(c.date)}>
              {c.date.getDate()}
            </div>
          );
        })}
      </div>
      <div className="mini-cal-hint mono">
        {!finalStart && '› Click a date to start'}
        {finalStart && !finalEnd && pickStart && '› Click end date'}
        {finalStart && finalEnd && '✓ Click again to change'}
      </div>
      <div className="mini-cal-legend">
        <span><i className="dot dot-free"></i>Free</span>
        <span><i className="dot dot-pending"></i>Pending</span>
        <span><i className="dot dot-approved"></i>Booked</span>
        <span><i className="dot dot-selected"></i>Selected</span>
      </div>
    </div>
  );
}
